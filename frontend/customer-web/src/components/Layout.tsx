import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Cart } from '../types';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await api.get('/cart');
      return data.data as Cart;
    },
    refetchInterval: 30000,
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="text-xl font-bold text-brand-700">
          AminuStore
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/products" className="text-sm font-medium text-gray-600 hover:text-brand-600">Shop</Link>
          <Link to="/products?featured=true" className="text-sm font-medium text-gray-600 hover:text-brand-600">Featured</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/cart" className="relative rounded-lg p-2 hover:bg-gray-100">
            <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cart && cart.itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {cart.itemCount}
              </span>
            )}
          </Link>
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link to="/orders" className="text-sm font-medium text-gray-600 hover:text-brand-600">Orders</Link>
              <Link to="/profile" className="text-sm font-medium text-gray-600 hover:text-brand-600">
                {user?.firstName}
              </Link>
              <button onClick={handleLogout} className="btn-secondary text-xs">Logout</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="btn-secondary text-sm">Login</Link>
              <Link to="/register" className="btn-primary text-sm">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500 sm:px-6">
          &copy; {new Date().getFullYear()} AminuStore by Aminu Iliyasu. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
