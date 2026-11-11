import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useGlobalStore } from '../../store/globalStore';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { AdvancedSearch } from '../Advanced/AdvancedSearch';
import { BulkOperations, ItemSelector } from '../Advanced/BulkOperations';
import { featureFlags } from '../../config/featureFlags';
import { Task } from '../../types';

interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  value: string | boolean;
  label: string;
}

function matchesAdvancedFilter(task: Task, filter: SearchFilter): boolean {
  const value = task[filter.field as keyof Task];
  if (value === undefined || value === null) return filter.value === '';

  switch (filter.operator) {
    case 'contains':
      return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
    case 'startsWith':
      return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
    case 'endsWith':
      return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
    case 'greaterThan':
      return Number(value) > Number(filter.value);
    case 'lessThan':
      return Number(value) < Number(filter.value);
    default:
      return String(value) === String(filter.value);
  }
}

export function TaskList() {
  const { state, dispatch } = useApp();
  const { selectedItems, selectItem, deselectItem } = useGlobalStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilter[]>([]);

  const filteredTasks = state.tasks.filter(task => {
    const matchesFilter = filter === 'all' || task.status === filter;
    const matchesSearch = !searchQuery ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAdvanced = advancedFilters.every(f => matchesAdvancedFilter(task, f));
    return matchesFilter && matchesSearch && matchesAdvanced;
  });

  const statusOptions = [
    { value: 'all', label: 'All Tasks' },
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'completed', label: 'Completed' },
    { value: 'blocked', label: 'Blocked' },
  ];

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTask(null);
  };

  const handleBulkUpdate = async (updates: Array<{ id: string; updates: Record<string, unknown> }>) => {
    updates.forEach(({ id, updates: taskUpdates }) => {
      const task = state.tasks.find(t => t.id === id);
      if (task) {
        dispatch({ type: 'UPDATE_TASK', payload: { ...task, ...taskUpdates } });
      }
    });
  };

  const handleBulkDelete = async (ids: string[]) => {
    ids.forEach(id => dispatch({ type: 'DELETE_TASK', payload: id }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {featureFlags.enableAdvancedSearch ? (
            <div className="flex-1 max-w-md">
              <AdvancedSearch
                type="tasks"
                placeholder="Search tasks..."
                onSearch={(query, filters) => {
                  setSearchQuery(query);
                  setAdvancedFilters(filters);
                }}
              />
            </div>
          ) : (
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          )}
        </div>
        <div className="text-sm text-gray-600">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {featureFlags.enableBulkOperations && (
        <BulkOperations
          type="tasks"
          items={filteredTasks}
          onBulkUpdate={handleBulkUpdate}
          onBulkDelete={handleBulkDelete}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task) => (
          <div key={task.id} className="relative">
            {featureFlags.enableBulkOperations && (
              <div className="absolute top-2 right-2 z-10">
                <ItemSelector
                  id={task.id}
                  selected={selectedItems.has(task.id)}
                  onSelect={(id) => (selectedItems.has(id) ? deselectItem(id) : selectItem(id))}
                  className="bg-white shadow-sm"
                />
              </div>
            )}
            <TaskCard
              task={task}
              onClick={() => handleTaskClick(task)}
            />
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No tasks found matching your criteria.</p>
        </div>
      )}

      {showModal && selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
