import { CalendarService } from '../../../services/calendarService';
import { databaseService } from '../../../services/databaseService';

// Mock database service
jest.mock('../../../services/databaseService');

const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

describe('CalendarService', () => {
  let calendarService: CalendarService;

  beforeEach(() => {
    calendarService = CalendarService.getInstance();
    calendarService.clearEvents();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('initializes with empty events', () => {
      const stats = calendarService.getStatistics();
      expect(stats.totalEvents).toBe(0);
    });

    it('generates events from tasks and projects', async () => {
      mockDatabaseService.getTasks.mockResolvedValue({
        data: [
          {
            id: '1',
            title: 'Test Task',
            description: 'Test Description',
            dueDate: new Date().toISOString(),
            priority: 'high',
            status: 'todo',
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            projectId: 'project1',
            assigneeId: 'user1',
            estimatedHours: 8,
            actualHours: 0,
            tags: [],
            dependencies: []
          },
          // No dueDate: generateEventsFromTasks must skip this task entirely.
          {
            id: '2',
            title: 'No Due Date Task',
            description: 'Should be skipped',
            priority: 'low',
            status: 'todo',
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            projectId: 'project1',
            estimatedHours: 2,
            actualHours: 0,
            tags: [],
            dependencies: []
          },
          // Completed, with no assignee: covers the completed-status and
          // no-attendees branches of the task->event mapping.
          {
            id: '3',
            title: 'Completed Unassigned Task',
            description: 'Done, nobody assigned',
            dueDate: new Date().toISOString(),
            priority: 'medium',
            status: 'completed',
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            projectId: 'project1',
            estimatedHours: 4,
            actualHours: 4,
            tags: [],
            dependencies: []
          }
        ],
        total: 3,
        hasMore: false
      });

      mockDatabaseService.getProjects.mockResolvedValue({
        data: [
          {
            id: 'project1',
            name: 'Test Project',
            description: 'Test Description',
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            priority: 'medium',
            status: 'active',
            managerId: 'user1',
            teamIds: ['user1', 'user2'],
            color: '#3b82f6',
            progress: 0,
            budget: 0,
            spentBudget: 0
          },
          // Completed project: covers the completed-status branch of the
          // project->end-event mapping.
          {
            id: 'project2',
            name: 'Finished Project',
            description: 'Already done',
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            priority: 'low',
            status: 'completed',
            managerId: 'user1',
            teamIds: ['user1'],
            color: '#10b981',
            progress: 100,
            budget: 0,
            spentBudget: 0
          }
        ],
        total: 2,
        hasMore: false
      });

      mockDatabaseService.getUsers.mockResolvedValue({
        data: [
          {
            id: 'user1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'developer',
            department: 'Engineering',
            joinDate: new Date().toISOString(),
            isActive: true
          }
        ],
        total: 1,
        hasMore: false
      });

      await calendarService.initialize();

      const stats = calendarService.getStatistics();
      expect(stats.totalEvents).toBeGreaterThan(0);
      // Task #2 (no dueDate) must not have produced an event.
      expect(calendarService.getEventById('task_2')).toBeUndefined();
      expect(calendarService.getEventById('task_1')?.attendees).toEqual(['user1']);
      expect(calendarService.getEventById('task_3')?.status).toBe('completed');
      expect(calendarService.getEventById('task_3')?.attendees).toEqual([]);
      expect(calendarService.getEventById('project_end_project2')?.status).toBe('completed');
    });
  });

  describe('date-span edge case', () => {
    it('falls back to the start date when the span produces no keys (end before start)', () => {
      const start = new Date();
      const end = new Date(start);
      end.setDate(start.getDate() - 3); // end before start

      const event = calendarService.createEvent({
        title: 'Backwards Span Event',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        allDay: true,
        type: 'meeting',
        priority: 'medium',
        status: 'scheduled',
        color: '#3b82f6',
        createdBy: 'user1',
      });

      expect(calendarService.getEventsForDate(start)).toEqual([event]);
    });
  });

  describe('event management', () => {
    it('creates new events', () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: false,
        type: 'meeting' as const,
        priority: 'medium' as const,
        status: 'scheduled' as const,
        color: '#3b82f6',
        createdBy: 'user1'
      };

      const event = calendarService.createEvent(eventData);

      expect(event.id).toBeDefined();
      expect(event.title).toBe(eventData.title);
      expect(event.createdAt).toBeDefined();
      expect(event.updatedAt).toBeDefined();
    });

    it('updates existing events', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: false,
        type: 'meeting' as const,
        priority: 'medium' as const,
        status: 'scheduled' as const,
        color: '#3b82f6',
        createdBy: 'user1'
      };

      const event = calendarService.createEvent(eventData);
      // Ensure a new millisecond ticks over so updatedAt is guaranteed to differ.
      await new Promise(resolve => setTimeout(resolve, 2));
      const updatedEvent = calendarService.updateEvent(event.id, { title: 'Updated Title' });

      expect(updatedEvent?.title).toBe('Updated Title');
      expect(updatedEvent?.updatedAt).not.toBe(event.updatedAt);
    });

    it('deletes events', () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: false,
        type: 'meeting' as const,
        priority: 'medium' as const,
        status: 'scheduled' as const,
        color: '#3b82f6',
        createdBy: 'user1'
      };

      const event = calendarService.createEvent(eventData);
      const deleted = calendarService.deleteEvent(event.id);

      expect(deleted).toBe(true);
      expect(calendarService.getEventById(event.id)).toBeUndefined();
    });

    it('returns false when deleting non-existent event', () => {
      const deleted = calendarService.deleteEvent('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('event queries', () => {
    beforeEach(() => {
      // Create test events
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      calendarService.createEvent({
        title: 'Today Event',
        startDate: today.toISOString(),
        endDate: today.toISOString(),
        allDay: true,
        type: 'meeting',
        priority: 'high',
        status: 'scheduled',
        color: '#3b82f6',
        createdBy: 'user1'
      });

      calendarService.createEvent({
        title: 'Tomorrow Event',
        startDate: tomorrow.toISOString(),
        endDate: tomorrow.toISOString(),
        allDay: true,
        type: 'task',
        priority: 'medium',
        status: 'scheduled',
        color: '#10b981',
        createdBy: 'user1'
      });
    });

    it('gets events for specific date', () => {
      const today = new Date();
      const events = calendarService.getEventsForDate(today);

      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Today Event');
    });

    it('gets events in date range', () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const events = calendarService.getEventsInRange(today, nextWeek);

      expect(events).toHaveLength(2);
    });

    it('filters events by type', () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const events = calendarService.getEventsInRange(today, nextWeek, {
        types: ['meeting'],
        priorities: [],
        statuses: [],
        attendees: [],
        projects: []
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('meeting');
    });

    it('filters events by priority', () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const events = calendarService.getEventsInRange(today, nextWeek, {
        types: [],
        priorities: ['high'],
        statuses: [],
        attendees: [],
        projects: []
      });

      expect(events).toHaveLength(1);
      expect(events[0].priority).toBe('high');
    });

    it('searches events by title', () => {
      const results = calendarService.searchEvents('Today');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Today Event');
    });

    it('searches events by description', () => {
      calendarService.createEvent({
        title: 'Event with Description',
        description: 'Special meeting description',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: true,
        type: 'meeting',
        priority: 'medium',
        status: 'scheduled',
        color: '#3b82f6',
        createdBy: 'user1'
      });

      const results = calendarService.searchEvents('Special');

      expect(results).toHaveLength(1);
      expect(results[0].description).toContain('Special');
    });

    it('sorts multiple events on the same date by start time', () => {
      const day = new Date('2024-07-15T00:00:00.000Z');
      const later = new Date(day); later.setUTCHours(14, 0, 0, 0);
      const earlier = new Date(day); earlier.setUTCHours(8, 0, 0, 0);

      calendarService.createEvent({
        title: 'Later same-day event', startDate: later.toISOString(), endDate: later.toISOString(),
        allDay: false, type: 'meeting', priority: 'medium', status: 'scheduled', color: '#3b82f6', createdBy: 'user1',
      });
      calendarService.createEvent({
        title: 'Earlier same-day event', startDate: earlier.toISOString(), endDate: earlier.toISOString(),
        allDay: false, type: 'meeting', priority: 'medium', status: 'scheduled', color: '#3b82f6', createdBy: 'user1',
      });

      const events = calendarService.getEventsForDate(day);
      expect(events.map(e => e.title)).toEqual(['Earlier same-day event', 'Later same-day event']);
    });

    it('sorts multiple search matches by start time', () => {
      const later = new Date(); later.setDate(later.getDate() + 10);
      const earlier = new Date(); earlier.setDate(earlier.getDate() + 5);

      calendarService.createEvent({
        title: 'Zenith search match (later)', startDate: later.toISOString(), endDate: later.toISOString(),
        allDay: true, type: 'meeting', priority: 'medium', status: 'scheduled', color: '#3b82f6', createdBy: 'user1',
      });
      calendarService.createEvent({
        title: 'Zenith search match (earlier)', startDate: earlier.toISOString(), endDate: earlier.toISOString(),
        allDay: true, type: 'meeting', priority: 'medium', status: 'scheduled', color: '#3b82f6', createdBy: 'user1',
      });

      const results = calendarService.searchEvents('Zenith search match');
      expect(results.map(e => e.title)).toEqual(['Zenith search match (earlier)', 'Zenith search match (later)']);
    });
  });

  describe('statistics', () => {
    beforeEach(() => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Completed event (yesterday)
      calendarService.createEvent({
        title: 'Completed Event',
        startDate: yesterday.toISOString(),
        endDate: yesterday.toISOString(),
        allDay: true,
        type: 'meeting',
        priority: 'high',
        status: 'completed',
        color: '#3b82f6',
        createdBy: 'user1'
      });

      // Upcoming event (tomorrow)
      calendarService.createEvent({
        title: 'Upcoming Event',
        startDate: tomorrow.toISOString(),
        endDate: tomorrow.toISOString(),
        allDay: true,
        type: 'task',
        priority: 'medium',
        status: 'scheduled',
        color: '#10b981',
        createdBy: 'user1'
      });

      // Overdue event (yesterday, still scheduled)
      calendarService.createEvent({
        title: 'Overdue Event',
        startDate: yesterday.toISOString(),
        endDate: yesterday.toISOString(),
        allDay: true,
        type: 'deadline',
        priority: 'critical',
        status: 'scheduled',
        color: '#ef4444',
        createdBy: 'user1'
      });
    });

    it('calculates total events', () => {
      const stats = calendarService.getStatistics();
      expect(stats.totalEvents).toBe(3);
    });

    it('groups events by type', () => {
      const stats = calendarService.getStatistics();
      expect(stats.eventsByType.meeting).toBe(1);
      expect(stats.eventsByType.task).toBe(1);
      expect(stats.eventsByType.deadline).toBe(1);
    });

    it('groups events by status', () => {
      const stats = calendarService.getStatistics();
      expect(stats.eventsByStatus.completed).toBe(1);
      expect(stats.eventsByStatus.scheduled).toBe(2);
    });

    it('counts upcoming events', () => {
      const stats = calendarService.getStatistics();
      expect(stats.upcomingEvents).toBe(1);
    });

    it('counts overdue events', () => {
      const stats = calendarService.getStatistics();
      expect(stats.overdueEvents).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty date ranges', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const events = calendarService.getEventsInRange(today, yesterday);
      expect(events).toHaveLength(0);
    });

    it('handles invalid event updates', () => {
      const result = calendarService.updateEvent('non-existent', { title: 'New Title' });
      expect(result).toBeNull();
    });

    it('handles empty search queries', () => {
      const results = calendarService.searchEvents('');
      expect(Array.isArray(results)).toBe(true);
    });

    it('handles events spanning multiple days', () => {
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 2);

      calendarService.createEvent({
        title: 'Multi-day Event',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        allDay: true,
        type: 'project',
        priority: 'medium',
        status: 'scheduled',
        color: '#8b5cf6',
        createdBy: 'user1'
      });

      const middleDate = new Date(startDate);
      middleDate.setDate(startDate.getDate() + 1);

      const events = calendarService.getEventsForDate(middleDate);
      expect(events).toHaveLength(1);
    });
  });

  describe('re-indexing on date changes', () => {
    it('re-indexes an event when its span changes, removing it from old dates and adding it to new ones', () => {
      const oldDate = new Date();
      const newDate = new Date(oldDate);
      newDate.setDate(oldDate.getDate() + 5);

      const event = calendarService.createEvent({
        title: 'Movable Event',
        startDate: oldDate.toISOString(),
        endDate: oldDate.toISOString(),
        allDay: true,
        type: 'meeting',
        priority: 'medium',
        status: 'scheduled',
        color: '#3b82f6',
        createdBy: 'user1',
      });

      expect(calendarService.getEventsForDate(oldDate)).toHaveLength(1);

      calendarService.updateEvent(event.id, {
        startDate: newDate.toISOString(),
        endDate: newDate.toISOString(),
      });

      expect(calendarService.getEventsForDate(oldDate)).toHaveLength(0);
      expect(calendarService.getEventsForDate(newDate)).toHaveLength(1);
    });

    it('does not re-index when an update leaves dates unchanged', () => {
      const date = new Date();
      const event = calendarService.createEvent({
        title: 'Static Event',
        startDate: date.toISOString(),
        endDate: date.toISOString(),
        allDay: true,
        type: 'meeting',
        priority: 'medium',
        status: 'scheduled',
        color: '#3b82f6',
        createdBy: 'user1',
      });

      calendarService.updateEvent(event.id, {
        startDate: event.startDate,
        endDate: event.endDate,
        title: 'Still Static',
      });

      expect(calendarService.getEventsForDate(date)).toHaveLength(1);
    });
  });

  describe('deleting an event tied to a project', () => {
    it('removes the event from the project index on delete', () => {
      const event = calendarService.createEvent({
        title: 'Project Kickoff',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: true,
        type: 'milestone',
        priority: 'medium',
        status: 'scheduled',
        color: '#3b82f6',
        createdBy: 'user1',
        projectId: 'project-1',
      });

      expect(calendarService.deleteEvent(event.id)).toBe(true);
      expect(calendarService.getEventById(event.id)).toBeUndefined();
    });
  });

  describe('additional filter criteria', () => {
    beforeEach(() => {
      calendarService.createEvent({
        title: 'Scheduled with attendee',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: true,
        type: 'meeting',
        priority: 'medium',
        status: 'scheduled',
        color: '#3b82f6',
        createdBy: 'user1',
        attendees: ['user-a', 'user-b'],
        projectId: 'project-1',
      });
      calendarService.createEvent({
        title: 'Completed, no attendees',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: true,
        type: 'meeting',
        priority: 'medium',
        status: 'completed',
        color: '#3b82f6',
        createdBy: 'user1',
      });
      calendarService.createEvent({
        title: 'Different project',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: true,
        type: 'meeting',
        priority: 'medium',
        status: 'scheduled',
        color: '#3b82f6',
        createdBy: 'user1',
        projectId: 'project-2',
      });
    });

    it('filters by status', () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const events = calendarService.getEventsInRange(today, nextWeek, {
        types: [],
        priorities: [],
        statuses: ['completed'],
        attendees: [],
        projects: [],
      });

      expect(events.map(e => e.title)).toEqual(['Completed, no attendees']);
    });

    it('filters by attendee, excluding events without a matching attendee', () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const events = calendarService.getEventsInRange(today, nextWeek, {
        types: [],
        priorities: [],
        statuses: [],
        attendees: ['user-a'],
        projects: [],
      });

      expect(events.map(e => e.title)).toEqual(['Scheduled with attendee']);
    });

    it('filters out events whose projectId is not in the list, but passes through events with no projectId at all', () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const events = calendarService.getEventsInRange(today, nextWeek, {
        types: [],
        priorities: [],
        statuses: [],
        attendees: [],
        projects: ['project-1'],
      });

      // "Different project" (project-2) is excluded; "Completed, no
      // attendees" has no projectId at all, so the project filter doesn't
      // apply to it and it passes through alongside the matching project-1 event.
      expect(events.map(e => e.title).sort()).toEqual(
        ['Completed, no attendees', 'Scheduled with attendee'].sort()
      );
    });
  });

  describe('color assignment during initialization', () => {
    it('assigns a color per task priority when generating events from tasks', async () => {
      const makeTask = (id: string, priority: 'low' | 'medium' | 'high' | 'critical') => ({
        id,
        title: `Task ${id}`,
        description: 'desc',
        dueDate: new Date().toISOString(),
        priority,
        status: 'todo' as const,
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectId: 'project1',
        estimatedHours: 1,
        actualHours: 0,
        tags: [],
        dependencies: [],
      });

      mockDatabaseService.getTasks.mockResolvedValue({
        data: [
          makeTask('low-1', 'low'),
          makeTask('medium-1', 'medium'),
          makeTask('high-1', 'high'),
          makeTask('critical-1', 'critical'),
        ],
        total: 4,
        hasMore: false,
      });
      mockDatabaseService.getProjects.mockResolvedValue({ data: [], total: 0, hasMore: false });
      mockDatabaseService.getUsers.mockResolvedValue({
        data: [
          {
            id: 'user1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'developer',
            department: 'Engineering',
            joinDate: new Date().toISOString(),
            isActive: true,
          },
        ],
        total: 1,
        hasMore: false,
      });

      await calendarService.initialize();

      expect(calendarService.getEventById('task_low-1')?.color).toBe('#22c55e');
      expect(calendarService.getEventById('task_medium-1')?.color).toBe('#eab308');
      expect(calendarService.getEventById('task_high-1')?.color).toBe('#f97316');
      expect(calendarService.getEventById('task_critical-1')?.color).toBe('#ef4444');
    });
  });

  describe('getAllEvents', () => {
    it('returns every stored event', () => {
      calendarService.createEvent({
        title: 'Event A',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: true,
        type: 'meeting',
        priority: 'medium',
        status: 'scheduled',
        color: '#3b82f6',
        createdBy: 'user1',
      });
      calendarService.createEvent({
        title: 'Event B',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: true,
        type: 'task',
        priority: 'low',
        status: 'scheduled',
        color: '#10b981',
        createdBy: 'user1',
      });

      expect(calendarService.getAllEvents()).toHaveLength(2);
    });
  });
});