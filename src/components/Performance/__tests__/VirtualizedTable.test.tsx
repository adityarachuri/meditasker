import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualizedTable, MemoizedVirtualizedTable } from '../VirtualizedTable';

interface Row {
  id: string;
  name: string;
  status: string;
}

const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({
  id: `row-${i}`,
  name: `Row ${i}`,
  status: i % 2 === 0 ? 'active' : '',
}));

const columns = [
  { key: 'name' as const, header: 'Name', width: 150 },
  {
    key: 'status' as const,
    header: 'Status',
    width: 100,
    render: (value: string) => <span data-testid="status-cell">{value || 'none'}</span>,
  },
];

describe('VirtualizedTable', () => {
  it('renders the header and visible rows', () => {
    render(
      <VirtualizedTable data={rows} columns={columns} height={400} rowHeight={40} />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Row 0')).toBeInTheDocument();
  });

  it('renders a column without a custom render function using the raw value', () => {
    render(
      <VirtualizedTable data={rows} columns={columns} height={400} rowHeight={40} />
    );

    expect(screen.getByText('Row 0')).toBeInTheDocument();
  });

  it('uses the custom render function for a column that defines one', () => {
    render(
      <VirtualizedTable data={rows} columns={columns} height={400} rowHeight={40} />
    );

    expect(screen.getAllByTestId('status-cell').length).toBeGreaterThan(0);
  });

  it('falls back to an empty string for a falsy raw value with no render function', () => {
    const sparseRows = [{ id: 'r1', name: '', status: 'x' }];
    render(
      <VirtualizedTable data={sparseRows} columns={[columns[0]]} height={200} rowHeight={40} />
    );

    // No crash and no literal "null"/"undefined" text rendered for the empty name.
    expect(screen.queryByText('null')).not.toBeInTheDocument();
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
  });

  it('calls onRowClick with the clicked item and index', () => {
    const onRowClick = jest.fn();
    render(
      <VirtualizedTable data={rows} columns={columns} height={400} rowHeight={40} onRowClick={onRowClick} />
    );

    fireEvent.click(screen.getByText('Row 0'));

    expect(onRowClick).toHaveBeenCalledWith(rows[0], 0);
  });

  it('shows a loading placeholder row when hasMore extends past the data', () => {
    const { container } = render(
      <VirtualizedTable
        data={rows}
        columns={columns}
        height={1000}
        rowHeight={40}
        hasMore={true}
      />
    );

    // With hasMore, itemCount = data.length + 1, so one extra row renders
    // with no backing item - it shows a spinner instead of cell content.
    expect(container.querySelectorAll('.animate-spin').length).toBeGreaterThan(0);
  });

  it('shows the "loading more" footer message when loading is true', () => {
    render(
      <VirtualizedTable data={rows} columns={columns} height={400} rowHeight={40} loading={true} />
    );

    expect(screen.getByText(/Loading more data/)).toBeInTheDocument();
  });

  it('calls onLoadMore once a row near the end of the loaded data renders, when hasMore and not loading', () => {
    const onLoadMore = jest.fn();
    render(
      <VirtualizedTable
        data={rows}
        columns={columns}
        height={1000}
        rowHeight={40}
        hasMore={true}
        loading={false}
        optimizeForLargeDatasets={false}
        onLoadMore={onLoadMore}
      />
    );

    expect(onLoadMore).toHaveBeenCalled();
  });

  it('does not call onLoadMore while already loading', () => {
    const onLoadMore = jest.fn();
    render(
      <VirtualizedTable
        data={rows}
        columns={columns}
        height={1000}
        rowHeight={40}
        hasMore={true}
        loading={true}
        onLoadMore={onLoadMore}
      />
    );

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not call onLoadMore when hasMore is false', () => {
    const onLoadMore = jest.fn();
    render(
      <VirtualizedTable
        data={rows}
        columns={columns}
        height={1000}
        rowHeight={40}
        hasMore={false}
        onLoadMore={onLoadMore}
      />
    );

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('applies a custom className', () => {
    const { container } = render(
      <VirtualizedTable data={rows} columns={columns} height={400} rowHeight={40} className="my-table" />
    );

    expect(container.querySelector('.virtualized-table.my-table')).toBeInTheDocument();
  });

  it('MemoizedVirtualizedTable renders the same way as VirtualizedTable', () => {
    render(
      <MemoizedVirtualizedTable data={rows} columns={columns} height={400} rowHeight={40} />
    );

    expect(screen.getByText('Row 0')).toBeInTheDocument();
  });
});
