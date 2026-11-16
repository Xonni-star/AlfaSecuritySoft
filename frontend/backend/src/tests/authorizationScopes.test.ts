import { getPermissionSiteScope } from '../security/authorizationScopes';

describe('getPermissionSiteScope', () => {
  test('returns tenant-wide scope only for an explicit tenant permission', () => {
    expect(getPermissionSiteScope({
      permissions: ['planning:reports:read'],
      sitePermissions: [{ code: 'planning:reports:read', siteId: 'site-a' }]
    }, 'planning:reports:read')).toBeNull();
  });

  test('returns unique site IDs for matching grants and ignores unrelated grants', () => {
    expect(getPermissionSiteScope({
      permissions: [],
      sitePermissions: [
        { code: 'planning:reports:read', siteId: 'site-a' },
        { code: 'planning:reports:read', siteId: 'site-a' },
        { code: 'planning:reports:read', siteId: 'site-b' },
        { code: 'planning:read', siteId: 'site-c' }
      ]
    }, 'planning:reports:read')).toEqual(['site-a', 'site-b']);
  });

  test('returns an empty scope when no matching grant is present', () => {
    expect(getPermissionSiteScope({
      permissions: [],
      sitePermissions: [{ code: 'planning:read', siteId: 'site-a' }]
    }, 'planning:reports:read')).toEqual([]);
  });
});
