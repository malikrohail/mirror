import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../header';

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock @/lib/constants
vi.mock('@/lib/constants', () => ({
  TERMS: {
    singular: 'test',
    plural: 'tests',
    singularCap: 'Test',
    pluralCap: 'Tests',
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    _store: store,
    _reset: () => {
      store = {};
    },
  };
})();

beforeEach(() => {
  localStorageMock._reset();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Header browser mode toggle', () => {
  it('defaults to local mode', () => {
    render(<Header />);

    const localButton = screen.getByRole('button', { name: /local/i });
    const cloudButton = screen.getByRole('button', { name: /cloud/i });

    // The local button should have the active styling (bg-foreground text-background)
    expect(localButton.className).toContain('bg-foreground');
    expect(cloudButton.className).not.toContain('bg-foreground');
  });

  it('clicking Cloud button saves "cloud" to localStorage', () => {
    render(<Header />);

    const cloudButton = screen.getByRole('button', { name: /cloud/i });
    fireEvent.click(cloudButton);

    expect(localStorageMock.setItem).toHaveBeenCalledWith('mirror-browser-mode', 'cloud');
  });

  it('clicking Local button saves "local" to localStorage', () => {
    render(<Header />);

    // First switch to cloud
    const cloudButton = screen.getByRole('button', { name: /cloud/i });
    fireEvent.click(cloudButton);

    // Then switch back to local
    const localButton = screen.getByRole('button', { name: /local/i });
    fireEvent.click(localButton);

    expect(localStorageMock.setItem).toHaveBeenCalledWith('mirror-browser-mode', 'local');
  });

  it('reads "cloud" from localStorage on mount', () => {
    localStorageMock.getItem.mockReturnValue('cloud');

    render(<Header />);

    expect(localStorageMock.getItem).toHaveBeenCalledWith('mirror-browser-mode');

    const cloudButton = screen.getByRole('button', { name: /cloud/i });
    expect(cloudButton.className).toContain('bg-foreground');
  });

  it('reads "local" from localStorage on mount', () => {
    localStorageMock.getItem.mockReturnValue('local');

    render(<Header />);

    expect(localStorageMock.getItem).toHaveBeenCalledWith('mirror-browser-mode');

    const localButton = screen.getByRole('button', { name: /local/i });
    expect(localButton.className).toContain('bg-foreground');
  });

  it('ignores invalid localStorage values and defaults to local', () => {
    localStorageMock.getItem.mockReturnValue('invalid-value');

    render(<Header />);

    const localButton = screen.getByRole('button', { name: /local/i });
    expect(localButton.className).toContain('bg-foreground');
  });

  it('updates visual state when toggling between modes', () => {
    render(<Header />);

    const localButton = screen.getByRole('button', { name: /local/i });
    const cloudButton = screen.getByRole('button', { name: /cloud/i });

    // Initially local is active
    expect(localButton.className).toContain('bg-foreground');
    expect(cloudButton.className).not.toContain('bg-foreground');

    // Click cloud
    fireEvent.click(cloudButton);
    expect(cloudButton.className).toContain('bg-foreground');
    expect(localButton.className).not.toContain('bg-foreground');

    // Click local again
    fireEvent.click(localButton);
    expect(localButton.className).toContain('bg-foreground');
    expect(cloudButton.className).not.toContain('bg-foreground');
  });
});
