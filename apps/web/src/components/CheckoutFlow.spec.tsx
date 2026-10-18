// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import CartPage from '../app/cart/page';
import RegisterPage from '../app/register/page';
import LoginPage from '../app/login/page';
import CheckoutPage from '../app/checkout/page';
import CheckoutReturnPage from '../app/checkout/return/page';
import OrderDetailPage from '../app/orders/[orderId]/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/cart'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: (key: string) => {
      if (key === 'plan') return 'wp-starter';
      if (key === 'cycle') return 'ANNUAL';
      if (key === 'cartId') return 'cart-mock-123';
      return null;
    },
  })),
  useParams: vi.fn(() => ({
    orderId: 'ord-mock-456',
  })),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Velupi Checkout & Onboarding UI Flow (UC-NEW-001)', () => {
  it('renders CartPage with catalog plans and cycle switcher', () => {
    render(<CartPage />);
    expect(screen.getByText('Tu Carrito de Compra Cloud')).toBeDefined();
    expect(screen.getByText('Facturación Mensual')).toBeDefined();
    expect(screen.getAllByText(/Velupi WordPress Starter/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Velupi Cloud Apps/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders RegisterPage with email form and Google/GitHub OAuth buttons', () => {
    render(<RegisterPage />);
    expect(screen.getByText('Crea tu Cuenta Velupi')).toBeDefined();
    expect(screen.getByText('Continuar con Google')).toBeDefined();
    expect(screen.getByText('Continuar con GitHub')).toBeDefined();
    expect(screen.getByText('Crear Cuenta y Continuar')).toBeDefined();
    expect(screen.getByText(/Términos de Servicio/)).toBeDefined();
  });

  it('renders LoginPage with credentials form and OAuth options', () => {
    render(<LoginPage />);
    expect(screen.getByText('Acceder a Velupi')).toBeDefined();
    expect(screen.getByText('Continuar con Google')).toBeDefined();
    expect(screen.getByText('Continuar con GitHub')).toBeDefined();
    expect(screen.getByText('Continuar con Correo')).toBeDefined();
  });

  it('renders CheckoutPage with fiscal form and Wompi payment button', () => {
    render(<CheckoutPage />);
    expect(screen.getByText('Datos de Facturación Fiscal')).toBeDefined();
    expect(screen.getByText('Método de Pago Seguro')).toBeDefined();
    expect(screen.getAllByText(/Wompi/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Resumen de la Orden')).toBeDefined();
  });

  it('renders CheckoutReturnPage with status polling placeholder', () => {
    render(<CheckoutReturnPage />);
    expect(screen.getAllByText(/Wompi/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders OrderDetailPage with loading or details state', () => {
    render(<OrderDetailPage />);
    expect(screen.getAllByText(/orden/i).length).toBeGreaterThanOrEqual(1);
  });
});
