import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Archive, 
  Tag, 
  User, 
  Calendar,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useGlobalStore } from '../../store/globalStore';
import { Task, Project } from '../../types';

interface BulkOperationsProps {
  type: 'tasks' | 'projects';
  items: (Task | Project)[];
  onBulkUpdate: (updates: Array<{ id: string; updates: any }>) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
}

export function BulkOperations({ type, items, onBulkUpdate, onBulkDelete }: BulkOperationsProps) {
  const { selectedItems, selectItem, deselectItem, selectAll, clearSelection } = useGlobalStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [bulkAction, setBulkAction] = useState<string | null>(null);

  const selectedCount = selectedItems.size;
  const allSelected = items.length > 0 && items.every(item => selectedItems.has(item.id));
  const someSelected = selectedCount > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(items.map(item => item.id));
    }
  };

  const handleItemSelect = (id: string) => {
    if (selectedItems.has(id)) {
      deselectItem(id);
    } else {
      selectItem(id);
    }
  };

  const handleBulkAction = async (action: string, value?: any) => {
    if (selectedCount === 0) return;

    setIsProcessing(true);
    setBulkAction(action);

    try {
      const selectedIds = Array.from(selectedItems);
      
      switch (action) {
        case 'delete':
          await onBulkDelete(selectedIds);
          break;
        case 'updateStatus':
          await onBulkUpdate(selectedIds.map(id => ({ id, updates: { status: value } })));
          break;
        case 'updatePriority':
          await onBulkUpdate(selectedIds.map(id => ({ id, updates: { priority: value } })));
          break;
        case 'assignUser':
          await onBulkUpdate(selectedIds.map(id => ({ id, updates: { assigneeId: value } })));
          break;
        case 'updateDueDate':
          await onBulkUpdate(selectedIds.map(id => ({ id, updates: { dueDate: value } })));
          break;
        case 'addTag':
          await onBulkUpdate(selectedIds.map(id => {
            const item = items.find(i => i.id === id) as Task;
            const newTags = item.tags ? [...item.tags, value] : [value];
            return { id, updates: { tags: newTags } };
          }));
          break;
        case 'archive':
          await onBulkUpdate(selectedIds.map(id => ({ id, updates: { archived: true } })));
          break;
      }

      clearSelection();
      setShowBulkMenu(false);
    } catch (error) {
      console.error('Bulk operation failed:', error);
    } finally {
      setIsProcessing(false);
      setBulkAction(null);
    }
  };

  const renderBulkMenu = () => {
    if (!showBulkMenu || selectedCount === 0) return null;

    const statusOptions = type === 'tasks' 
      ? ['todo', 'in-progress', 'review', 'completed', 'blocked']
      : ['planning', 'active', 'on-hold', 'completed', 'cancelled'];

    const priorityOptions = ['low', 'medium', 'high', 'critical'];

    return (
      <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="p-2">
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Update Status</label>
            <select
              onChange={(e) => handleBulkAction('updateStatus', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isProcessing}
            >
              <option value="">Select status...</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Update Priority</label>
            <select
              onChange={(e) => handleBulkAction('updatePriority', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isProcessing}
            >
              <option value="">Select priority...</option>
              {priorityOptions.map(priority => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {type === 'tasks' && (
            <>
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Set Due Date</label>
                <input
                  type="date"
                  onChange={(e) => handleBulkAction('updateDueDate', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isProcessing}
                />
              </div>

              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Add Tag</label>
                <input
                  type="text"
                  placeholder="Enter tag name..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      handleBulkAction('addTag', e.currentTarget.value.trim());
                      e.currentTarget.value = '';
                    }
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isProcessing}
                />
              </div>
            </>
          )}

          <div className="border-t border-gray-200 pt-2 mt-2">
            <button
              onClick={() => handleBulkAction('archive')}
              className="w-full flex items-center px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
              disabled={isProcessing}
            >
              <Archive className="w-4 h-4 mr-2" />
              Archive Selected
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="w-full flex items-center px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
              disabled={isProcessing}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (items.length === 0) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      <div className="flex items-center space-x-4">
        <button
          onClick={handleSelectAll}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          {allSelected ? (
            <CheckSquare className="w-4 h-4 mr-2" />
          ) : someSelected ? (
            <div className="w-4 h-4 mr-2 border-2 border-blue-600 bg-blue-600 rounded-sm flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-sm" />
            </div>
          ) : (
            <Square className="w-4 h-4 mr-2" />
          )}
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>

        {selectedCount > 0 && (
          <span className="text-sm text-gray-600">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center space-x-2">
          {isProcessing && (
            <div className="flex items-center text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              {bulkAction === 'delete' ? 'Deleting...' : 'Updating...'}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setShowBulkMenu(!showBulkMenu)}
              className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              disabled={isProcessing}
            >
              <MoreHorizontal className="w-4 h-4 mr-1" />
              Bulk Actions
            </button>
            {renderBulkMenu()}
          </div>

          <button
            onClick={clearSelection}
            className="text-sm text-gray-600 hover:text-gray-900"
            disabled={isProcessing}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

// Individual item selector component
interface ItemSelectorProps {
  id: string;
  selected: boolean;
  onSelect: (id: string) => void;
  className?: string;
}

export function ItemSelector({ id, selected, onSelect, className = '' }: ItemSelectorProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      className={`p-1 rounded hover:bg-gray-100 transition-colors ${className}`}
    >
      {selected ? (
        <CheckSquare className="w-4 h-4 text-blue-600" />
      ) : (
        <Square className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );
}