import request from 'supertest';
import { app } from '../app';

type HttpMethod = 'get' | 'post' | 'patch' | 'delete' | 'put';
interface RouteLayer {
  route?: { path: string; methods: Partial<Record<HttpMethod, boolean>> };
}
const publicRoutes = new Set([
  'get /api/v1/health',
  'post /api/v1/auth/login',
  'post /api/v1/auth/password-reset/complete'
]);
const protectedRoutes = (app._router.stack as RouteLayer[]).flatMap(({ route }) =>
  route ? (Object.keys(route.methods) as HttpMethod[])
    .filter(method => !publicRoutes.has(`${method} ${route.path}`))
    .map(method => ({ method, path: route.path })) : []
);

describe('Cookie session security boundaries', () => {
  test.each(protectedRoutes)('$method $path rejects an absent session before entering the handler', async ({ method, path }) => {
    const resolvedPath = path.replace(/:[A-Za-z0-9_]+/g, '11111111-1111-4111-8111-111111111111');
    const response = await request(app)[method](resolvedPath).set('Origin', 'http://localhost:3000').send({});
    expect(response.status).toBe(401);
  });

  test('mutation without CSRF token is rejected', async () => {
    const response = await request(app).post('/api/v1/auth/logout').set('Origin', 'http://localhost:3000').set('Cookie', 'secops_session=dummy-session').send({});
    expect(response.status).toBe(403);
    expect(response.body.message).toContain('CSRF');
  });

  test('mutation with mismatched CSRF token is rejected', async () => {
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', 'secops_session=dummy-session; secops_csrf=valid-token')
      .set('X-CSRF-Token', 'invalid-token')
      .send({});
    expect(response.status).toBe(403);
  });

  test('foreign origin is rejected before login processing', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://attacker.invalid')
      .send({ email: 'nobody@example.invalid', password: 'correct horse battery staple' });
    expect(response.status).toBe(403);
  });

  test('legacy bearer token alone is not accepted as a session', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer legacy-token');
    expect(response.status).toBe(401);
  });
});
