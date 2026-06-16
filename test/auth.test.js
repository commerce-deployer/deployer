'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert');

process.env.ADMIN_USER = 'testadmin';
process.env.ADMIN_PASSWORD = 'testpass123';
process.env.SESSION_SECRET = 'test-secret';
delete process.env.API_KEY;

const auth = require('../server/auth');

describe('auth', () => {
  describe('verifyPassword', () => {
    it('returns true for correct username and password', () => {
      assert.strictEqual(auth.verifyPassword('testadmin', 'testpass123'), true);
    });
    it('returns false for wrong username', () => {
      assert.strictEqual(auth.verifyPassword('other', 'testpass123'), false);
    });
    it('returns false for wrong password', () => {
      assert.strictEqual(auth.verifyPassword('testadmin', 'wrong'), false);
    });
    it('returns false for empty password', () => {
      assert.strictEqual(auth.verifyPassword('testadmin', ''), false);
    });
  });

  describe('getSessionSecret', () => {
    it('returns SESSION_SECRET', () => {
      assert.strictEqual(auth.getSessionSecret(), 'test-secret');
    });
  });

  describe('isApiKeyValid', () => {
    it('returns false when API_KEY is not set', () => {
      assert.strictEqual(auth.isApiKeyValid('any'), false);
    });
    it('returns false for non-string', () => {
      assert.strictEqual(auth.isApiKeyValid(null), false);
      assert.strictEqual(auth.isApiKeyValid(123), false);
    });
  });

  describe('requireAuth', () => {
    it('calls next when session user matches ADMIN_USER', () => {
      const req = { session: { user: 'testadmin' } };
      let nextCalled = false;
      auth.requireAuth(req, {}, () => { nextCalled = true; });
      assert.strictEqual(nextCalled, true);
    });
    it('returns 401 JSON when no session and Accept application/json', () => {
      const req = { session: null, headers: { accept: 'application/json' } };
      const res = { statusCode: null, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
      auth.requireAuth(req, res, () => {});
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body?.error, 'Unauthorized');
    });
    it('redirects to /login.html when no session and no JSON accept', () => {
      const req = { session: null, headers: {} };
      const res = { redirectUrl: null, redirect(u) { this.redirectUrl = u; return this; } };
      auth.requireAuth(req, res, () => {});
      assert.strictEqual(res.redirectUrl, '/login.html');
    });
  });
});
