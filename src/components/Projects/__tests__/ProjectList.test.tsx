import { render, screen, within, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import userEvent from '@testing-library/user-event';
import { ProjectList } from '../ProjectList';
import { AppProvider, useApp } from '../../../context/AppContext';
import { useGlobalStore } from '../../../store/globalStore';
import { featureFlags } from '../../../config/featureFlags';
import { Project } from '../../../types';

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'pl-1',
  name: 'Alpha Initiative',
  description: 'First project',
  status: 'active',
  priority: 'medium',
  startDate: '2024-01-01',
  endDate: '2024-06-01',
  progress: 10,
  managerId: '1',
  teamIds: ['1'],
  budget: 1000,
  spentBudget: 0,
  color: '#3b82f6',
  ...overrides,
});

const Seed = ({ projects }: { projects: Project[] }) => {
  const { dispatch } = useApp();
  // Dispatching must happen in an effect, not during render: dispatching
  // directly in the render body re-triggers AppProvider's render on every
  // pass, which re-renders this component and dispatches again - an
  // infinite loop that hangs the test run instead of failing it.
  useEffect(() => {
    projects.forEach(p => dispatch({ type: 'ADD_PROJECT', payload: p }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);
  return null;
};

const renderWithProjects = (projects: Project[]) =>
  render(
    <AppProvider>
      <Seed projects={projects} />
      <ProjectList />
    </AppProvider>
  );

describe('ProjectList', () => {
  const initialSelection = useGlobalStore.getState().selectedItems;
  afterEach(() => {
    useGlobalStore.setState({ selectedItems: new Set(initialSelection) });
  });

  it('renders seeded projects as cards', () => {
    renderWithProjects([makeProject({ id: 'pl-a', name: 'Alpha Initiative' })]);
    expect(screen.getByText('Alpha Initiative')).toBeInTheDocument();
  });

  it('filters by status via the dropdown', async () => {
    const user = userEvent.setup();
    renderWithProjects([
      makeProject({ id: 'pl-active', name: 'Active One', status: 'active' }),
      makeProject({ id: 'pl-done', name: 'Done One', status: 'completed' }),
    ]);

    await user.selectOptions(screen.getByDisplayValue('All Projects'), 'completed');

    expect(screen.queryByText('Active One')).not.toBeInTheDocument();
    expect(screen.getByText('Done One')).toBeInTheDocument();
  });

  it('searches via AdvancedSearch across name and description', async () => {
    const user = userEvent.setup();
    renderWithProjects([
      makeProject({ id: 'pl-x', name: 'Searchable Name', description: 'nothing special' }),
      makeProject({ id: 'pl-y', name: 'Other', description: 'unrelated' }),
    ]);

    const searchBox = screen.getByPlaceholderText('Search projects...');
    await user.type(searchBox, 'searchable');

    // AdvancedSearch debounces the query by 300ms before calling onSearch;
    // a generous timeout absorbs CPU contention under a full parallel run.
    await waitFor(() => expect(screen.queryByText('Other')).not.toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByText('Searchable Name')).toBeInTheDocument();
  });

  it('applies an advanced field filter (status equals) via the Filters panel', async () => {
    const user = userEvent.setup();
    renderWithProjects([
      makeProject({ id: 'pl-af-active', name: 'Active Field Filter', status: 'active' }),
      makeProject({ id: 'pl-af-done', name: 'Completed Field Filter', status: 'completed' }),
    ]);

    const advancedSearch = document.querySelector('.advanced-search') as HTMLElement;
    // The Filter toggle is the first icon-only button in AdvancedSearch's
    // own header (before History/Save), since no query or filter is set yet.
    await user.click(within(advancedSearch).getAllByRole('button')[0]);
    await user.selectOptions(within(advancedSearch).getByDisplayValue('Add filter...'), 'status');
    await user.selectOptions(within(advancedSearch).getByDisplayValue('Select...'), 'completed');

    await waitFor(() => {
      expect(screen.getByText('Completed Field Filter')).toBeInTheDocument();
      expect(screen.queryByText('Active Field Filter')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('applies the contains/startsWith/endsWith operators on a field filter', async () => {
    const user = userEvent.setup();
    renderWithProjects([
      makeProject({ id: 'pl-op-1', name: 'Operator One', status: 'completed' }),
      makeProject({ id: 'pl-op-2', name: 'Operator Two', status: 'active' }),
    ]);

    const advancedSearch = document.querySelector('.advanced-search') as HTMLElement;
    await user.click(within(advancedSearch).getAllByRole('button')[0]);
    await user.selectOptions(within(advancedSearch).getByDisplayValue('Add filter...'), 'status');

    const operatorSelect = within(advancedSearch).getByDisplayValue('equals');
    const valueSelect = within(advancedSearch).getByDisplayValue('Select...');

    await user.selectOptions(operatorSelect, 'contains');
    await user.selectOptions(valueSelect, 'completed');
    await waitFor(() => {
      expect(screen.getByText('Operator One')).toBeInTheDocument();
      expect(screen.queryByText('Operator Two')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    await user.selectOptions(operatorSelect, 'startsWith');
    await waitFor(() => expect(screen.getByText('Operator One')).toBeInTheDocument(), { timeout: 5000 });

    await user.selectOptions(operatorSelect, 'endsWith');
    await waitFor(() => expect(screen.getByText('Operator One')).toBeInTheDocument(), { timeout: 5000 });
  });

  it('applies the greaterThan/lessThan operators on a numeric field filter', async () => {
    const user = userEvent.setup();
    renderWithProjects([
      makeProject({ id: 'pl-num-lo', name: 'Low Budget', budget: 100 }),
      makeProject({ id: 'pl-num-hi', name: 'High Budget', budget: 100000 }),
    ]);

    const advancedSearch = document.querySelector('.advanced-search') as HTMLElement;
    await user.click(within(advancedSearch).getAllByRole('button')[0]);
    await user.selectOptions(within(advancedSearch).getByDisplayValue('Add filter...'), 'budget');

    const operatorSelect = within(advancedSearch).getByDisplayValue('equals');
    await user.selectOptions(operatorSelect, 'greaterThan');
    await user.type(within(advancedSearch).getByPlaceholderText('Enter number...'), '1000');

    await waitFor(() => {
      expect(screen.getByText('High Budget')).toBeInTheDocument();
      expect(screen.queryByText('Low Budget')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    await user.selectOptions(operatorSelect, 'lessThan');
    await waitFor(() => {
      expect(screen.getByText('Low Budget')).toBeInTheDocument();
      expect(screen.queryByText('High Budget')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('falls back to a plain search input when advanced search is disabled', async () => {
    featureFlags.enableAdvancedSearch = false;
    try {
      const user = userEvent.setup();
      renderWithProjects([
        makeProject({ id: 'pl-plain', name: 'Plain Search Target' }),
        makeProject({ id: 'pl-other', name: 'Not Matching' }),
      ]);

      const input = screen.getByPlaceholderText('Search projects...');
      await user.type(input, 'plain search');

      expect(screen.getByText('Plain Search Target')).toBeInTheDocument();
      expect(screen.queryByText('Not Matching')).not.toBeInTheDocument();
    } finally {
      featureFlags.enableAdvancedSearch = true;
    }
  });

  it('does not render bulk operations or item selectors when the feature flag is off', () => {
    featureFlags.enableBulkOperations = false;
    try {
      renderWithProjects([makeProject()]);
      expect(screen.queryByText('Select All')).not.toBeInTheDocument();
    } finally {
      featureFlags.enableBulkOperations = true;
    }
  });

  it('shows "No projects found" when nothing matches', async () => {
    const user = userEvent.setup();
    renderWithProjects([makeProject({ name: 'Only One' })]);
    await user.type(screen.getByPlaceholderText('Search projects...'), 'zzz-no-match');
    // AdvancedSearch debounces the query by 300ms before calling onSearch;
    // a generous timeout absorbs CPU contention under a full parallel run.
    await waitFor(() => {
      expect(screen.getByText('No projects found matching your criteria.')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('opens the ProjectModal on card click and closes it', async () => {
    const user = userEvent.setup();
    renderWithProjects([makeProject({ name: 'Clickable Project' })]);

    await user.click(screen.getByText('Clickable Project'));
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();

    const closeButton = within(document.body).getAllByRole('button')[0];
    // Modal renders after the page content, so grab the close (X) button by
    // finding the one inside the modal's header specifically.
    const modalClose = document.querySelector('.fixed button');
    await user.click((modalClose ?? closeButton) as HTMLElement);
    expect(screen.queryByRole('button', { name: 'Overview' })).not.toBeInTheDocument();
  });

  it('selects an item via its ItemSelector checkbox and bulk-deletes it', async () => {
    const user = userEvent.setup();
    // AppContext always seeds its own default mock projects too, so the
    // card under test must be found by name rather than assumed to be the
    // only one rendered.
    renderWithProjects([makeProject({ id: 'pl-del', name: 'Delete Me' })]);

    const card = screen.getByText('Delete Me').closest('.relative') as HTMLElement;
    const selectorButton = card.querySelector('button')!;
    await user.click(selectorButton);
    await user.click(selectorButton); // toggles back off
    expect(screen.queryByText('1 item selected')).not.toBeInTheDocument();

    await user.click(selectorButton); // re-select for the delete below
    expect(screen.getByText('1 item selected')).toBeInTheDocument();

    await user.click(screen.getByText('Bulk Actions'));
    await user.click(screen.getByText('Delete Selected'));

    expect(screen.queryByText('Delete Me')).not.toBeInTheDocument();
  });

  it('bulk-updates status for a selected item', async () => {
    const user = userEvent.setup();
    renderWithProjects([makeProject({ id: 'pl-upd', name: 'Update Me', status: 'planning' })]);

    const card = screen.getByText('Update Me').closest('.relative') as HTMLElement;
    const selectorButton = card.querySelector('button')!;
    await user.click(selectorButton);
    await user.click(screen.getByText('Bulk Actions'));

    const statusSelect = screen.getByText('Update Status').closest('div')!.querySelector('select')!;
    await user.selectOptions(statusSelect, 'completed');

    expect(await within(card).findByText('Completed')).toBeInTheDocument();
  });
});
