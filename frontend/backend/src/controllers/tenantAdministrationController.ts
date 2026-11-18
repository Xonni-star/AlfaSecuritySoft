import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { withSystemTransaction } from '../config/database';

const uuid = z.string().uuid();
const tenantFields = z.object({
  name: z.string().trim().min(1).max(200),
  subdomain: z.string().trim().toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9.-]{0,250}[a-z0-9])?$/, 'Ungültiges Subdomain-Format.'),
  taxNumber: z.string().trim().min(1).max(50),
  licenseTier: z.enum(['ENTERPRISE', 'PROFESSIONAL', 'STANDARD']),
  bwrRegisterId: z.string().trim().min(1).max(50),
  din77200Certified: z.boolean()
}).strict();
const tenantPatch = tenantFields.partial().extend({
  isActive: z.boolean().optional()
}).strict().refine(fields => Object.keys(fields).length > 0, 'Mindestens ein Feld muss geändert werden.');

type TenantDbClient = {
  query: (sql: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

const tenantColumns = `
  id,name,subdomain,tax_number,license_tier,bwr_register_id,
  din77200_certified,is_active,created_at,updated_at
`;

function isSystemAdmin(req: Request): boolean {
  return req.user?.isSuperAdmin === true;
}

function deny(res: Response): void {
  res.status(403).json({
    success: false,
    message: 'Zugriff verweigert: Erforderlich ist ein Systemadministratorkonto.'
  });
}

async function writeTenantAudit(
  db: TenantDbClient,
  req: Request,
  tenantId: string,
  action: 'TENANT_CREATED' | 'TENANT_UPDATED',
  details: Record<string, unknown>
): Promise<void> {
  const user = req.user!;
  await db.query(
    `SELECT set_config('app.current_tenant',$1,true),
            set_config('app.current_user_id',$2,true)`,
    [tenantId, user.userId]
  );
  await db.query(
    `INSERT INTO audit_logs (tenant_id,user_email,role,action_type,severity,target_entity,details,ip_address)
     VALUES ($1,$2,$3,$4,'INFO',$5,$6,$7)`,
    [
      tenantId,
      user.email,
      user.role.slice(0, 50),
      action,
      `tenant:${tenantId}`,
      JSON.stringify(details),
      req.ip || 'unknown'
    ]
  );
}

function respondUniqueConflict(error: unknown, res: Response): boolean {
  if ((error as { code?: string })?.code !== '23505') return false;
  res.status(409).json({
    success: false,
    message: 'Subdomain oder Mandantenkennung ist bereits vergeben.'
  });
  return true;
}

export async function listTenants(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isSystemAdmin(req)) {
    deny(res);
    return;
  }
  try {
    const result = await withSystemTransaction(db =>
      db.query(`SELECT ${tenantColumns} FROM tenants ORDER BY name,id`)
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
}

export async function createTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isSystemAdmin(req)) {
    deny(res);
    return;
  }
  try {
    const body = tenantFields.parse(req.body);
    const tenant = await withSystemTransaction(async db => {
      const result = await db.query(
        `INSERT INTO tenants
          (name,subdomain,tax_number,license_tier,bwr_register_id,din77200_certified)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING ${tenantColumns}`,
        [
          body.name,
          body.subdomain,
          body.taxNumber,
          body.licenseTier,
          body.bwrRegisterId,
          body.din77200Certified
        ]
      );
      const created = result.rows[0];
      await writeTenantAudit(db, req, String(created.id), 'TENANT_CREATED', {
        fields: Object.keys(body)
      });
      return created;
    });
    res.status(201).json({ success: true, data: tenant });
  } catch (error) {
    if (respondUniqueConflict(error, res)) return;
    next(error);
  }
}

export async function updateTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isSystemAdmin(req)) {
    deny(res);
    return;
  }
  try {
    const tenantId = uuid.parse(req.params.id);
    const patch = tenantPatch.parse(req.body);
    const tenant = await withSystemTransaction(async db => {
      const current = await db.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE', [tenantId]);
      if (!current.rows.length) return null;

      const columns: Record<string, string> = {
        name: 'name',
        subdomain: 'subdomain',
        taxNumber: 'tax_number',
        licenseTier: 'license_tier',
        bwrRegisterId: 'bwr_register_id',
        din77200Certified: 'din77200_certified',
        isActive: 'is_active'
      };
      const entries = Object.entries(patch);
      const assignments = entries.map(([field], index) => `${columns[field]}=$${index + 1}`);
      const values = entries.map(([, value]) => value);
      values.push(tenantId);
      const result = await db.query(
        `UPDATE tenants SET ${assignments.join(',')},updated_at=CURRENT_TIMESTAMP
          WHERE id=$${values.length} RETURNING ${tenantColumns}`,
        values
      );
      await writeTenantAudit(db, req, tenantId, 'TENANT_UPDATED', {
        changedFields: entries.map(([field]) => field)
      });
      return result.rows[0];
    });
    if (!tenant) {
      res.status(404).json({ success: false, message: 'Mandant nicht gefunden.' });
      return;
    }
    res.json({ success: true, data: tenant });
  } catch (error) {
    if (respondUniqueConflict(error, res)) return;
    next(error);
  }
}
