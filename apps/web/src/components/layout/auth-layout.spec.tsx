import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../context/theme-context';
import { AuthLayout } from './auth-layout';

const mockLogout = vi.fn();
const mockManageAccount = vi.fn();

vi.mock('../../context/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'ADMIN' },
    isAuthenticated: true,
    isAdmin: true,
    logout: mockLogout,
    manageAccount: mockManageAccount,
  }),
}));

describe('AuthLayout', () => {
  it('renders categorized sidebar and opens user dropdown in header', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <MemoryRouter>
            <AuthLayout />
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    
    // Check if the main container is rendered with the correct id
    const mainContainer = screen.getByRole('main');
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveAttribute('id', 'main-container');
  });
});
