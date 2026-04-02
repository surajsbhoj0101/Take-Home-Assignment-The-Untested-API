const supertest = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');
const request = supertest(app);

const seedTasks = (count) => {
    const taskIds = [];
    for (let i = 0; i < count; i++) {
        const task = taskService.create({ title: `Task ${i + 1}` });
        taskIds.push(task.id);
    }
    return taskIds;
};

describe('Task API', () => {
    beforeEach(() => {
        taskService._reset();
    });

    describe('GET /stats', () => {
        it('it should return correct stats', async () => {
            taskService.create({ title: 'Task 1', status: 'todo', dueDate: '2020-01-01T00:00:00Z' });
            taskService.create({ title: 'Task 2', status: 'in_progress', dueDate: '2020-01-01T00:00:00Z' });
            taskService.create({ title: 'Task 3', status: 'done', dueDate: '2020-01-01T00:00:00Z' });

            const res = await request.get('/tasks/stats');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 2 });
        });
    });

    describe('GET /tasks', () => {
        it('it should return an empty array when no tasks exist', async () => {
            const res = await request.get('/tasks');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual([]);
        })

        it('it should return all tasks', async () => {
            seedTasks(2);

            const res = await request.get('/tasks');
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
            expect(res.body).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ title: 'Task 1' }),
                    expect.objectContaining({ title: 'Task 2' }),
                ])
            );
        });

        it('it should filter tasks by status', async () => {
            const task1 = taskService.create({ title: 'Task 1', status: 'in_progress' });
            const task2 = taskService.create({ title: 'Task 2', status: 'done' });

            const res = await request.get('/tasks').query({ status: 'in_progress' });
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toEqual(1);
            expect(res.body).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ id: task1.id, title: 'Task 1', status: 'in_progress' }),
                ])
            );
            expect(res.body).not.toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ id: task2.id, title: 'Task 2', status: 'done' }),
                ])
            );
        });

        // bug fix for pagination - was returning 9 items instead of 10 when page=1 and limit=10
        it('it should paginate tasks', async () => {
            seedTasks(15);
            const res = await request.get('/tasks').query({ page: 1, limit: 10 });
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toBe(10);
        });

        it('it should return all tasks when no pagination params are provided', async () => {
            seedTasks(15);
            const res = await request.get('/tasks');
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toBe(15);
        });
    });

    describe('POST /tasks', () => {
        it('it should create a new task', async () => {
            const res = await request.post('/tasks').send({ title: 'Test Task', description: 'This is a test task', status: 'todo', priority: 'medium', dueDate: '2024-12-31T23:59:59Z' });
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.title).toBe('Test Task');
        });

        it('it should return 400 if title is missing', async () => {
            const res = await request.post('/tasks').send({});
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
        });

        it('it should return 400 if status is invalid', async () => {
            const res = await request.post('/tasks').send({ title: 'Test Task', status: 'invalid' });
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
        });

        it('it should return 400 if priority is invalid', async () => {
            const res = await request.post('/tasks').send({ title: 'Test Task', priority: 'invalid' });
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
        });

        it('it should return 400 if dueDate is invalid', async () => {
            const res = await request.post('/tasks').send({ title: 'Test Task', dueDate: 'invalid' });
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
        });


    });

    describe('PUT /tasks/:id', () => {
        it('it should update an existing task', async () => {
            const task = taskService.create({ title: "Fix the code", description: "Fix the bug in the code", status: "in_progress", priority: "high", dueDate: "2024-12-31T23:59:59Z" });


            const res = await request.put('/tasks/' + task.id).send(
                {
                    title: "Fixing bug"
                }
            );

            expect(res.body.title).toBe('Fixing bug')
        });

        it('it should return 404 if task to update is not found', async () => {
            const res = await request.put('/tasks/nonexistent-id').send({ title: 'Updated Title' });
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('error');
        });

        it('it should return 400 if status is invalid', async () => {
            const task = taskService.create({ title: "This is task1" });
            const res = await request.put('/tasks/' + task.id).send({ status: 'invalid' });
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
        });

        it('it should return 400 if priority is invalid', async () => {
            const task = taskService.create({ title: "code in morning" });
            const res = await request.put('/tasks/' + task.id).send({ priority: 'invalid' });
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');   
        });

        it('it should return 400 if dueDate is invalid', async () => {
            const task = taskService.create({ title: "Fix the bug" });
            const res = await request.put('/tasks/' + task.id).send({ dueDate: 'invalid' });
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('DELETE /tasks/:id', () => {
        it('it should delete an existing task', async () => {
            const seedTaskIds = seedTasks(10);
            const task1 = seedTaskIds[0];

            const res = await request.delete('/tasks/' + task1);
            expect(res.statusCode).toEqual(204);

            const getRes = await request.get('/tasks');
            const taskIds = getRes.body.map(t => t.id);
            expect(taskIds).not.toContain(task1);
            expect(taskIds.length).toEqual(9);
            expect(taskIds.sort()).toEqual(seedTaskIds.slice(1).sort());
        });

        it('it should return 404 if task to delete is not found', async () => {
            const res = await request.delete('/tasks/nonexistent-id');
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('PATCH /tasks/:id/complete', () => {
        //bug fix - was not setting priority to medium when completing a task, now fixed in taskService.completeTask
        it('it should mark a task as completed', async () => {
            const task = taskService.create({ title: 'Complete me', description: 'This task needs to be completed', status: 'in_progress', priority: 'high', dueDate: '2024-12-31T23:59:59Z' });

            const res = await request.patch('/tasks/' + task.id + '/complete');
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toBe('done');
            expect(res.body.priority).toBe('high');
            expect(res.body).toHaveProperty('completedAt');
        });

        it('it should return 404 if task to complete is not found', async () => {
            const res = await request.patch('/tasks/nonexistent-id/complete');
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('PATCH /tasks/:id/assign', () => {
        it('it should assign a task to a user', async () => {
            const task = taskService.create({ title: 'Assign me' });

            const res = await request.patch('/tasks/' + task.id + '/assign').send({ assignee: 'Suraj' });
            expect(res.statusCode).toEqual(200);
            expect(res.body.assignee).toBe('Suraj');
        });

        it('it should return 400 if assignee is missing or empty', async () => {
            const task = taskService.create({ title: 'Assign me' });

            const res = await request.patch('/tasks/' + task.id + '/assign').send({ assignee: '   ' });
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
        });

        it('it should return 404 if task to assign is not found', async () => {
            const res = await request.patch('/tasks/nonexistent-id/assign').send({ assignee: 'Suraj' });
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('error');
        });

        it('it should return 409 if task is already assigned', async () => {
            const task = taskService.create({ title: 'Already assigned', assignee: 'Suraj' });

            const res = await request.patch('/tasks/' + task.id + '/assign').send({ assignee: 'Raj' });
            expect(res.statusCode).toEqual(409);
            expect(res.body).toHaveProperty('error');
        });
    });


});
