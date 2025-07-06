import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  Calendar, 
  User, 
  Tag, 
  Star,
  Clock,
  AlertCircle,
  ChevronDown,
  Save,
  History
} from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { useGlobalStore } from '../../store/globalStore';

interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  value: any;
  label: string;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilter[];
  type: 'tasks' | 'projects' | 'users';
  createdAt: string;
}

interface AdvancedSearchProps {
  type: 'tasks' | 'projects' | 'users';
  onSearch: (query: string, filters: SearchFilter[]) => void;
  placeholder?: string;
  className?: string;
}

export function AdvancedSearch({ 
  type, 
  onSearch, 
  placeholder = 'Search...', 
  className = '' 
}: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const debouncedQuery = useDebounce(query, 300);
  const { users, projects } = useGlobalStore();

  // Load saved searches and history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`savedSearches_${type}`);
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }

    const history = localStorage.getItem(`searchHistory_${type}`);
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, [type]);

  // Trigger search when query or filters change
  useEffect(() => {
    onSearch(debouncedQuery, filters);
    
    // Add to search history if query is not empty
    if (debouncedQuery.trim() && !searchHistory.includes(debouncedQuery)) {
      const newHistory = [debouncedQuery, ...searchHistory.slice(0, 9)]; // Keep last 10
      setSearchHistory(newHistory);
      localStorage.setItem(`searchHistory_${type}`, JSON.stringify(newHistory));
    }
  }, [debouncedQuery, filters, onSearch, type]);

  const filterOptions = useMemo(() => {
    const baseOptions = [
      { field: 'status', label: 'Status', type: 'select' },
      { field: 'priority', label: 'Priority', type: 'select' },
      { field: 'createdAt', label: 'Created Date', type: 'date' },
      { field: 'updatedAt', label: 'Updated Date', type: 'date' },
    ];

    if (type === 'tasks') {
      return [
        ...baseOptions,
        { field: 'assigneeId', label: 'Assignee', type: 'user' },
        { field: 'projectId', label: 'Project', type: 'project' },
        { field: 'dueDate', label: 'Due Date', type: 'date' },
        { field: 'tags', label: 'Tags', type: 'tags' },
        { field: 'estimatedHours', label: 'Estimated Hours', type: 'number' },
        { field: 'actualHours', label: 'Actual Hours', type: 'number' },
      ];
    } else if (type === 'projects') {
      return [
        ...baseOptions,
        { field: 'managerId', label: 'Manager', type: 'user' },
        { field: 'teamIds', label: 'Team Members', type: 'user' },
        { field: 'budget', label: 'Budget', type: 'number' },
        { field: 'progress', label: 'Progress', type: 'number' },
        { field: 'startDate', label: 'Start Date', type: 'date' },
        { field: 'endDate', label: 'End Date', type: 'date' },
      ];
    } else {
      return [
        { field: 'role', label: 'Role', type: 'select' },
        { field: 'department', label: 'Department', type: 'text' },
        { field: 'isActive', label: 'Active Status', type: 'boolean' },
        { field: 'joinDate', label: 'Join Date', type: 'date' },
      ];
    }
  }, [type]);

  const addFilter = (field: string, label: string) => {
    const newFilter: SearchFilter = {
      field,
      operator: 'equals',
      value: '',
      label,
    };
    setFilters([...filters, newFilter]);
  };

  const updateFilter = (index: number, updates: Partial<SearchFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const clearAllFilters = () => {
    setFilters([]);
    setQuery('');
  };

  const saveSearch = () => {
    const name = prompt('Enter a name for this search:');
    if (!name) return;

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      query,
      filters,
      type,
      createdAt: new Date().toISOString(),
    };

    const newSavedSearches = [newSearch, ...savedSearches];
    setSavedSearches(newSavedSearches);
    localStorage.setItem(`savedSearches_${type}`, JSON.stringify(newSavedSearches));
  };

  const loadSavedSearch = (search: SavedSearch) => {
    setQuery(search.query);
    setFilters(search.filters);
    setShowSavedSearches(false);
  };

  const deleteSavedSearch = (id: string) => {
    const newSavedSearches = savedSearches.filter(s => s.id !== id);
    setSavedSearches(newSavedSearches);
    localStorage.setItem(`savedSearches_${type}`, JSON.stringify(newSavedSearches));
  };

  const renderFilterValue = (filter: SearchFilter, index: number) => {
    const option = filterOptions.find(opt => opt.field === filter.field);
    
    switch (option?.type) {
      case 'select':
        const selectOptions = filter.field === 'status' 
          ? (type === 'tasks' ? ['todo', 'in-progress', 'review', 'completed', 'blocked'] : ['planning', 'active', 'on-hold', 'completed', 'cancelled'])
          : filter.field === 'priority'
          ? ['low', 'medium', 'high', 'critical']
          : filter.field === 'role'
          ? ['admin', 'manager', 'developer', 'designer', 'qa']
          : [];

        return (
          <select
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select...</option>
            {selectOptions.map(option => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        );

      case 'user':
        return (
          <select
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select user...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        );

      case 'project':
        return (
          <select
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select project...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            type="date"
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter number..."
          />
        );

      case 'boolean':
        return (
          <select
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value === 'true' })}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );

      default:
        return (
          <input
            type="text"
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter value..."
          />
        );
    }
  };

  return (
    <div className={`advanced-search ${className}`}>
      {/* Main search input */}
      <div className="relative">
        <div className="flex items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`ml-2 px-3 py-2 border rounded-lg transition-colors ${
              showFilters || filters.length > 0
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSavedSearches(!showSavedSearches)}
            className="ml-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <History className="w-4 h-4" />
          </button>

          {(query || filters.length > 0) && (
            <button
              onClick={saveSearch}
              className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search history dropdown */}
        {showSavedSearches && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Saved Searches</h4>
              {savedSearches.length > 0 ? (
                <div className="space-y-1 mb-3">
                  {savedSearches.map(search => (
                    <div key={search.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <button
                        onClick={() => loadSavedSearch(search)}
                        className="flex-1 text-left text-sm text-gray-700"
                      >
                        <div className="font-medium">{search.name}</div>
                        <div className="text-xs text-gray-500">{search.query}</div>
                      </button>
                      <button
                        onClick={() => deleteSavedSearch(search.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-3">No saved searches</p>
              )}

              {searchHistory.length > 0 && (
                <>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Searches</h4>
                  <div className="space-y-1">
                    {searchHistory.map((historyQuery, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(historyQuery)}
                        className="block w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                      >
                        {historyQuery}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filters section */}
      {showFilters && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Filters</h4>
            {filters.length > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Active filters */}
          {filters.length > 0 && (
            <div className="space-y-2 mb-4">
              {filters.map((filter, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-white rounded border">
                  <span className="text-sm font-medium text-gray-700">{filter.label}</span>
                  
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(index, { operator: e.target.value as any })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="equals">equals</option>
                    <option value="contains">contains</option>
                    <option value="startsWith">starts with</option>
                    <option value="endsWith">ends with</option>
                    <option value="greaterThan">greater than</option>
                    <option value="lessThan">less than</option>
                  </select>

                  {renderFilterValue(filter, index)}

                  <button
                    onClick={() => removeFilter(index)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add filter dropdown */}
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  const option = filterOptions.find(opt => opt.field === e.target.value);
                  if (option) {
                    addFilter(option.field, option.label);
                  }
                  e.target.value = '';
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Add filter...</option>
              {filterOptions
                .filter(option => !filters.some(f => f.field === option.field))
                .map(option => (
                  <option key={option.field} value={option.field}>
                    {option.label}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* Active filter tags */}
      {filters.length > 0 && !showFilters && (
        <div className="mt-2 flex flex-wrap gap-2">
          {filters.map((filter, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
            >
              {filter.label}: {filter.value}
              <button
                onClick={() => removeFilter(index)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}