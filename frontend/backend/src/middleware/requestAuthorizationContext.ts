import { AsyncLocalStorage } from 'async_hooks';

interface RequestAuthorizationContext {
  userId: string;
  tenantId: string;
  permissionCode: string;
}

const requestAuthorizationContext = new AsyncLocalStorage<RequestAuthorizationContext>();

export function runWithAuthorizationContext(
  userId: string,
  tenantId: string,
  callback: () => void
): void {
  requestAuthorizationContext.run({ userId, tenantId, permissionCode: '' }, callback);
}

export function setActivePermissionCode(permissionCode: string): void {
  const context = requestAuthorizationContext.getStore();
  if (context) context.permissionCode = permissionCode;
}

export function getRequestAuthorizationContext(): RequestAuthorizationContext | undefined {
  return requestAuthorizationContext.getStore();
}
