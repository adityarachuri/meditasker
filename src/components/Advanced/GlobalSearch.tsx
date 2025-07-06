import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Clock, User, FolderOpen, CheckSquare, Filter } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { databaseService } from '../../services/databaseService';
import { User as UserType, Project, Task } from '../../types';

interface SearchResult {
  users: UserType[];
  projects: Project[];
  tasks: Task[];
  total: number;
}

interface GlobalSearchProps {
  onClose?: () => void;
  className?: string;
}

export function GlobalSearch({ onClose, className = '' }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'users' | 'projects' | 'tasks'>('all');

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recent_searches', JSON.stringify(updated));
  }, [recentSearches]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const searchResults = await databaseService.searchGlobal(searchQuery, 50);
      setResults(searchResults);
      saveRecentSearch(searchQuery);
    } catch (error) {
      console.error('Search failed:', error);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [saveRecentSearch]);

  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  const handleClearSearch = () => {
    setQuery('');
    setResults(null);
  };

  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery);
  };

  const getFilteredResults = () => {
    if (!results) return null;

    switch (selectedCategory) {
      case 'users':
        return { ...results, projects: [], tasks: [], total: results.users.length };
      case 'projects':
        return { ...results, users: [], tasks: [], total: results.projects.length };
      case 'tasks':
        return { ...results, users: [], projects: [], total: results.tasks.length };
      default:
        return results;
    }
  };

  const filteredResults = getFilteredResults();

  return (
    <div className={`global-search ${className}`}>
      <div className="relative">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all data (1M+ records)..."
            className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            autoFocus
          />
          {query && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2 mt-3">
          <Filter className="w-4 h-4 text-gray-400" />
          {['all', 'users', 'projects', 'tasks'].map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category as any)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600">Searching 1M+ records...</span>
            </div>
          </div>
        )}

        {/* Search Results */}
        {!loading && filteredResults && query && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">
                  Search Results ({filteredResults.total})
                </h3>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Users */}
              {filteredResults.users.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    Users ({filteredResults.users.length})
                  </h4>
                  <div className="space-y-2">
                    {filteredResults.users.slice(0, 5).map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email} • {user.department}</div>
                        </div>
                        <span className="text-xs text-gray-400">{user.role}</span>
                      </div>
                    ))}
                    {filteredResults.users.length > 5 && (
                      <div className="text-xs text-gray-500 text-center py-2">
                        +{filteredResults.users.length - 5} more users
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Projects */}
              {filteredResults.projects.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center">
                    <FolderOpen className="w-3 h-3 mr-1" />
                    Projects ({filteredResults.projects.length})
                  </h4>
                  <div className="space-y-2">
                    {filteredResults.projects.slice(0, 5).map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <div
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: project.color }}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{project.name}</div>
                          <div className="text-xs text-gray-500 truncate">{project.description}</div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            project.status === 'active' ? 'bg-green-100 text-green-800' :
                            project.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {project.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {filteredResults.projects.length > 5 && (
                      <div className="text-xs text-gray-500 text-center py-2">
                        +{filteredResults.projects.length - 5} more projects
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {filteredResults.tasks.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center">
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Tasks ({filteredResults.tasks.length})
                  </h4>
                  <div className="space-y-2">
                    {filteredResults.tasks.slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          task.priority === 'critical' ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-orange-500' :
                          task.priority === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                          <div className="text-xs text-gray-500 truncate">{task.description}</div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            task.status === 'blocked' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {filteredResults.tasks.length > 5 && (
                      <div className="text-xs text-gray-500 text-center py-2">
                        +{filteredResults.tasks.length - 5} more tasks
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No Results */}
              {filteredResults.total === 0 && (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No results found for "{query}"</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Searched across {databaseService.getMemoryUsage().users + databaseService.getMemoryUsage().projects + databaseService.getMemoryUsage().tasks} records
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Searches */}
        {!query && recentSearches.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Recent Searches
              </h3>
              <div className="space-y-1">
                {recentSearches.map((recentQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(recentQuery)}
                    className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                  >
                    {recentQuery}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}