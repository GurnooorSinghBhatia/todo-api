'use strict';

const request = require('supertest');
const app = require('../../src/app');

beforeEach(() => {
  app.resetStore();
});

// ── Full CRUD workflow ────────────────────────────────────────────────────────
describe('Integration: Full Todo Lifecycle', () => {
  it('creates, reads, updates, and deletes a todo', async () => {
    // Create
    const create = await request(app)
      .post('/todos')
      .send({ title: 'Integration test todo' });
    expect(create.statusCode).toBe(201);
    const id = create.body.id;

    // Read
    const read = await request(app).get(`/todos/${id}`);
    expect(read.statusCode).toBe(200);
    expect(read.body.title).toBe('Integration test todo');

    // Update
    const update = await request(app)
      .put(`/todos/${id}`)
      .send({ completed: true });
    expect(update.statusCode).toBe(200);
    expect(update.body.completed).toBe(true);

    // List includes item
    const list = await request(app).get('/todos');
    expect(list.body.some((t) => t.id === id)).toBe(true);

    // Delete
    const del = await request(app).delete(`/todos/${id}`);
    expect(del.statusCode).toBe(204);

    // Confirm deleted
    const gone = await request(app).get(`/todos/${id}`);
    expect(gone.statusCode).toBe(404);
  });

  it('handles multiple todos independently', async () => {
    const a = await request(app).post('/todos').send({ title: 'Task A' });
    const b = await request(app).post('/todos').send({ title: 'Task B' });
    const c = await request(app).post('/todos').send({ title: 'Task C' });

    // Delete B
    await request(app).delete(`/todos/${b.body.id}`);

    const list = await request(app).get('/todos');
    const titles = list.body.map((t) => t.title);
    expect(titles).toContain('Task A');
    expect(titles).not.toContain('Task B');
    expect(titles).toContain('Task C');
  });
});

// ── Metrics endpoint ──────────────────────────────────────────────────────────
describe('Integration: Metrics Endpoint', () => {
  it('returns prometheus metrics', async () => {
    await request(app).get('/todos'); // trigger a request to count
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('http_requests_total');
  });
});
