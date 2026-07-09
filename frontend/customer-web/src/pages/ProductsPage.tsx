import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import { Category, PageResponse, Product } from '../types';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const categoryId = searchParams.get('category') || '';
  const featured = searchParams.get('featured') === 'true';
  const page = Number(searchParams.get('page') || 0);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data.data as Category[];
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', page, categoryId, search, featured],
    queryFn: async () => {
      const { data } = await api.get('/products', {
        params: { page, size: 12, categoryId: categoryId || undefined, search: search || undefined, featured: featured || undefined },
      });
      return data.data as PageResponse<Product>;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (search) params.set('search', search); else params.delete('search');
    params.set('page', '0');
    setSearchParams(params);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">Shop</h1>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-56">
          <h3 className="mb-3 font-semibold">Categories</h3>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => { const p = new URLSearchParams(); setSearchParams(p); }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${!categoryId ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                All Products
              </button>
            </li>
            {categories?.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => { const p = new URLSearchParams(); p.set('category', c.id); setSearchParams(p); }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${categoryId === c.id ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex-1">
          <form onSubmit={handleSearch} className="mb-6 flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="input-field flex-1"
            />
            <button type="submit" className="btn-primary">Search</button>
          </form>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => <div key={i} className="card h-72 animate-pulse bg-gray-100" />)}
            </div>
          ) : products?.content.length === 0 ? (
            <p className="py-12 text-center text-gray-500">No products found.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products?.content.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              {products && products.totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  <button
                    disabled={page === 0}
                    onClick={() => { const p = new URLSearchParams(searchParams); p.set('page', String(page - 1)); setSearchParams(p); }}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="flex items-center px-4 text-sm text-gray-600">
                    Page {page + 1} of {products.totalPages}
                  </span>
                  <button
                    disabled={products.last}
                    onClick={() => { const p = new URLSearchParams(searchParams); p.set('page', String(page + 1)); setSearchParams(p); }}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
