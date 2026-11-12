import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useGlobalStore } from '../../store/globalStore';
import { ProjectCard } from './ProjectCard';
import { ProjectModal } from './ProjectModal';
import { AdvancedSearch } from '../Advanced/AdvancedSearch';
import { BulkOperations, ItemSelector } from '../Advanced/BulkOperations';
import { featureFlags } from '../../config/featureFlags';
import { Project } from '../../types';

interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  value: string | boolean;
  label: string;
}

function matchesAdvancedFilter(project: Project, filter: SearchFilter): boolean {
  const value = project[filter.field as keyof Project];
  /* istanbul ignore next -- every field offered by AdvancedSearch's filter
     picker for projects (status, priority, dates, managerId, teamIds,
     budget, progress) is a required Project field, so this can never
     actually be undefined/null at runtime. */
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

export function ProjectList() {
  const { state, dispatch } = useApp();
  const { selectedItems, selectItem, deselectItem } = useGlobalStore();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilter[]>([]);

  const filteredProjects = state.projects.filter(project => {
    const matchesFilter = filter === 'all' || project.status === filter;
    const matchesSearch = !searchQuery ||
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAdvanced = advancedFilters.every(f => matchesAdvancedFilter(project, f));
    return matchesFilter && matchesSearch && matchesAdvanced;
  });

  const statusOptions = [
    { value: 'all', label: 'All Projects' },
    { value: 'active', label: 'Active' },
    { value: 'planning', label: 'Planning' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
  ];

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProject(null);
  };

  const handleBulkUpdate = async (updates: Array<{ id: string; updates: Record<string, unknown> }>) => {
    updates.forEach(({ id, updates: projectUpdates }) => {
      const project = state.projects.find(p => p.id === id);
      if (project) {
        dispatch({ type: 'UPDATE_PROJECT', payload: { ...project, ...projectUpdates } });
      }
    });
  };

  const handleBulkDelete = async (ids: string[]) => {
    ids.forEach(id => dispatch({ type: 'DELETE_PROJECT', payload: id }));
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
                type="projects"
                placeholder="Search projects..."
                onSearch={(query, filters) => {
                  setSearchQuery(query);
                  setAdvancedFilters(filters);
                }}
              />
            </div>
          ) : (
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          )}
        </div>
        <div className="text-sm text-gray-600">
          {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
        </div>
      </div>

      {featureFlags.enableBulkOperations && (
        <BulkOperations
          type="projects"
          items={filteredProjects}
          onBulkUpdate={handleBulkUpdate}
          onBulkDelete={handleBulkDelete}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <div key={project.id} className="relative">
            {featureFlags.enableBulkOperations && (
              <div className="absolute top-2 right-2 z-10">
                <ItemSelector
                  id={project.id}
                  selected={selectedItems.has(project.id)}
                  onSelect={(id) => (selectedItems.has(id) ? deselectItem(id) : selectItem(id))}
                  className="bg-white shadow-sm"
                />
              </div>
            )}
            <ProjectCard
              project={project}
              onClick={() => handleProjectClick(project)}
            />
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No projects found matching your criteria.</p>
        </div>
      )}

      {showModal && selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
