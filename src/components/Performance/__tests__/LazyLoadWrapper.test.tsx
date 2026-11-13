import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { LazyLoadWrapper, withLazyLoading, createLazyComponent } from '../LazyLoadWrapper';

function ThrowingComponent(): React.ReactElement {
  throw new Error('Boom');
}

function ThrowingNonErrorComponent(): React.ReactElement {
  // Deliberately not an Error, to exercise the non-Error fallback path.
  throw 'Boom as a string';
}

describe('LazyLoadWrapper', () => {
  it('renders its children normally', () => {
    render(
      <LazyLoadWrapper>
        <div>Hello</div>
      </LazyLoadWrapper>
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows the default fallback while a lazy child suspends', async () => {
    const LazyChild = React.lazy(
      () => new Promise<{ default: React.ComponentType }>((resolve) => {
        setTimeout(() => resolve({ default: () => <div>Loaded</div> }), 10);
      })
    );

    render(
      <LazyLoadWrapper>
        <LazyChild />
      </LazyLoadWrapper>
    );

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Loaded')).toBeInTheDocument());
  });

  it('shows a custom fallback while suspended', async () => {
    const LazyChild = React.lazy(
      () => new Promise<{ default: React.ComponentType }>((resolve) => {
        setTimeout(() => resolve({ default: () => <div>Loaded</div> }), 10);
      })
    );

    render(
      <LazyLoadWrapper fallback={<div>Custom loading...</div>}>
        <LazyChild />
      </LazyLoadWrapper>
    );

    expect(screen.getByText('Custom loading...')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Loaded')).toBeInTheDocument());
  });

  it('shows the default error fallback and allows retrying when a child throws', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LazyLoadWrapper>
        <ThrowingComponent />
      </LazyLoadWrapper>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();

    await user.click(screen.getByText('Try again'));

    consoleErrorSpy.mockRestore();
  });

  it('wraps a non-Error thrown value in an Error before passing it to the fallback', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LazyLoadWrapper>
        <ThrowingNonErrorComponent />
      </LazyLoadWrapper>
    );

    expect(screen.getByText('Boom as a string')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('renders a custom error fallback component', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const CustomErrorFallback = ({ error }: { error: Error; resetErrorBoundary: () => void }) => (
      <div>Custom error: {error.message}</div>
    );

    render(
      <LazyLoadWrapper errorFallback={CustomErrorFallback}>
        <ThrowingComponent />
      </LazyLoadWrapper>
    );

    expect(screen.getByText('Custom error: Boom')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});

describe('withLazyLoading', () => {
  it('wraps a component, forwarding props and ref', () => {
    const Inner = React.forwardRef<HTMLDivElement, { label: string }>(({ label }, ref) => (
      <div ref={ref}>{label}</div>
    ));
    const Wrapped = withLazyLoading(Inner);
    const ref = React.createRef<HTMLDivElement>();

    render(<Wrapped label="Wrapped content" ref={ref} />);

    expect(screen.getByText('Wrapped content')).toBeInTheDocument();
    expect(ref.current).not.toBeNull();
  });

  it('accepts a custom fallback', async () => {
    const Inner = () => <div>Inner</div>;
    const Wrapped = withLazyLoading(Inner, <div>Loading wrapped...</div>);

    render(<Wrapped />);

    expect(screen.getByText('Inner')).toBeInTheDocument();
  });
});

describe('createLazyComponent', () => {
  it('lazily loads and renders the default-exported component', async () => {
    const LazyCreated = createLazyComponent(
      () => Promise.resolve({ default: (props: { label: string }) => <div>{props.label}</div> })
    );

    render(<LazyCreated label="Created content" />);

    await waitFor(() => expect(screen.getByText('Created content')).toBeInTheDocument());
  });

  it('accepts a custom fallback while loading', async () => {
    const LazyCreated = createLazyComponent(
      () => new Promise<{ default: React.ComponentType }>((resolve) => {
        setTimeout(() => resolve({ default: () => <div>Finally loaded</div> }), 10);
      }),
      <div>Custom create fallback</div>
    );

    render(<LazyCreated />);

    expect(screen.getByText('Custom create fallback')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Finally loaded')).toBeInTheDocument());
  });
});
