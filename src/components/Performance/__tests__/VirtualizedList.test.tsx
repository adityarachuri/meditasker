import { render, fireEvent } from '@testing-library/react';
import { VirtualizedList, MemoizedVirtualizedList } from '../VirtualizedList';

const items = Array.from({ length: 50 }, (_, i) => `Item ${i}`);

// jsdom doesn't perform real layout, so offsetHeight/offsetWidth are always
// 0, and @tanstack/react-virtual reads exactly those (not
// getBoundingClientRect) synchronously on mount to size its viewport -
// computing zero visible items as a result. Mocking a non-zero height here
// lets the virtualizer actually render rows, the way it would in a browser.
const withMockedViewport = (height: number, run: () => void) => {
  const heightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(height);
  const widthSpy = jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(500);
  try {
    run();
  } finally {
    heightSpy.mockRestore();
    widthSpy.mockRestore();
  }
};

describe('VirtualizedList', () => {
  it('renders visible items via renderItem', () => {
    withMockedViewport(200, () => {
      const { getByText } = render(
        <VirtualizedList
          items={items}
          itemHeight={20}
          height={200}
          renderItem={({ data }) => <span>{data}</span>}
        />
      );

      expect(getByText('Item 0')).toBeInTheDocument();
    });
  });

  it('calls onScroll with the container scrollTop', () => {
    const onScroll = jest.fn();
    const { container } = render(
      <VirtualizedList
        items={items}
        itemHeight={20}
        height={200}
        renderItem={({ data }) => <span>{data}</span>}
        onScroll={onScroll}
      />
    );

    const scrollContainer = container.querySelector('.virtualized-list')!;
    Object.defineProperty(scrollContainer, 'scrollTop', { value: 123, configurable: true });
    fireEvent.scroll(scrollContainer);

    expect(onScroll).toHaveBeenCalledWith(123);
  });

  it('does not throw when onScroll is omitted', () => {
    const { container } = render(
      <VirtualizedList
        items={items}
        itemHeight={20}
        height={200}
        renderItem={({ data }) => <span>{data}</span>}
      />
    );

    const scrollContainer = container.querySelector('.virtualized-list')!;
    expect(() => fireEvent.scroll(scrollContainer)).not.toThrow();
  });

  it('applies a custom className and width', () => {
    const { container } = render(
      <VirtualizedList
        items={items}
        itemHeight={20}
        height={200}
        width={300}
        className="my-list"
        renderItem={({ data }) => <span>{data}</span>}
      />
    );

    expect(container.querySelector('.virtualized-list.my-list')).toBeInTheDocument();
  });

  it('MemoizedVirtualizedList renders the same way as VirtualizedList', () => {
    withMockedViewport(200, () => {
      const { getByText } = render(
        <MemoizedVirtualizedList
          items={items}
          itemHeight={20}
          height={200}
          renderItem={({ data }) => <span>{data}</span>}
        />
      );

      expect(getByText('Item 0')).toBeInTheDocument();
    });
  });
});
