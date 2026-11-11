import { CalendarEvent, CalendarFilter } from '../types/calendar';
import { databaseService } from './databaseService';

export class CalendarService {
  private static instance: CalendarService;
  private events: Map<string, CalendarEvent> = new Map();
  private eventsByDate: Map<string, Set<string>> = new Map();
  private eventsByType: Map<string, Set<string>> = new Map();
  private eventsByProject: Map<string, Set<string>> = new Map();

  // Date keys (toDateString()) for every day an event spans, start through end
  // inclusive, so multi-day events are findable via getEventsForDate on any
  // day they cover, not just their start day. Capped to avoid pathological
  // ranges from indexing an unbounded number of days.
  private static readonly MAX_SPAN_DAYS = 366;

  private getDateKeysForSpan(startDate: string, endDate: string): string[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const keys: string[] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    for (let i = 0; i <= CalendarService.MAX_SPAN_DAYS && cursor <= endDay; i++) {
      keys.push(cursor.toDateString());
      cursor.setDate(cursor.getDate() + 1);
    }

    return keys.length > 0 ? keys : [start.toDateString()];
  }

  static getInstance(): CalendarService {
    if (!CalendarService.instance) {
      CalendarService.instance = new CalendarService();
    }
    return CalendarService.instance;
  }

  // Initialize calendar with task and project data
  async initialize(): Promise<void> {
    console.time('Calendar initialization');
    
    // Clear existing data
    this.events.clear();
    this.eventsByDate.clear();
    this.eventsByType.clear();
    this.eventsByProject.clear();

    // Generate events from tasks and projects
    await this.generateEventsFromTasks();
    await this.generateEventsFromProjects();
    await this.generateSampleMeetings();

    console.timeEnd('Calendar initialization');
    console.log(`Initialized calendar with ${this.events.size} events`);
  }

  private async generateEventsFromTasks(): Promise<void> {
    const tasksResult = await databaseService.getTasks(1, 20000); // Get first 20k tasks for calendar
    
    tasksResult.data.forEach(task => {
      if (task.dueDate) {
        const event: CalendarEvent = {
          id: `task_${task.id}`,
          title: task.title,
          description: task.description,
          startDate: task.dueDate,
          endDate: task.dueDate,
          allDay: true,
          type: 'task',
          priority: task.priority,
          status: task.status === 'completed' ? 'completed' : 'scheduled',
          attendees: task.assigneeId ? [task.assigneeId] : [],
          color: this.getColorByPriority(task.priority),
          createdBy: task.createdBy,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          projectId: task.projectId,
          taskId: task.id
        };
        
        this.addEvent(event);
      }
    });
  }

  private async generateEventsFromProjects(): Promise<void> {
    const projectsResult = await databaseService.getProjects(1, 5000); // Get all projects
    
    projectsResult.data.forEach(project => {
      // Project start event
      const startEvent: CalendarEvent = {
        id: `project_start_${project.id}`,
        title: `${project.name} - Start`,
        description: `Project kickoff: ${project.description}`,
        startDate: project.startDate,
        endDate: project.startDate,
        allDay: true,
        type: 'milestone',
        priority: project.priority,
        status: 'scheduled',
        attendees: project.teamIds,
        color: project.color,
        createdBy: project.managerId,
        createdAt: project.startDate,
        updatedAt: project.startDate,
        projectId: project.id
      };

      // Project end event
      const endEvent: CalendarEvent = {
        id: `project_end_${project.id}`,
        title: `${project.name} - Deadline`,
        description: `Project deadline: ${project.description}`,
        startDate: project.endDate,
        endDate: project.endDate,
        allDay: true,
        type: 'deadline',
        priority: project.priority,
        status: project.status === 'completed' ? 'completed' : 'scheduled',
        attendees: project.teamIds,
        color: project.color,
        createdBy: project.managerId,
        createdAt: project.startDate,
        updatedAt: project.startDate,
        projectId: project.id
      };

      this.addEvent(startEvent);
      this.addEvent(endEvent);
    });
  }

  private async generateSampleMeetings(): Promise<void> {
    const usersResult = await databaseService.getUsers(1, 200); // Get first 200 users for meetings
    const users = usersResult.data;
    
    // Generate recurring meetings
    const meetingTypes = [
      { title: 'Daily Standup', duration: 30, recurrence: 'daily' },
      { title: 'Sprint Planning', duration: 120, recurrence: 'weekly' },
      { title: 'Team Retrospective', duration: 60, recurrence: 'weekly' },
      { title: 'All Hands Meeting', duration: 60, recurrence: 'monthly' }
    ];

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // Start from last month

    meetingTypes.forEach((meetingType, index) => {
      for (let i = 0; i < 20; i++) { // Generate 20 instances
        const eventDate = new Date(startDate);
        
        if (meetingType.recurrence === 'daily') {
          eventDate.setDate(startDate.getDate() + i);
        } else if (meetingType.recurrence === 'weekly') {
          eventDate.setDate(startDate.getDate() + (i * 7));
        } else if (meetingType.recurrence === 'monthly') {
          eventDate.setMonth(startDate.getMonth() + i);
        }

        const endDate = new Date(eventDate);
        endDate.setMinutes(endDate.getMinutes() + meetingType.duration);

        const event: CalendarEvent = {
          id: `meeting_${index}_${i}`,
          title: meetingType.title,
          description: `Regular ${meetingType.title.toLowerCase()} meeting`,
          startDate: eventDate.toISOString(),
          endDate: endDate.toISOString(),
          allDay: false,
          type: 'meeting',
          priority: 'medium',
          status: eventDate < new Date() ? 'completed' : 'scheduled',
          attendees: users.slice(0, Math.floor(Math.random() * 10) + 3).map(u => u.id),
          location: `Conference Room ${index + 1}`,
          color: this.getColorByType('meeting'),
          createdBy: users[0].id,
          createdAt: startDate.toISOString(),
          updatedAt: startDate.toISOString()
        };

        this.addEvent(event);
      }
    });
  }

  private addEvent(event: CalendarEvent): void {
    this.events.set(event.id, event);

    // Index by every day the event spans
    for (const dateKey of this.getDateKeysForSpan(event.startDate, event.endDate)) {
      if (!this.eventsByDate.has(dateKey)) {
        this.eventsByDate.set(dateKey, new Set());
      }
      this.eventsByDate.get(dateKey)!.add(event.id);
    }

    // Index by type
    if (!this.eventsByType.has(event.type)) {
      this.eventsByType.set(event.type, new Set());
    }
    this.eventsByType.get(event.type)!.add(event.id);

    // Index by project
    if (event.projectId) {
      if (!this.eventsByProject.has(event.projectId)) {
        this.eventsByProject.set(event.projectId, new Set());
      }
      this.eventsByProject.get(event.projectId)!.add(event.id);
    }
  }

  // Get events for a date range
  getEventsInRange(startDate: Date, endDate: Date, filter?: CalendarFilter): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateKey = current.toDateString();
      const dayEvents = this.eventsByDate.get(dateKey);
      
      if (dayEvents) {
        dayEvents.forEach(eventId => {
          const event = this.events.get(eventId);
          if (event && this.matchesFilter(event, filter)) {
            events.push(event);
          }
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  // Get events for a specific date
  getEventsForDate(date: Date, filter?: CalendarFilter): CalendarEvent[] {
    const dateKey = date.toDateString();
    const dayEvents = this.eventsByDate.get(dateKey);
    const events: CalendarEvent[] = [];

    if (dayEvents) {
      dayEvents.forEach(eventId => {
        const event = this.events.get(eventId);
        if (event && this.matchesFilter(event, filter)) {
          events.push(event);
        }
      });
    }

    return events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  // Create new event
  createEvent(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): CalendarEvent {
    const newEvent: CalendarEvent = {
      ...event,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.addEvent(newEvent);
    return newEvent;
  }

  // Update event
  updateEvent(id: string, updates: Partial<CalendarEvent>): CalendarEvent | null {
    const event = this.events.get(id);
    if (!event) return null;

    const dateChanged = (updates.startDate && updates.startDate !== event.startDate) ||
      (updates.endDate && updates.endDate !== event.endDate);

    // Remove from every old date-span index entry if the span changed
    if (dateChanged) {
      for (const oldDateKey of this.getDateKeysForSpan(event.startDate, event.endDate)) {
        this.eventsByDate.get(oldDateKey)?.delete(id);
      }
    }

    const updatedEvent: CalendarEvent = {
      ...event,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.events.set(id, updatedEvent);

    // Re-index across the new span
    if (dateChanged) {
      for (const newDateKey of this.getDateKeysForSpan(updatedEvent.startDate, updatedEvent.endDate)) {
        if (!this.eventsByDate.has(newDateKey)) {
          this.eventsByDate.set(newDateKey, new Set());
        }
        this.eventsByDate.get(newDateKey)!.add(id);
      }
    }

    return updatedEvent;
  }

  // Delete event
  deleteEvent(id: string): boolean {
    const event = this.events.get(id);
    if (!event) return false;

    // Remove from indexes
    for (const dateKey of this.getDateKeysForSpan(event.startDate, event.endDate)) {
      this.eventsByDate.get(dateKey)?.delete(id);
    }
    this.eventsByType.get(event.type)?.delete(id);
    if (event.projectId) {
      this.eventsByProject.get(event.projectId)?.delete(id);
    }

    this.events.delete(id);
    return true;
  }

  // Search events
  searchEvents(query: string, filter?: CalendarFilter): CalendarEvent[] {
    const results: CalendarEvent[] = [];
    const searchLower = query.toLowerCase();

    this.events.forEach(event => {
      if (this.matchesFilter(event, filter)) {
        if (
          event.title.toLowerCase().includes(searchLower) ||
          event.description?.toLowerCase().includes(searchLower) ||
          event.location?.toLowerCase().includes(searchLower)
        ) {
          results.push(event);
        }
      }
    });

    return results.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  // Get event statistics
  getStatistics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByStatus: Record<string, number>;
    upcomingEvents: number;
    overdueEvents: number;
  } {
    const stats = {
      totalEvents: this.events.size,
      eventsByType: {} as Record<string, number>,
      eventsByStatus: {} as Record<string, number>,
      upcomingEvents: 0,
      overdueEvents: 0
    };

    const now = new Date();

    this.events.forEach(event => {
      // Count by type
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
      
      // Count by status
      stats.eventsByStatus[event.status] = (stats.eventsByStatus[event.status] || 0) + 1;
      
      // Count upcoming and overdue
      const eventDate = new Date(event.startDate);
      if (eventDate > now && event.status !== 'completed') {
        stats.upcomingEvents++;
      } else if (eventDate < now && event.status === 'scheduled') {
        stats.overdueEvents++;
      }
    });

    return stats;
  }

  private matchesFilter(event: CalendarEvent, filter?: CalendarFilter): boolean {
    if (!filter) return true;

    if (filter.types.length > 0 && !filter.types.includes(event.type)) {
      return false;
    }

    if (filter.priorities.length > 0 && !filter.priorities.includes(event.priority)) {
      return false;
    }

    if (filter.statuses.length > 0 && !filter.statuses.includes(event.status)) {
      return false;
    }

    if (filter.attendees.length > 0) {
      const hasAttendee = filter.attendees.some(attendeeId => 
        event.attendees?.includes(attendeeId)
      );
      if (!hasAttendee) return false;
    }

    if (filter.projects.length > 0 && event.projectId && !filter.projects.includes(event.projectId)) {
      return false;
    }

    return true;
  }

  private getColorByPriority(priority: string): string {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  }

  private getColorByType(type: string): string {
    switch (type) {
      case 'task': return '#3b82f6';
      case 'project': return '#8b5cf6';
      case 'meeting': return '#06b6d4';
      case 'deadline': return '#ef4444';
      case 'milestone': return '#10b981';
      case 'personal': return '#ec4899';
      default: return '#6b7280';
    }
  }

  // Get event by ID
  getEventById(id: string): CalendarEvent | undefined {
    return this.events.get(id);
  }

  // Get all events
  getAllEvents(): CalendarEvent[] {
    return Array.from(this.events.values());
  }

  // Clear all events
  clearEvents(): void {
    this.events.clear();
    this.eventsByDate.clear();
    this.eventsByType.clear();
    this.eventsByProject.clear();
  }
}

export const calendarService = CalendarService.getInstance();