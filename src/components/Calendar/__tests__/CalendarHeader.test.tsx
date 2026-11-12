import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarHeader } from '../CalendarHeader';
import { CalendarView } from '../../../types/calendar';

const baseProps = {
  onViewTypeChange: jest.fn(),
  onNavigatePrevious: jest.fn(),
  onNavigateNext: jest.fn(),
  onNavigateToday: jest.fn(),
  onNavigateToDate: jest.fn(),
};

const makeView = (type: CalendarView['type'], date: Date): CalendarView => ({ type, date });

describe('CalendarHeader', () => {
  beforeEach(() => jest.clearAllMocks());

  it('formats the title for a day view', () => {
    render(<CalendarHeader {...baseProps} view={makeView('day', new Date('2024-06-10'))} />);
    expect(screen.getByRole('heading')).toHaveTextContent('2024');
  });

  it('formats the title for a month view', () => {
    render(<CalendarHeader {...baseProps} view={makeView('month', new Date('2024-06-10'))} />);
    expect(screen.getByRole('heading')).toHaveTextContent('June 2024');
  });

  it('formats the title for an agenda view', () => {
    render(<CalendarHeader {...baseProps} view={makeView('agenda', new Date('2024-06-10'))} />);
    expect(screen.getByRole('heading')).toHaveTextContent('Agenda -');
  });

  it('formats a week title within a single month', () => {
    // 2024-06-10 is a Monday; its week (Sun 6/9 - Sat 6/15) stays within June.
    render(<CalendarHeader {...baseProps} view={makeView('week', new Date('2024-06-10'))} />);
    expect(screen.getByRole('heading')).toHaveTextContent('June 9-15, 2024');
  });

  it('formats a week title that spans two months', () => {
    // 2024-05-30 is a Thursday; its week (Sun 5/26 - Sat 6/1) spans May into June.
    render(<CalendarHeader {...baseProps} view={makeView('week', new Date('2024-05-30'))} />);
    expect(screen.getByRole('heading')).toHaveTextContent('May 26 - Jun 1, 2024');
  });

  it('falls back to a plain locale date string for an unrecognized view type', () => {
    const view = { type: 'unknown' as unknown as CalendarView['type'], date: new Date('2024-06-10') };
    render(<CalendarHeader {...baseProps} view={view} />);
    expect(screen.getByRole('heading')).not.toBeEmptyDOMElement();
  });

  it('calls navigation callbacks', () => {
    render(<CalendarHeader {...baseProps} view={makeView('month', new Date('2024-06-10'))} />);

    fireEvent.click(screen.getByLabelText('Previous'));
    expect(baseProps.onNavigatePrevious).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Next'));
    expect(baseProps.onNavigateNext).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Today'));
    expect(baseProps.onNavigateToday).toHaveBeenCalled();
  });

  it('calls onViewTypeChange for each view button and highlights the active one', () => {
    render(<CalendarHeader {...baseProps} view={makeView('month', new Date('2024-06-10'))} />);

    fireEvent.click(screen.getByText('Week'));
    expect(baseProps.onViewTypeChange).toHaveBeenCalledWith('week');

    expect(screen.getByText('Month').className).toContain('bg-white');
    expect(screen.getByText('Week').className).not.toContain('bg-white');
  });

  it('calls onNavigateToDate when the date picker changes', () => {
    render(<CalendarHeader {...baseProps} view={makeView('month', new Date('2024-06-10'))} />);

    const datePicker = screen.getByDisplayValue('2024-06-10');
    fireEvent.change(datePicker, { target: { value: '2024-07-04' } });

    expect(baseProps.onNavigateToDate).toHaveBeenCalledWith(new Date('2024-07-04'));
  });
});
