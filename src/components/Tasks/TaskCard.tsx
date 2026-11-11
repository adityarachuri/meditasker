import { Task } from '../../types';
import { useApp } from '../../context/AppContext';
import { Calendar, User, Clock, AlertCircle } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { state } = useApp();
  const project = state.projects.find(p => p.id === task.projectId);
  const assignee = state.users.find(u => u.id === task.assigneeId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDaysUntilDue = () => {
    if (!task.dueDate) return null;
    const days = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysUntilDue = getDaysUntilDue();

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div
            className={`w-4 h-4 rounded-full mr-3 ${getPriorityColor(task.priority)}`}
          />
          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
          </span>
        </div>
        {task.status === 'blocked' && (
          <AlertCircle className="w-5 h-5 text-red-500" />
        )}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{task.description}</p>

      <div className="space-y-2 text-sm">
        <div className="flex items-center text-gray-600">
          <User className="w-4 h-4 mr-2" />
          <span>{assignee?.name || 'Unassigned'}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Calendar className="w-4 h-4 mr-2" />
          <span>{project?.name}</span>
        </div>
        {task.dueDate && (
          <div className="flex items-center text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span className={
              daysUntilDue !== null && daysUntilDue < 0 ? 'text-red-600' :
              daysUntilDue !== null && daysUntilDue <= 2 ? 'text-orange-600' :
              'text-gray-600'
            }>
              {daysUntilDue !== null && daysUntilDue < 0 ? 'Overdue' :
               daysUntilDue === 0 ? 'Due today' :
               daysUntilDue === 1 ? 'Due tomorrow' :
               new Date(task.dueDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-1">
        {task.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {task.actualHours}h / {task.estimatedHours}h
        </div>
        <div className="w-20 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min((task.actualHours / task.estimatedHours) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}