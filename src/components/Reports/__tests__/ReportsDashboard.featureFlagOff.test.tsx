import { render, screen } from '@testing-library/react';
import { ReportsDashboard } from '../ReportsDashboard';
import { AppProvider } from '../../../context/AppContext';

// Static, hoisted mock in its own file so the flag is off for every test
// here without disturbing the default-on behavior tested elsewhere.
jest.mock('../../../config/featureFlags', () => ({
  featureFlags: { enableDataExport: false },
}));

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
    Tooltip: () => null,
    Legend: () => null,
    Line: () => null,
    Bar: () => null,
    Cell: () => null,
    Pie: ({ children }: { children?: unknown }) => <div>{children as never}</div>,
  };
});

jest.mock('jspdf', () => ({ jsPDF: jest.fn() }));
jest.mock('jspdf-autotable', () => jest.fn());

describe('ReportsDashboard with enableDataExport off', () => {
  it('does not render the data export/import toggle', () => {
    render(<AppProvider><ReportsDashboard /></AppProvider>);

    expect(screen.queryByText('Data Export / Import')).not.toBeInTheDocument();
  });
});
