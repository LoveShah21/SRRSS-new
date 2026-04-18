require('./setup');
const { request, createUser } = require('./helpers');

// Set env vars for JWT
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.NODE_ENV = 'test';

describe('Auth Routes', () => {
  // ── REGISTER ──────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('should register a new candidate', async () => {
      const res = await request.post('/api/auth/register').send({
        email: 'alice@example.com',
        password: 'StrongPass1!',
        firstName: 'Alice',
        lastName: 'Smith',
        role: 'candidate',
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/registration successful/i);
      expect(res.body.token).toBeUndefined();
      expect(res.body.refreshToken).toBeUndefined();
      expect(res.body.user.email).toBe('alice@example.com');
      expect(res.body.user.role).toBe('candidate');
      expect(res.body.requiresEmailVerification).toBe(true);
    });

    it('should register a recruiter', async () => {
      const res = await request.post('/api/auth/register').send({
        email: 'recruiter@company.com',
        password: 'StrongPass1!',
        firstName: 'Bob',
        lastName: 'Jones',
        role: 'recruiter',
      });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('recruiter');
    });

    it('should reject duplicate email', async () => {
      await request.post('/api/auth/register').send({
        email: 'dupe@example.com',
        password: 'StrongPass1!',
        firstName: 'Dupe',
        lastName: 'User',
      });

      const res = await request.post('/api/auth/register').send({
        email: 'dupe@example.com',
        password: 'StrongPass1!',
        firstName: 'Dupe',
        lastName: 'User',
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already registered/i);
    });

    it('should reject missing required fields', async () => {
      const res = await request.post('/api/auth/register').send({
        email: 'incomplete@example.com',
      });

      expect(res.status).toBe(400);
    });

    it('should default to candidate role for invalid roles', async () => {
      const res = await request.post('/api/auth/register').send({
        email: 'norole@example.com',
        password: 'StrongPass1!',
        firstName: 'No',
        lastName: 'Role',
        role: 'admin', // admin self-registration not allowed
      });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('candidate');
    });
  });

  // ── LOGIN ─────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request.post('/api/auth/register').send({
        email: 'login@example.com',
        password: 'StrongPass1!',
        firstName: 'Login',
        lastName: 'User',
      });

      const User = require('../src/models/User');
      const user = await User.findOne({ email: 'login@example.com' });
      await request.get(`/api/auth/verify/${user.emailVerificationToken}`);
    });

    it('should login with valid credentials', async () => {
      const res = await request.post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'StrongPass1!',
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful.');
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const res = await request.post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it('should reject non-existent email', async () => {
      const res = await request.post('/api/auth/login').send({
        email: 'ghost@example.com',
        password: 'StrongPass1!',
      });

      expect(res.status).toBe(401);
    });

    it('should reject missing fields', async () => {
      const res = await request.post('/api/auth/login').send({});
      expect(res.status).toBe(400);
    });

    it('should reject login for unverified email', async () => {
      await request.post('/api/auth/register').send({
        email: 'unverified-login@example.com',
        password: 'StrongPass1!',
        firstName: 'Unverified',
        lastName: 'User',
      });

      const res = await request.post('/api/auth/login').send({
        email: 'unverified-login@example.com',
        password: 'StrongPass1!',
      });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/verify your email/i);
    });
  });

  // ── REFRESH TOKEN ─────────────────────────────────────
  describe('POST /api/auth/refresh', () => {
    it('should issue new tokens with valid refresh token', async () => {
      const { refreshToken } = await createUser();

      const res = await request.post('/api/auth/refresh').send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      // New refresh token should differ from old
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });

    it('should reject missing refresh token', async () => {
      const res = await request.post('/api/auth/refresh').send({});
      expect(res.status).toBe(400);
    });

    it('should reject invalid refresh token', async () => {
      const res = await request
        .post('/api/auth/refresh')
        .send({ refreshToken: 'totally-fake-token' });
      expect(res.status).toBe(401);
    });
  });

  // ── LOGOUT ────────────────────────────────────────────
  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const { token } = await createUser();

      const res = await request
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/logged out/i);
    });

    it('should reject unauthenticated logout', async () => {
      const res = await request.post('/api/auth/logout');
      expect(res.status).toBe(401);
    });
  });

  // ── GET ME ────────────────────────────────────────────
  describe('GET /api/auth/me', () => {
    it('should return current user', async () => {
      const { token, email } = await createUser();

      const res = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(email);
    });

    it('should reject request without token', async () => {
      const res = await request.get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });
  });

  describe('Email verification lifecycle', () => {
    it('should resend verification and rotate token for unverified user', async () => {
      const email = `verify-${Date.now()}@example.com`;
      await request.post('/api/auth/register').send({
        email,
        password: 'StrongPass1!',
        firstName: 'Verify',
        lastName: 'Flow',
      });

      const User = require('../src/models/User');
      const userBefore = await User.findOne({ email });
      const previousToken = userBefore.emailVerificationToken;

      const resendRes = await request.post('/api/auth/resend-verification').send({ email });

      expect(resendRes.status).toBe(200);
      expect(resendRes.body.message).toMatch(/if that email exists/i);

      const userAfter = await User.findOne({ email });
      expect(userAfter.emailVerificationToken).toBeDefined();
      expect(userAfter.emailVerificationToken).not.toBe(previousToken);
      expect(userAfter.emailVerificationExpires).toBeDefined();
    });

    it('should verify email token and allow login afterwards', async () => {
      const email = `verify-login-${Date.now()}@example.com`;
      await request.post('/api/auth/register').send({
        email,
        password: 'StrongPass1!',
        firstName: 'Verify',
        lastName: 'Login',
      });

      const User = require('../src/models/User');
      const userBefore = await User.findOne({ email });
      const verifyRes = await request.get(`/api/auth/verify/${userBefore.emailVerificationToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.message).toMatch(/email verified successfully/i);

      const loginRes = await request.post('/api/auth/login').send({
        email,
        password: 'StrongPass1!',
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
    });
  });
});
