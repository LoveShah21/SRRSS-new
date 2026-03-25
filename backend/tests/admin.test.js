require('./setup');
const { request, createUser } = require('./helpers');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'test';

describe('Admin Routes', () => {
  let adminToken, candidateToken, candidateId;

  beforeEach(async () => {
    // Create admin directly (can't self-register)
    const User = require('../src/models/User');
    const jwt = require('jsonwebtoken');

    const adminUser = await User.create({
      email: 'admin@admin.com',
      passwordHash: 'AdminPass1!',
      role: 'admin',
      profile: { firstName: 'Super', lastName: 'Admin' },
    });
    adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '15m' });

    // Create a candidate for testing
    const candidate = await createUser({ role: 'candidate', email: 'target@test.com' });
    candidateToken = candidate.token;
    candidateId = candidate.user._id;
  });

  // ── LIST USERS ────────────────────────────────────────
  describe('GET /api/admin/users', () => {
    it('should list all users as admin', async () => {
      const res = await request
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThanOrEqual(2); // admin + candidate
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter by role', async () => {
      const res = await request
        .get('/api/admin/users?role=candidate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.every((u) => u.role === 'candidate')).toBe(true);
    });

    it('should deny access to non-admin', async () => {
      const res = await request
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(403);
    });

    it('should deny unauthenticated access', async () => {
      const res = await request.get('/api/admin/users');
      expect(res.status).toBe(401);
    });
  });

  // ── UPDATE ROLE ───────────────────────────────────────
  describe('PATCH /api/admin/users/:id/role', () => {
    it('should update user role', async () => {
      const res = await request
        .patch(`/api/admin/users/${candidateId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'recruiter' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('recruiter');
    });

    it('should reject invalid role', async () => {
      const res = await request
        .patch(`/api/admin/users/${candidateId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'superuser' });

      expect(res.status).toBe(400);
    });

    it('should deny role change by non-admin', async () => {
      const res = await request
        .patch(`/api/admin/users/${candidateId}/role`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(403);
    });
  });

  // ── DELETE USER ───────────────────────────────────────
  describe('DELETE /api/admin/users/:id', () => {
    it('should delete a user', async () => {
      const res = await request
        .delete(`/api/admin/users/${candidateId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });

    it('should 404 for non-existent user', async () => {
      const res = await request
        .delete('/api/admin/users/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should deny deletion by non-admin', async () => {
      const res = await request
        .delete(`/api/admin/users/${candidateId}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ── ANALYTICS ─────────────────────────────────────────
  describe('GET /api/admin/analytics', () => {
    it('should return system analytics', async () => {
      const res = await request
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const { analytics } = res.body;
      expect(analytics.users).toBeDefined();
      expect(analytics.users.total).toBeGreaterThanOrEqual(2);
      expect(analytics.jobs).toBeDefined();
      expect(analytics.applications).toBeDefined();
    });

    it('should deny analytics to non-admin', async () => {
      const res = await request
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(403);
    });
  });
});
