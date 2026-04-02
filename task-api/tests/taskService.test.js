const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create and findById', () => {
    it('creates a task with default fields', () => {
      const created = taskService.create({ title: 'Write unit tests' });

      expect(created).toHaveProperty('id');
      expect(created.status).toBe('todo');
      expect(created.priority).toBe('medium');
      expect(created.assignee).toBeNull();
      expect(created.completedAt).toBeNull();

      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    it('keeps assignee when provided at creation', () => {
      const created = taskService.create({ title: 'Assigned task', assignee: 'Suraj' });

      expect(created.assignee).toBe('Suraj');
      expect(taskService.findById(created.id).assignee).toBe('Suraj');
    });
  });

  describe('getPaginated', () => {
    it('returns the first page correctly', () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const pageOne = taskService.getPaginated(1, 10);

      expect(pageOne).toHaveLength(10);
      expect(pageOne[0].title).toBe('Task 1');
      expect(pageOne[9].title).toBe('Task 10');
    });

    it('returns remaining items on page 2', () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const pageTwo = taskService.getPaginated(2, 10);

      expect(pageTwo).toHaveLength(5);
      expect(pageTwo[0].title).toBe('Task 11');
      expect(pageTwo[4].title).toBe('Task 15');
    });
  });

  describe('completeTask', () => {
    it('marks a task as done without changing priority', () => {
      const task = taskService.create({ title: 'Complete me', priority: 'high', status: 'in_progress' });

      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.priority).toBe('high');
      expect(completed.completedAt).toEqual(expect.any(String));
    });

    it('returns null for an unknown task id', () => {
      const completed = taskService.completeTask('missing-id');
      expect(completed).toBeNull();
    });
  });

  describe('assignTask', () => {
    it('assigns a task when no assignee exists', () => {
      const task = taskService.create({ title: 'Assign me' });

      const assigned = taskService.assignTask(task.id, 'Aman');

      expect(assigned.assignee).toBe('Aman');
      expect(taskService.findById(task.id).assignee).toBe('Aman');
    });

    it('returns null when task is already assigned', () => {
      const task = taskService.create({ title: 'Assigned', assignee: 'Suraj' });

      const reassigned = taskService.assignTask(task.id, 'Aman');

      expect(reassigned).toBeNull();
      expect(taskService.findById(task.id).assignee).toBe('Suraj');
    });

    it('returns null for a missing task id', () => {
      const assigned = taskService.assignTask('missing-id', 'Aman');
      expect(assigned).toBeNull();
    });
  });

  describe('remove and update', () => {
    it('remove returns false for unknown id', () => {
      expect(taskService.remove('missing-id')).toBe(false);
    });

    it('update returns null for unknown id', () => {
      expect(taskService.update('missing-id', { title: 'Updated' })).toBeNull();
    });
  });
});
