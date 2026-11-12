import { render, screen, act } from '@testing-library/react';
import { DataInitializer } from '../DataInitializer';
import { databaseService } from '../../../services/databaseService';
import { mockDataGenerator } from '../../../data/mockDataGenerator';

jest.mock('../../../services/databaseService', () => ({
  databaseService: {
    loadUsers: jest.fn().mockResolvedValue(undefined),
    loadProjects: jest.fn().mockResolvedValue(undefined),
    loadTasks: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../data/mockDataGenerator', () => ({
  mockDataGenerator: {
    generateUsers: jest.fn().mockReturnValue([]),
    generateProjects: jest.fn().mockReturnValue([]),
    generateTasks: jest.fn().mockReturnValue([]),
  },
}));

// The component's steps are chained behind real setTimeout delays (800 +
// 600 + 700 + 900 + 500 = 3500ms total); fake timers make the whole flow
// deterministic and fast instead of waiting on the wall clock.
describe('DataInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the initialization UI with a starting progress of 0%', () => {
    render(<DataInitializer onInitialized={jest.fn()} />);

    expect(screen.getByText('Initializing Application')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('Initializing database connection')).toBeInTheDocument();
    expect(screen.getByText('Loading user data')).toBeInTheDocument();
    expect(screen.getByText('Loading projects')).toBeInTheDocument();
    expect(screen.getByText('Loading tasks')).toBeInTheDocument();
  });

  it('runs through every step, loads data via the generator and database service, and calls onInitialized', async () => {
    const onInitialized = jest.fn();
    render(<DataInitializer onInitialized={onInitialized} />);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(3500);
    });

    expect(mockDataGenerator.generateUsers).toHaveBeenCalledWith(50);
    expect(mockDataGenerator.generateProjects).toHaveBeenCalledWith(25);
    expect(mockDataGenerator.generateTasks).toHaveBeenCalledWith(100);
    expect(databaseService.loadUsers).toHaveBeenCalled();
    expect(databaseService.loadProjects).toHaveBeenCalled();
    expect(databaseService.loadTasks).toHaveBeenCalled();
    expect(onInitialized).toHaveBeenCalled();
  });

  it('progresses through 25/50/75/100% as each step completes', async () => {
    render(<DataInitializer onInitialized={jest.fn()} />);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(800);
    });
    expect(screen.getByText('25%')).toBeInTheDocument();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(600);
    });
    expect(screen.getByText('50%')).toBeInTheDocument();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(700);
    });
    expect(screen.getByText('75%')).toBeInTheDocument();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(900);
    });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('logs an error and does not call onInitialized if a step throws', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (databaseService.loadUsers as jest.Mock).mockRejectedValueOnce(new Error('load failed'));
    const onInitialized = jest.fn();

    render(<DataInitializer onInitialized={onInitialized} />);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(3500);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Data initialization failed:', expect.any(Error));
    expect(onInitialized).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
