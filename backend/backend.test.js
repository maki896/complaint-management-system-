const request = require('supertest');
const app = require('./server');
const sequelize = require('./config/db');

describe('CMS Backend Endpoints Integration Tests', () => {
  
  // Close database connections after testing to prevent open handles
  afterAll(async () => {
    await sequelize.close();
  });

  describe('1. Public Access & Guest Tracking', () => {
    it('should return a 404 for a non-existent tracking reference', async () => {
      const res = await request(app)
        .get('/api/complaints/track/CMS-INVALID-REF');
      
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid reference number');
    });
  });

  describe('2. Secure Identity Gateway', () => {
    it('should fail authentication for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@oromia.gov.et',
          password: 'WrongPassword!!!'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should successfully authenticate seeded admin account and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@oromia.gov.et',
          password: 'AdminPassword123!'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.role).toEqual('admin');
    });
  });

  describe('3. Protected Route Security Barriers', () => {
    it('should reject complaint submission requests lacking a JWT', async () => {
      const res = await request(app)
        .post('/api/complaints/submit')
        .send({
          category: 'environmental',
          description: 'Industrial waste emissions',
          dateOfOccurrence: '2026-05-24',
          locationAddress: 'Adama'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
    });
  });
});
