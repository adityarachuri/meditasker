import { render, act } from '@testing-library/react';
import { useInfiniteScroll } from '../useInfiniteScroll';

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

let capturedCallback: ObserverCallback | null = null;
let observeSpy: jest.Mock;
let disconnectSpy: jest.Mock;

class MockIntersectionObserver {
  constructor(callback: ObserverCallback) {
    capturedCallback = callback;
  }
  observe = observeSpy;
  unobserve = jest.fn();
  disconnect = disconnectSpy;
  takeRecords = () => [];
}

function fireIntersection(isIntersecting: boolean) {
  act(() => {
    capturedCallback?.([{ isIntersecting } as IntersectionObserverEntry]);
  });
}

interface TestComponentProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

function TestComponent({ hasNextPage, isFetchingNextPage, fetchNextPage }: TestComponentProps) {
  const { loadMoreRef } = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });
  return <div ref={loadMoreRef} data-testid="sentinel" />;
}

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    capturedCallback = null;
    observeSpy = jest.fn();
    disconnectSpy = jest.fn();
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver;
  });

  it('observes the load-more element once attached to the DOM', () => {
    render(<TestComponent hasNextPage isFetchingNextPage={false} fetchNextPage={jest.fn()} />);

    expect(observeSpy).toHaveBeenCalled();
  });

  it('calls fetchNextPage when the sentinel intersects and more pages are available', () => {
    const fetchNextPage = jest.fn();
    render(<TestComponent hasNextPage isFetchingNextPage={false} fetchNextPage={fetchNextPage} />);

    fireIntersection(true);

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('does not call fetchNextPage when there is no next page', () => {
    const fetchNextPage = jest.fn();
    render(<TestComponent hasNextPage={false} isFetchingNextPage={false} fetchNextPage={fetchNextPage} />);

    fireIntersection(true);

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('does not call fetchNextPage while already fetching the next page', () => {
    const fetchNextPage = jest.fn();
    render(<TestComponent hasNextPage isFetchingNextPage fetchNextPage={fetchNextPage} />);

    fireIntersection(true);

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('does not call fetchNextPage when the sentinel is not intersecting', () => {
    const fetchNextPage = jest.fn();
    render(<TestComponent hasNextPage isFetchingNextPage={false} fetchNextPage={fetchNextPage} />);

    fireIntersection(false);

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(
      <TestComponent hasNextPage isFetchingNextPage={false} fetchNextPage={jest.fn()} />
    );

    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
  });
});
