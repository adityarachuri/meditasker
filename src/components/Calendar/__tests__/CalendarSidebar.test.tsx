import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarSidebar } from '../CalendarSidebar';
import { CalendarFilter } from '../../../types/calendar';

const makeFilter = (overrides: Partial<CalendarFilter> = {}): CalendarFilter => ({
  types: [],
  priorities: [],
  statuses: [],
  attendees: [],
  projects: [],
  ...overrides,
});

const statistics = {
  totalEvents: 10,
  eventsByType: { meeting: 4 },
  eventsByStatus: { completed: 3 },
  upcomingEvents: 5,
  overdueEvents: 2,
};

const baseProps = {
  onToggle: jest.fn(),
  onFilterChange: jest.fn(),
  onClearFilter: jest.fn(),
  onSearch: jest.fn(),
  onCreateEvent: jest.fn(),
  statistics,
};

describe('CalendarSidebar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a minimal collapsed rail', () => {
    render(<CalendarSidebar {...baseProps} collapsed filter={makeFilter()} />);
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    expect(screen.getByTitle('Create Event')).toBeInTheDocument();
  });

  it('calls onToggle and onCreateEvent from the collapsed rail', () => {
    render(<CalendarSidebar {...baseProps} collapsed filter={makeFilter()} />);

    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(baseProps.onToggle).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Create Event'));
    expect(baseProps.onCreateEvent).toHaveBeenCalled();
  });

  it('renders expanded with statistics', () => {
    render(<CalendarSidebar {...baseProps} collapsed={false} filter={makeFilter()} />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('defaults a missing eventsByStatus.completed to 0', () => {
    render(
      <CalendarSidebar
        {...baseProps}
        collapsed={false}
        filter={makeFilter()}
        statistics={{ ...statistics, eventsByStatus: {} }}
      />
    );
    // Completed tile should render 0 when no completed count is present.
    const completedTile = screen.getByText('Completed').previousSibling;
    expect(completedTile?.textContent).toBe('0');
  });

  it('calls onToggle and onCreateEvent from the expanded header', () => {
    render(<CalendarSidebar {...baseProps} collapsed={false} filter={makeFilter()} />);

    fireEvent.click(screen.getByText('Create Event'));
    expect(baseProps.onCreateEvent).toHaveBeenCalled();
  });

  it('calls onSearch as the search input changes', () => {
    render(<CalendarSidebar {...baseProps} collapsed={false} filter={makeFilter()} />);

    const input = screen.getByPlaceholderText('Search events...');
    fireEvent.change(input, { target: { value: 'standup' } });

    expect(baseProps.onSearch).toHaveBeenCalledWith('standup');
    expect(input).toHaveValue('standup');
  });

  it('does not show a Clear button when no filters are active', () => {
    render(<CalendarSidebar {...baseProps} collapsed={false} filter={makeFilter()} />);
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
  });

  it('shows and calls the Clear button when a filter is active', () => {
    render(<CalendarSidebar {...baseProps} collapsed={false} filter={makeFilter({ types: ['meeting'] })} />);

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);
    expect(baseProps.onClearFilter).toHaveBeenCalled();
  });

  it('toggles the filter panel open and closed', () => {
    render(<CalendarSidebar {...baseProps} collapsed={false} filter={makeFilter()} />);

    expect(screen.queryByText('Event Types')).not.toBeInTheDocument();

    const filterToggle = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-filter'));
    fireEvent.click(filterToggle!);

    expect(screen.getByText('Event Types')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('toggles a type/priority/status checkbox on and off', () => {
    const { rerender } = render(<CalendarSidebar {...baseProps} collapsed={false} filter={makeFilter()} />);
    const filterToggle = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-filter'));
    fireEvent.click(filterToggle!);

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(baseProps.onFilterChange).toHaveBeenCalledWith({ types: ['task'] });

    // Re-render with that type already selected, to exercise the removal branch.
    rerender(<CalendarSidebar {...baseProps} collapsed={false} filter={makeFilter({ types: ['task'] })} />);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(baseProps.onFilterChange).toHaveBeenCalledWith({ types: [] });

    fireEvent.click(screen.getAllByRole('checkbox')[6]); // first priority checkbox
    expect(baseProps.onFilterChange).toHaveBeenCalledWith({ priorities: ['critical'] });

    fireEvent.click(screen.getAllByRole('checkbox')[10]); // first status checkbox
    expect(baseProps.onFilterChange).toHaveBeenCalledWith({ statuses: ['scheduled'] });
  });
});
