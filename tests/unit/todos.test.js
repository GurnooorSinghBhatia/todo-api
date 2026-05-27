'use strict';

const request = require('supertest');
const app = require('../../src/app');

beforeEach(() => {
  app.resetStore();
});

// ── Health Check ──────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });
});

// ── GET /todos ────────────────────────────────────────────────────────────────
describe('GET /todos', () => {
  it('returns empty array when no todos exist', async () => {
    const res = await request(app).get('/todos');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all todos', async () => {
    await request(app).post('/todos').send({ title: 'First' });
    await request(app).post('/todos').send({ title: 'Second' });
    const res = await request(app).get('/todos');
    expect(res.body).toHaveLength(2);
  });
});

// ── GET /todos/:id ────────────────────────────────────────────────────────────
describe('GET /todos/:id', () => {
  it('returns a todo by id', async () => {
    const create = await request(app).post('/todos').send({ title: 'Find me' });
    const res = await request(app).get(`/todos/${create.body.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Find me');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/todos/99999');
    expect(res.statusCode).toBe(404);
  });
});

// ── POST /todos ───────────────────────────────────────────────────────────────
describe('POST /todos', () => {
  it('creates a todo with title and default completed=false', async () => {
    const res = await request(app).post('/todos').send({ title: 'Buy milk' });
    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Buy milk');
    expect(res.body.completed).toBe(false);
    expect(res.body).toHaveProperty('id');
  });

  it('creates a todo with completed=true', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: 'Done task', completed: true });
    expect(res.statusCode).toBe(201);
    expect(res.body.completed).toBe(true);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/todos').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when title is empty string', async () => {
    const res = await request(app).post('/todos').send({ title: '   ' });
    expect(res.statusCode).toBe(400);
  });
});

// ── PUT /todos/:id ────────────────────────────────────────────────────────────
describe('PUT /todos/:id', () => {
  it('updates the title', async () => {
    const create = await request(app).post('/todos').send({ title: 'Old title' });
    const res = await request(app)
      .put(`/todos/${create.body.id}`)
      .send({ title: 'New title' });
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('New title');
  });

  it('marks todo as completed', async () => {
    const create = await request(app).post('/todos').send({ title: 'Do it' });
    const res = await request(app)
      .put(`/todos/${create.body.id}`)
      .send({ completed: true });
    expect(res.statusCode).toBe(200);
    expect(res.body.completed).toBe(true);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).put('/todos/99999').send({ title: 'Ghost' });
    expect(res.statusCode).toBe(404);
  });
});

// ── DELETE /todos/:id ─────────────────────────────────────────────────────────
describe('DELETE /todos/:id', () => {
  it('deletes a todo and returns 204', async () => {
    const create = await request(app).post('/todos').send({ title: 'Remove me' });
    const res = await request(app).delete(`/todos/${create.body.id}`);
    expect(res.statusCode).toBe(204);
  });

  it('returns 404 after deleting', async () => {
    const create = await request(app).post('/todos').send({ title: 'Gone' });
    await request(app).delete(`/todos/${create.body.id}`);
    const res = await request(app).get(`/todos/${create.body.id}`);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/todos/99999');
    expect(res.statusCode).toBe(404);
  });
});
