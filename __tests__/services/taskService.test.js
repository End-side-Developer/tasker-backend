jest.mock('../../src/config/firebase', () => {
  const mockServerTimestamp = jest.fn(() => '__server_timestamp__');
  const mockTimestamp = {
    fromDate: jest.fn((date) => ({ __type: 'timestamp', iso: date.toISOString() })),
  };

  const firestoreFn = jest.fn(() => ({}));
  firestoreFn.FieldValue = { serverTimestamp: mockServerTimestamp };
  firestoreFn.Timestamp = mockTimestamp;

  return {
    admin: {
      firestore: firestoreFn,
    },
  };
});

const taskService = require('../../src/services/taskService');

const buildMockDb = () => {
  const docRef = {
    id: 'mock-task-id',
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ status: 'pending' }),
    }),
  };

  const tasksCollection = {
    doc: jest.fn(() => docRef),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ forEach: jest.fn(), docs: [] }),
  };

  const db = {
    collection: jest.fn((name) => {
      if (name === 'tasks') {
        return tasksCollection;
      }
      return {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: [] }),
      };
    }),
    __docRef: docRef,
    __tasksCollection: tasksCollection,
  };

  return db;
};

describe('taskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    taskService._db = buildMockDb();
  });

  describe('createTask', () => {
    it('normalizes incoming fields to match Flutter schema', async () => {
      const result = await taskService.createTask({
        title: 'Backend Test',
        description: 'description',
        projectId: 'project-123',
        dueDate: '2025-02-01T10:00:00.000Z',
        priority: 'HIGH',
        tags: [' design ', '', 'QA'],
        reminderEnabled: false,
        recurrencePattern: 'weekly',
        recurrenceInterval: 5,
        recurrenceEndDate: '2025-03-01T10:00:00.000Z',
        assignees: ['userA', ' ', null],
        createdBy: 'creator-id',
        status: 'in_progress',
      });

      const { __docRef } = taskService._db;
      expect(__docRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high',
          status: 'inProgress',
          tags: ['design', 'QA'],
          reminderEnabled: false,
          recurrencePattern: 'weekly',
          recurrenceInterval: 5,
          assignees: ['userA'],
          dueDate: expect.objectContaining({ __type: 'timestamp' }),
          recurrenceEndDate: expect.objectContaining({ __type: 'timestamp' }),
        }),
      );

      expect(result).toMatchObject({
        id: 'mock-task-id',
        priority: 'high',
        status: 'inProgress',
        tags: ['design', 'QA'],
        reminderEnabled: false,
        recurrencePattern: 'weekly',
      });
    });
  });

  describe('updateTask', () => {
    it('sanitizes updates before persisting', async () => {
      const taskId = 'mock-task-id';
      await taskService.updateTask(taskId, {
        status: 'in_progress',
        priority: 'URGENT',
        tags: ['  focus ', ''],
        assignees: ['member-1', ' '],
        reminderEnabled: 'false',
        dueDate: '2025-04-01T08:00:00.000Z',
      });

      const { __docRef } = taskService._db;
      expect(__docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'inProgress',
          priority: 'urgent',
          tags: ['focus'],
          assignees: ['member-1'],
          reminderEnabled: false,
          dueDate: expect.objectContaining({ __type: 'timestamp' }),
          updatedAt: '__server_timestamp__',
        }),
      );
    });
  });
});
