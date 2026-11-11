import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

// setupTests.ts's global localStorage mock doesn't actually override
// window.localStorage in this jsdom environment, so jsdom's own real,
// working Storage implementation is what the hook talks to here. That's
// fine for this hook: we can assert against it directly.
describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns the initial value when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage('my-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('returns the parsed stored value when present', () => {
    window.localStorage.setItem('my-key', JSON.stringify('stored-value'));

    const { result } = renderHook(() => useLocalStorage('my-key', 'default'));
    expect(result.current[0]).toBe('stored-value');
  });

  it('updates state and persists to localStorage when setValue is called', () => {
    const { result } = renderHook(() => useLocalStorage('my-key', 'default'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(window.localStorage.getItem('my-key')).toBe(JSON.stringify('updated'));
  });

  it('supports a functional updater', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));

    act(() => {
      result.current[1](prev => prev + 1);
    });

    expect(result.current[0]).toBe(1);
    expect(window.localStorage.getItem('count')).toBe('1');
  });

  it('falls back to the initial value when stored JSON is corrupted', () => {
    window.localStorage.setItem('bad-key', 'not valid json{{{');
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage('bad-key', 'fallback'));

    expect(result.current[0]).toBe('fallback');
    consoleErrorSpy.mockRestore();
  });

  it('logs and swallows errors when setItem throws', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage('my-key', 'default'));

    act(() => {
      result.current[1]('updated');
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    setItemSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
