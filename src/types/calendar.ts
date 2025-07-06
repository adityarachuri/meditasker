export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  type: 'task' | 'project' | 'meeting' | 'deadline' | 'milestone' | 'personal';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  attendees?: string[]; // User IDs
  location?: string;
  color: string;
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  };
  reminders?: {
    type: 'email' | 'notification';
    minutes: number;
  }[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  taskId?: string;
}

export interface CalendarView {
  type: 'month' | 'week' | 'day' | 'agenda';
  date: Date;
}

export interface CalendarFilter {
  types: string[];
  priorities: string[];
  statuses: string[];
  attendees: string[];
  projects: string[];
}

export interface TimeSlot {
  start: Date;
  end: Date;
  events: CalendarEvent[];
}

export interface CalendarDragEvent {
  event: CalendarEvent;
  newStart: Date;
  newEnd: Date;
}