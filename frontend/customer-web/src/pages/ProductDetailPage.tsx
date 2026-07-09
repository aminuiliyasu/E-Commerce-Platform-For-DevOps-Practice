import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Product, Review } from '../types';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data } = await api.get(`/products/${slug}`);
      return data.data as Product;
    },
    enabled: !!slug,
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', product?.id],
    queryFn: async () => {
      const { data } = await api.get(`/products/id/${product!.id}/reviews`);
      return data.data as Review[];
    },
    enabled: !!product?.id,
  });

  const addToCart = useMutation({
    mutationFn: async () => {
      await api.post('/cart/items', { productId: product!.id, quantity });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      await api.post(`/products/id/${product!.id}/reviews`, { rating, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', product?.id] });
      queryClient.invalidateQueries({ queryKey: ['product', slug] });
      setComment('');
    },
  });

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" /></div>;
  if (!product) return <p className="py-12 text-center">Product not found.</p>;

  const image = product.images[0] || 'https://picsum.photos/600/600';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl bg-gray-100">
          <img src={image} alt={product.name} className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="text-sm font-medium uppercase text-gray-400">{product.categoryName}</p>
          <h1 className="mt-1 text-3xl font-bold">{product.name}</h1>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-3xl font-bold">${product.price.toFixed(2)}</span>
            {product.compareAtPrice > product.price && (
              <span className="text-lg text-gray-400 line-through">${product.compareAtPrice.toFixed(2)}</span>
            )}
          </div>
          <p className="mt-4 text-gray-600">{product.description}</p>
          <p className="mt-2 text-sm text-gray-500">SKU: {product.sku} | Stock: {product.stockQuantity}</p>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-gray-300">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2">−</button>
              <span className="px-4 py-2 font-medium">{quantity}</span>
              <button onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))} className="px-3 py-2">+</button>
            </div>
            <button
              onClick={() => addToCart.mutate()}
              disabled={addToCart.isPending || product.stockQuantity === 0}
              className="btn-primary flex-1"
            >
              {product.stockQuantity === 0 ? 'Out of Stock' : addToCart.isSuccess ? 'Added!' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-bold">Reviews ({reviews?.length || 0})</h2>
        {isAuthenticated && (
          <form onSubmit={(e) => { e.preventDefault(); submitReview.mutate(); }} className="card mt-4 p-4">
            <div className="mb-3">
              <label className="text-sm font-medium">Rating</label>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="input-field mt-1">
                {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} stars</option>)}
              </select>
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a review..." className="input-field" rows={3} required />
            <button type="submit" className="btn-primary mt-3" disabled={submitReview.isPending}>Submit Review</button>
          </form>
        )}
        <div className="mt-4 space-y-4">
          {reviews?.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.userName}</span>
                <span className="text-amber-500">{'★'.repeat(r.rating)}</span>
              </div>
              <p className="mt-2 text-gray-600">{r.comment}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
