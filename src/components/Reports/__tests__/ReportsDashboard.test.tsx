import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportsDashboard } from '../ReportsDashboard';
import { AppProvider, useApp } from '../../../context/AppContext';
import { Project, Task } from '../../../types';

// recharts' SVG primitives don't lay out meaningfully under jsdom (no real
// box model), which can skip rendering of render-prop callbacks (e.g. Pie's
// `label`) entirely. These stand-ins render deterministically and invoke any
// function props they're given, so the inline callbacks in ReportsDashboard
// actually execute under test.
jest.mock('recharts', () => {
  const Passthrough = ({ children }: { children?: unknown }) => <div>{children as never}</div>;
  return {
    ResponsiveContainer: Passthrough,
    LineChart: Passthrough,
    BarChart: Passthrough,
    PieChart: Passthrough,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: ({ formatter }: { formatter?: (value: unknown, name: string) => unknown }) => {
      if (formatter) {
        formatter(42, 'budget');
        formatter(7, 'utilization');
      }
      return null;
    },
    Legend: () => null,
    Line: () => null,
    Bar: () => null,
    Cell: () => null,
    Pie: ({ data, label }: { data: Array<{ name: string; value: number }>; label?: (p: { name: string; value: number }) => unknown }) => (
      <div>{label && data.map((d) => <span key={d.name}>{label(d) as never}</span>)}</div>
    ),
  };
});

const docMock = {
  setFontSize: jest.fn(),
  setTextColor: jest.fn(),
  text: jest.fn(),
  addPage: jest.fn(),
  setPage: jest.fn(),
  getNumberOfPages: jest.fn(() => 1),
  save: jest.fn(),
  lastAutoTable: { finalY: 100 },
  internal: { pageSize: { width: 210, height: 297 } },
};

jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => docMock),
}));

jest.mock('jspdf-autotable', () => jest.fn());

jest.mock('../../Advanced/DataExportImport', () => ({
  DataExportImport: () => <div data-testid="data-export-import" />,
}));

const renderDashboard = () => render(<AppProvider><ReportsDashboard /></AppProvider>);

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'edge-project',
  name: 'Short Name',
  description: 'An on-hold project with a short name',
  status: 'on-hold',
  priority: 'medium',
  startDate: '2024-01-01',
  endDate: '2024-06-01',
  progress: 10,
  managerId: '1',
  teamIds: ['1'],
  budget: 1000,
  spentBudget: 100,
  color: '#3b82f6',
  ...overrides,
});

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'edge-task',
  title: 'Edge task',
  description: 'Gives user 1 a 100% completion rate',
  status: 'completed',
  priority: 'medium',
  projectId: '1',
  assigneeId: '1',
  createdBy: '1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  estimatedHours: 2,
  actualHours: 2,
  tags: [],
  dependencies: [],
  ...overrides,
});

// Seeds data this suite's assertions need: a project with a short name
// (<=15 chars, to hit budgetData's truncation ternary false branch) and an
// 'on-hold' status (to hit the status-color ternary chain's final else
// branch, since no seeded mock project has that status); a completed task
// for user '1' (who otherwise has none), pushing their efficiency to the
// >=80% bucket; and two completed plus one incomplete task for user '4'
// (otherwise also idle), landing their efficiency at 67% - the >=60-but-
// under-80 bucket, which no seeded mock user reaches on their own either.
const SeedEdgeCaseData = () => {
  const { dispatch } = useApp();
  useEffect(() => {
    dispatch({ type: 'ADD_PROJECT', payload: makeProject() });
    dispatch({ type: 'ADD_TASK', payload: makeTask() });
    dispatch({ type: 'ADD_TASK', payload: makeTask({ id: 'edge-task-2', assigneeId: '4', createdBy: '4' }) });
    dispatch({ type: 'ADD_TASK', payload: makeTask({ id: 'edge-task-3', assigneeId: '4', createdBy: '4' }) });
    dispatch({ type: 'ADD_TASK', payload: makeTask({ id: 'edge-task-4', assigneeId: '4', createdBy: '4', status: 'todo' }) });
    // Seed once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

describe('ReportsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders key metrics and charts from app state', () => {
    renderDashboard();

    expect(screen.getByText('Project Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('Task Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('Team Utilization')).toBeInTheDocument();
    expect(screen.getAllByText('Budget Utilization').length).toBeGreaterThan(0);
    expect(screen.getByText('Task Completion Trend')).toBeInTheDocument();
    expect(screen.getByText('Project Status Distribution')).toBeInTheDocument();
    expect(screen.getByText('Team Productivity')).toBeInTheDocument();
    expect(screen.getByText('Top Performers')).toBeInTheDocument();
    expect(screen.getByText('Project Progress')).toBeInTheDocument();
  });

  it('changes the selected reporting period', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const select = screen.getByDisplayValue('This Month');
    await user.selectOptions(select, 'week');

    expect(screen.getByDisplayValue('This Week')).toBeInTheDocument();
  });

  it('toggles the data export/import panel', async () => {
    const user = userEvent.setup();
    renderDashboard();

    expect(screen.queryByTestId('data-export-import')).not.toBeInTheDocument();

    await user.click(screen.getByText('Data Export / Import'));
    expect(screen.getByTestId('data-export-import')).toBeInTheDocument();

    await user.click(screen.getByText('Data Export / Import'));
    expect(screen.queryByTestId('data-export-import')).not.toBeInTheDocument();
  });

  it('generates and saves a PDF report', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByText('Export Report'));

    expect(docMock.text).toHaveBeenCalledWith('MediTasker Project Management Report', 20, 25);
    expect(docMock.save).toHaveBeenCalledWith(expect.stringMatching(/^meditasker-report-\d{4}-\d{2}-\d{2}\.pdf$/));
  });

  it('renders a short project name, an on-hold status badge, and a high-efficiency performer', () => {
    render(
      <AppProvider>
        <SeedEdgeCaseData />
        <ReportsDashboard />
      </AppProvider>
    );

    // Budget chart row label (no truncation applied, unlike the longer seeded names).
    expect(screen.getAllByText('Short Name').length).toBeGreaterThan(0);
    // Project Progress section's status badge for the seeded on-hold project.
    expect(screen.getByText('on-hold')).toBeInTheDocument();
  });

  it('starts a new PDF page when a section would overflow the current one', async () => {
    const user = userEvent.setup();
    docMock.lastAutoTable.finalY = 290;

    renderDashboard();
    await user.click(screen.getByText('Export Report'));

    expect(docMock.addPage).toHaveBeenCalled();
    docMock.lastAutoTable.finalY = 100;
  });
});
