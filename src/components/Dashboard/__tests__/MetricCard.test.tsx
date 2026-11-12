import { render, screen } from '@testing-library/react';
import { FolderOpen } from 'lucide-react';
import { MetricCard } from '../MetricCard';

describe('MetricCard', () => {
  it('renders title, value, and icon without a trend', () => {
    render(<MetricCard title="Total Projects" value={4} icon={FolderOpen} color="bg-blue-500" />);

    expect(screen.getByText('Total Projects')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders a positive trend with a plus sign', () => {
    render(
      <MetricCard
        title="Active Projects"
        value={2}
        icon={FolderOpen}
        color="bg-green-500"
        trend={{ value: 12, isPositive: true }}
      />
    );

    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('renders a negative trend without a plus sign', () => {
    render(
      <MetricCard
        title="Completed Tasks"
        value={1}
        icon={FolderOpen}
        color="bg-orange-500"
        trend={{ value: 5, isPositive: false }}
      />
    );

    expect(screen.getByText('5%')).toBeInTheDocument();
  });

  it('accepts a string value', () => {
    render(<MetricCard title="Status" value="OK" icon={FolderOpen} color="bg-blue-500" />);

    expect(screen.getByText('OK')).toBeInTheDocument();
  });
});
