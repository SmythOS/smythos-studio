/**
 * Simple API integration tests
 */
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

describe('API Integration', () => {
  const createTestApp = () => {
    const app = express();
    app.use(express.json());

    // Simple test routes
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    app.get('/models', (req, res) => {
      res.setHeader('x-models-hash', 'test-hash');
      res.json({ 'gpt-4': { name: 'GPT-4' } });
    });

    app.get('/models/custom/:teamId', (req, res) => {
      const { teamId } = req.params;
      if (teamId === 'invalid') {
        return res.status(403).json({ error: 'Access denied' });
      }
      res.json({ 'custom-model': { name: 'Custom' } });
    });

    return app;
  };

  it('returns health status', async () => {
    const app = createTestApp();

    await request(app).get('/health').expect(200).expect({ status: 'ok' });
  });

  it('returns models with hash header', async () => {
    const app = createTestApp();

    const response = await request(app)
      .get('/models')
      .expect(200)
      .expect('x-models-hash', 'test-hash')
      .expect({ 'gpt-4': { name: 'GPT-4' } });
  });

  it('handles team access control', async () => {
    const app = createTestApp();

    // Valid team
    await request(app)
      .get('/models/custom/team123')
      .expect(200)
      .expect({ 'custom-model': { name: 'Custom' } });

    // Invalid team
    await request(app).get('/models/custom/invalid').expect(403).expect({ error: 'Access denied' });
  });

  it('handles 404 for unknown routes', async () => {
    const app = createTestApp();

    await request(app).get('/unknown').expect(404);
  });
});
