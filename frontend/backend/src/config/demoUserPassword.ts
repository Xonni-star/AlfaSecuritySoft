const CURRENT_DEMO_PASSWORD_ENV = 'ALFASECURITYSOFT_DEMO_USER_PASSWORD';
const LEGACY_DEMO_PASSWORD_ENV = 'SECOPS_DEMO_USER_PASSWORD';

export function getDemoUserPassword(environment: NodeJS.ProcessEnv = process.env): string | undefined {
  const currentPassword = environment[CURRENT_DEMO_PASSWORD_ENV];
  if (currentPassword !== undefined) return currentPassword;

  const legacyPassword = environment[LEGACY_DEMO_PASSWORD_ENV];
  if (legacyPassword !== undefined) {
    console.warn(
      `[DEPRECATED] ${LEGACY_DEMO_PASSWORD_ENV} is supported for compatibility; use ${CURRENT_DEMO_PASSWORD_ENV}.`
    );
  }
  return legacyPassword;
}
