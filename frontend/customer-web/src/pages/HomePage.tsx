import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import { PageResponse, Product } from '../types';

export default function HomePage() {
  const { data: featured, isLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const { data } = await api.get('/products', { params: { featured: true, size: 8 } });
      return data.data as PageResponse<Product>;
    },
  });

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Welcome to AminuStore</h1>
          <p className="mt-4 max-w-xl text-lg text-brand-100">
            Discover quality products at great prices. Shop electronics, fashion, and home essentials.
          </p>
          <Link to="/products" className="mt-8 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-brand-700 hover:bg-brand-50">
            Browse All Products
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Featured Products</h2>
          <Link to="/products" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all →</Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-72 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured?.content.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
