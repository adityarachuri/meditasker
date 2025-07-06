import React, { useState, useMemo } from 'react';
import { Task } from '../../types';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { MemoizedVirtualizedTable } from '../Performance/VirtualizedTable';
import { Calendar, User, Clock, Search, Filter } from 'lucide-react';
import { databaseService } from '../../services/databaseService';

export function TaskListVirtualized() {
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assigneeId: '',
    search: ''
  });

  const {
    data: tasks,
    loading,
    hasMore,
    total,
    loadMore,
    search
  } = usePaginatedData<Task>('tasks', {
    pageSize: 100,
    filters,
    enableCaching: true,
    optimizeForLargeDatasets: true
  });

  const columns = useMemo(() => [
    {
      key: 'title' as keyof Task,
      header: 'Task',
      width: 300,
      render: (value: string, task: Task) => {
        const project = databaseService.getProjectById(task.projectId);
        return (
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 truncate max-w-[280px]">
              {project?.name} • {task.description}
            </div>
          </div>
        );
      }
    },
    {
      key: 'status' as keyof Task,
      header: 'Status',
      width: 120,
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value === 'completed' ? 'bg-green-100 text-green-800' :
          value === 'in-progress' ? 'bg-blue-100 text-blue-800' :
          value === 'review' ? 'bg-yellow-100 text-yellow-800' :
          value === 'blocked' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      key: 'priority' as keyof Task,
      header: 'Priority',
      width: 100,
      render: (value: string) => (
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            value === 'critical' ? 'bg-red-500' :
            value === 'high' ? 'bg-orange-500' :
            value === 'medium' ? 'bg-yellow-500' :
            'bg-green-500'
          }`} />
          <span className="text-sm text-gray-700">
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        </div>
      )
    },
    {
      key: 'assigneeId' as keyof Task,
      header: 'Assignee',
      width: 150,
      render: (value: string | undefined) => {
        if (!value) return <span className="text-gray-400">Unassigned</span>;
        const user = databaseService.getUserById(value);
        return (
          <div className="flex items-center">
            <User className="w-4 h-4 mr-2 text-gray-400" />
            <span className="text-sm text-gray-700">
              {user?.name || 'Unknown User'}
            </span>
          </div>
        );
      }
    },
    {
      key: 'dueDate' as keyof Task,
      header: 'Due Date',
      width: 120,
      render: (value: string | undefined) => {
        if (!value) return <span className="text-gray-400">No due date</span>;
        
        const dueDate = new Date(value);
        const now = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        return (
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1 text-gray-400" />
            <span className={`text-sm ${
              daysUntilDue < 0 ? 'text-red-600' :
              daysUntilDue <= 2 ? 'text-orange-600' :
              'text-gray-700'
            }`}>
              {dueDate.toLocaleDateString()}
            </span>
          </div>
        );
      }
    },
    {
      key: 'estimatedHours' as keyof Task,
      header: 'Hours',
      width: 100,
      render: (value: number, task: Task) => (
        <div className="text-sm">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1 text-gray-400" />
            <span className="text-gray-700">
              {task.actualHours}h / {value}h
            </span>
          </div>
          <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
            <div
              className="bg-blue-600 h-1 rounded-full"
              style={{ width: `${Math.min((task.actualHours / value) * 100, 100)}%` }}
            />
          </div>
        </div>
      )
    },
    {
      key: 'tags' as keyof Task,
      header: 'Tags',
      width: 150,
      render: (value: string[]) => (
        <div className="flex flex-wrap gap-1">
          {value.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {value.length > 2 && (
            <span className="text-xs text-gray-500">
              +{value.length - 2} more
            </span>
          )}
        </div>
      )
    }
  ], []);

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    search(searchTerm);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  // Get unique assignees for filter dropdown
  const assignees = useMemo(() => {
    const uniqueAssignees = new Set<string>();
    tasks.forEach(task => {
      if (task.assigneeId) {
        uniqueAssignees.add(task.assigneeId);
      }
    });
    return Array.from(uniqueAssignees).map(id => {
      const user = databaseService.getUserById(id);
      return { id, name: user?.name || 'Unknown User' };
    });
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filters.assigneeId}
            onChange={(e) => handleFilterChange('assigneeId', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Assignees</option>
            {assignees.map(assignee => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-gray-600">
          {total.toLocaleString()} tasks total
        </div>
      </div>

      {/* Virtualized table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <MemoizedVirtualizedTable
          data={tasks}
          columns={columns}
          height={600}
          rowHeight={70}
          loading={loading}
          enableVirtualization={true}
          optimizeForLargeDatasets={true}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onRowClick={(task) => {
            console.log('Task clicked:', task.title);
            // Handle task click - could open modal or navigate
          }}
        />
      </div>

      {tasks.length === 0 && !loading && (
        <div className="text-center py-12">
          <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No tasks found matching your criteria from 1M+ records.</p>
          <p className="text-xs text-gray-400 mt-2">Enterprise search optimized for large datasets</p>
        </div>
      )}
      
    </div>
  );
}