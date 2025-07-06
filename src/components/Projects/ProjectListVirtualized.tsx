import React, { useState, useMemo } from 'react';
import { Project } from '../../types';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { MemoizedVirtualizedTable } from '../Performance/VirtualizedTable';
import { Calendar, Users, DollarSign, Search, Filter } from 'lucide-react';

export function ProjectListVirtualized() {
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: ''
  });

  const {
    data: projects,
    loading,
    hasMore,
    total,
    loadMore,
    search
  } = usePaginatedData<Project>('projects', {
    pageSize: 100,
    filters
  });

  const columns = useMemo(() => [
    {
      key: 'name' as keyof Project,
      header: 'Project Name',
      width: 250,
      render: (value: string, project: Project) => (
        <div className="flex items-center">
          <div
            className="w-3 h-3 rounded-full mr-3"
            style={{ backgroundColor: project.color }}
          />
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 truncate max-w-[200px]">
              {project.description}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'status' as keyof Project,
      header: 'Status',
      width: 120,
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value === 'active' ? 'bg-green-100 text-green-800' :
          value === 'planning' ? 'bg-blue-100 text-blue-800' :
          value === 'completed' ? 'bg-gray-100 text-gray-800' :
          value === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      key: 'priority' as keyof Project,
      header: 'Priority',
      width: 100,
      render: (value: string) => (
        <span className={`text-sm font-medium ${
          value === 'critical' ? 'text-red-600' :
          value === 'high' ? 'text-orange-600' :
          value === 'medium' ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      key: 'progress' as keyof Project,
      header: 'Progress',
      width: 120,
      render: (value: number) => (
        <div className="flex items-center">
          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">{value}%</span>
        </div>
      )
    },
    {
      key: 'endDate' as keyof Project,
      header: 'Due Date',
      width: 120,
      render: (value: string) => (
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-1" />
          {new Date(value).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'teamIds' as keyof Project,
      header: 'Team Size',
      width: 100,
      render: (value: string[]) => (
        <div className="flex items-center text-sm text-gray-600">
          <Users className="w-4 h-4 mr-1" />
          {value.length}
        </div>
      )
    },
    {
      key: 'budget' as keyof Project,
      header: 'Budget',
      width: 120,
      render: (value: number, project: Project) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            ${value.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">
            ${project.spentBudget.toLocaleString()} spent
          </div>
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

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search projects..."
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
            <option value="active">Active</option>
            <option value="planning">Planning</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
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
        </div>

        <div className="text-sm text-gray-600">
          {total.toLocaleString()} projects total
        </div>
      </div>

      {/* Virtualized table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <MemoizedVirtualizedTable
          data={projects}
          columns={columns}
          height={600}
          rowHeight={80}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onRowClick={(project) => {
            console.log('Project clicked:', project.name);
            // Handle project click - could open modal or navigate
          }}
        />
      </div>

      {projects.length === 0 && !loading && (
        <div className="text-center py-12">
          <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No projects found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}