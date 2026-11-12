import { render, screen, act } from '@testing-library/react';
import { ProjectProgress } from '../ProjectProgress';
import { AppProvider, useApp } from '../../../context/AppContext';
import { Project } from '../../../types';

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: `p-${Math.random()}`,
  name: 'A Project',
  description: 'desc',
  status: 'active',
  priority: 'medium',
  startDate: '2024-01-01',
  endDate: '2024-06-01',
  progress: 50,
  managerId: 'u1',
  teamIds: ['u1'],
  budget: 1000,
  spentBudget: 0,
  color: '#3b82f6',
  ...overrides,
});

// Resets to a known, controlled set of projects via the real reducer rather
// than relying on (and being brittle to) the seeded mock data.
const SeedProjects = ({ projects }: { projects: Project[] }) => {
  const { state, dispatch } = useApp();
  return (
    <button
      data-testid="seed"
      onClick={() => {
        state.projects.forEach(p => dispatch({ type: 'DELETE_PROJECT', payload: p.id }));
        projects.forEach(p => dispatch({ type: 'ADD_PROJECT', payload: p }));
      }}
    >
      seed
    </button>
  );
};

const renderWithProjects = (projects: Project[]) => {
  const utils = render(
    <AppProvider>
      <SeedProjects projects={projects} />
      <ProjectProgress />
    </AppProvider>
  );
  act(() => {
    utils.getByTestId('seed').click();
  });
  return utils;
};

describe('ProjectProgress', () => {
  it('renders only active projects, with progress and priority', () => {
    renderWithProjects([
      makeProject({ id: 'p1', name: 'High Priority Active', status: 'active', priority: 'high', progress: 65 }),
      makeProject({ id: 'p2', name: 'Not Active', status: 'completed', priority: 'low' }),
    ]);

    expect(screen.getByText('High Priority Active')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.queryByText('Not Active')).not.toBeInTheDocument();
  });

  it('shows the medium-priority style for a medium-priority active project', () => {
    renderWithProjects([makeProject({ id: 'p1', priority: 'medium' })]);

    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('shows the low-priority (fallback) style for a low-priority active project', () => {
    renderWithProjects([makeProject({ id: 'p1', priority: 'low' })]);

    expect(screen.getByText('low')).toBeInTheDocument();
  });

  it('renders nothing in the list when there are no active projects', () => {
    renderWithProjects([makeProject({ id: 'p1', status: 'completed' })]);

    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    expect(screen.queryByText('A Project')).not.toBeInTheDocument();
  });
});
