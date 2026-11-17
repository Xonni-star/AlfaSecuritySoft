import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('AlfaSecuritySoft brand metadata and compatibility identifiers', () => {
  test('uses the exact product name for browser, PWA and package metadata', () => {
    const manifest = JSON.parse(read('../public/manifest.json')) as {
      name: string;
      short_name: string;
    };
    const frontendPackage = JSON.parse(read('../package.json')) as { name: string };
    const backendPackage = JSON.parse(read('../backend/package.json')) as { name: string };
    const rootPackage = JSON.parse(read('../../package.json')) as { name: string };
    const smokeStart = read('../../scripts/ci/smoke-start.mjs');
    const ciWorkflow = read('../../.github/workflows/ci.yml');
    const releaseWorkflow = read('../../.github/workflows/ci_cd.yml');
    const backendApp = read('../backend/src/app.ts');

    expect(read('../index.html')).toMatch(/<title>AlfaSecuritySoft<\/title>/);
    expect(manifest).toMatchObject({
      name: 'AlfaSecuritySoft',
      short_name: 'AlfaSecuritySoft'
    });
    expect(read('../metadata.json')).toContain('"name": "AlfaSecuritySoft"');
    expect(rootPackage.name).toBe('alfasecuritysoft-monorepo');
    expect(frontendPackage.name).toBe('alfasecuritysoft-frontend');
    expect(backendPackage.name).toBe('alfasecuritysoft-backend');
    expect(smokeStart).toMatch(/AlfaSecuritySoft Backend\\] Gestartet auf Port/);
    expect(ciWorkflow).toMatch(/^name: AlfaSecuritySoft CI$/m);
    expect(releaseWorkflow).toContain('workflows: ["AlfaSecuritySoft CI"]');
    expect(releaseWorkflow).toContain('name: alfasecuritysoft-release-');
    expect(backendApp).toContain("service: 'AlfaSecuritySoft Backend (Node.js/TypeScript)'");
    expect(read('../backend/src/server.ts')).toContain('[AlfaSecuritySoft Backend] Gestartet auf Port');
  });

  test('keeps installation and offline persistence namespaces stable', () => {
    expect(read('../deploy/docker-compose.production.yml')).toMatch(/^name: securityops$/m);
    expect(read('../services/indexedDbService.ts')).toContain("'SecurityOps2_OfflineVault'");
    expect(read('../backend/src/config/rateLimitRedis.ts')).toContain("'securityops:api-rate-limit:'");
    expect(read('../App.tsx')).toContain("'securityops:unauthorized'");
  });
});
