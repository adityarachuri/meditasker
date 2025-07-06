import React, { useState } from 'react';
import { X, Calendar, User, Clock, AlertCircle, Edit, Save, Ambulance as Cancel } from 'lucide-react';
import { Task } from '../../types';
import { useApp } from '../../context/AppContext';

interface TaskModalProps {
  task: Task;
  onClose: () => void;
}

export function TaskModal({ task, onClose }: TaskModalProps) {
  const { state, dispatch } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);

  const project = state.projects.find(p => p.id === task.projectId);
  const assignee = state.users.find(u => u.id === task.assigneeId);
  const creator = state.users.find(u => u.id === task.createdBy);

  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'completed', label: 'Completed' },
    { value: 'blocked', label: 'Blocked' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...editedTask,
        updatedAt: new Date().toISOString(),
      },
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTask(task);
    setIsEditing(false);
  };

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
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getDaysUntilDue = () => {
    if (!task.dueDate) return null;
    const days = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysUntilDue = getDaysUntilDue();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div
              className={`w-4 h-4 rounded-full mr-3 ${
                task.priority === 'critical' ? 'bg-red-500' :
                task.priority === 'high' ? 'bg-orange-500' :
                task.priority === 'medium' ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
            />
            <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
            <span className={`ml-4 px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <Edit className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSave}
                  className="p-2 text-green-600 hover:text-green-700"
                >
                  <Save className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <Cancel className="w-5 h-5" />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              {isEditing ? (
                <textarea
                  value={editedTask.description}
                  onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                />
              ) : (
                <p className="text-gray-600">{task.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Assigned to</p>
                    {isEditing ? (
                      <select
                        value={editedTask.assigneeId || ''}
                        onChange={(e) => setEditedTask({ ...editedTask, assigneeId: e.target.value || undefined })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Unassigned</option>
                        {state.users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">{assignee?.name || 'Unassigned'}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Due Date</p>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editedTask.dueDate ? editedTask.dueDate.split('T')[0] : ''}
                        onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value ? `${e.target.value}T17:00:00Z` : undefined })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className={`text-sm font-medium ${
                        daysUntilDue !== null && daysUntilDue < 0 ? 'text-red-600' :
                        daysUntilDue !== null && daysUntilDue <= 2 ? 'text-orange-600' :
                        'text-gray-900'
                      }`}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                        {daysUntilDue !== null && (
                          <span className="ml-2 text-xs">
                            ({daysUntilDue < 0 ? 'Overdue' :
                              daysUntilDue === 0 ? 'Due today' :
                              daysUntilDue === 1 ? 'Due tomorrow' :
                              `${daysUntilDue} days left`})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Time Tracking</p>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={editedTask.actualHours}
                          onChange={(e) => setEditedTask({ ...editedTask, actualHours: parseInt(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-sm text-gray-600">/ {editedTask.estimatedHours}h</span>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">
                        {task.actualHours}h / {task.estimatedHours}h
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Status</p>
                  {isEditing ? (
                    <select
                      value={editedTask.status}
                      onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value as any })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                      {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">Priority</p>
                  {isEditing ? (
                    <select
                      value={editedTask.priority}
                      onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as any })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {priorityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">Project</p>
                  <p className="text-sm font-medium text-gray-900">{project?.name}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Task Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Created by</p>
                  <p className="font-medium text-gray-900">{creator?.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Created on</p>
                  <p className="font-medium text-gray-900">{new Date(task.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last updated</p>
                  <p className="font-medium text-gray-900">{new Date(task.updatedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Estimated hours</p>
                  <p className="font-medium text-gray-900">{task.estimatedHours}h</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}