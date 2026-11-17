import { getDemoUserPassword } from '../config/demoUserPassword';

describe('demo seed password environment migration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('prefers the AlfaSecuritySoft variable when both names are set', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getDemoUserPassword({
      ALFASECURITYSOFT_DEMO_USER_PASSWORD: 'new-test-password',
      SECOPS_DEMO_USER_PASSWORD: 'legacy-test-password'
    })).toBe('new-test-password');
    expect(warn).not.toHaveBeenCalled();
  });

  test('accepts the old variable during the compatibility period and warns', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getDemoUserPassword({
      SECOPS_DEMO_USER_PASSWORD: 'legacy-test-password'
    })).toBe('legacy-test-password');
    expect(warn).toHaveBeenCalledWith(
      '[DEPRECATED] SECOPS_DEMO_USER_PASSWORD is supported for compatibility; use ALFASECURITYSOFT_DEMO_USER_PASSWORD.'
    );
  });

  test('returns undefined when neither variable is set', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getDemoUserPassword({})).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });
});
