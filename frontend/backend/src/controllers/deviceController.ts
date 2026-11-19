import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { withTenantTransaction } from '../config/database';

/**
 * Geräteverwaltung (Device Lifecycle / Gerätewiderruf).
 *
 * - registerDevice bindet die aktuelle Sitzung an eine clientseitige Geräte-ID
 *   und legt das Gerät dauerhaft in der Mandanten-Deviceregistry an.
 * - revokeDevice widerruft ein Gerät und beendet alle zugehörigen Sitzungen.
 * - listDevices listet die Geräte des aktuellen Mandanten.
 *
 * Die Durchsetzung des Widerrufs erfolgt über das bestehende Sitzungsmodell:
 * Revozierte Sitzungen (user_sessions.revoked = true) werden von der
 * Authentifizierungs-Middleware bereits abgewiesen.
 */

const registerDeviceSchema = z.object({
  deviceId: z.string().min(4).max(128),
  deviceName: z.string().max(150).optional()
});

const revokeDeviceSchema = z.object({
  deviceId: z.string().min(4).max(128)
});

export async function registerDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const sessionHash = req.user!.sessionHash;
    const body = registerDeviceSchema.parse(req.body);

    const result = await withTenantTransaction(tenantId, async (client) => {
      const existing = await client.query<{ revoked_at: string | null }>(
        'SELECT revoked_at FROM devices WHERE tenant_id=$1 AND device_id=$2',
        [tenantId, body.deviceId]
      );
      if (existing.rows[0]?.revoked_at) {
        return { revoked: true as const };
      }

      await client.query(
        `INSERT INTO devices (tenant_id, user_id, device_id, device_name, last_seen_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (tenant_id, device_id)
         DO UPDATE SET user_id = $2,
                       device_name = COALESCE(EXCLUDED.device_name, devices.device_name),
                       last_seen_at = CURRENT_TIMESTAMP`,
        [tenantId, userId, body.deviceId, body.deviceName ?? null]
      );

      await client.query(
        'UPDATE user_sessions SET device_id=$1 WHERE token_hash=$2 AND tenant_id=$3',
        [body.deviceId, sessionHash, tenantId]
      );

      return { revoked: false as const };
    });

    if (result.revoked) {
      res.status(403).json({
        success: false,
        message: 'Dieses Gerät wurde widerrufen und kann nicht mehr registriert werden.'
      });
      return;
    }

    res.json({ success: true, message: 'Gerät erfolgreich registriert.' });
  } catch (error) {
    next(error);
  }
}

export async function revokeDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const body = revokeDeviceSchema.parse(req.body);

    await withTenantTransaction(tenantId, async (client) => {
      await client.query(
        `UPDATE devices
            SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
          WHERE tenant_id = $1 AND device_id = $2`,
        [tenantId, body.deviceId]
      );

      await client.query(
        'UPDATE user_sessions SET revoked=true WHERE tenant_id=$1 AND device_id=$2 AND revoked=false',
        [tenantId, body.deviceId]
      );
    });

    res.json({
      success: true,
      message: 'Gerät widerrufen; zugehörige Sitzungen wurden beendet.'
    });
  } catch (error) {
    next(error);
  }
}

export async function listDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;

    const rows = await withTenantTransaction(tenantId, async (client) => {
      const result = await client.query(
        `SELECT id, device_id, device_name, user_id, last_seen_at, revoked_at, created_at
           FROM devices
          WHERE tenant_id = $1
          ORDER BY created_at DESC`,
        [tenantId]
      );
      return result.rows;
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}
