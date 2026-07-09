import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { Cart } from '../types';

export default function CartPage() {
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await api.get('/cart');
      return data.data as Cart;
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      await api.patch(`/cart/items/${productId}`, { quantity });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeItem = useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/cart/items/${productId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" /></div>;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link to="/products" className="btn-primary mt-6 inline-block">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">Shopping Cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <div key={item.productId} className="card flex gap-4 p-4">
              <img src={item.imageUrl || 'https://picsum.photos/100/100'} alt={item.productName} className="h-24 w-24 rounded-lg object-cover" />
              <div className="flex flex-1 flex-col">
                <Link to={`/products/${item.productSlug}`} className="font-semibold hover:text-brand-600">{item.productName}</Link>
                <p className="text-sm text-gray-500">${item.unitPrice.toFixed(2)} each</p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-lg border border-gray-300">
                    <button onClick={() => updateItem.mutate({ productId: item.productId, quantity: item.quantity - 1 })} className="px-2 py-1" disabled={item.quantity <= 1}>−</button>
                    <span className="px-3 py-1">{item.quantity}</span>
                    <button onClick={() => updateItem.mutate({ productId: item.productId, quantity: item.quantity + 1 })} className="px-2 py-1">+</button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeItem.mutate(item.productId)} className="text-sm text-red-500 hover:text-red-700">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="card h-fit p-6">
          <h2 className="text-lg font-bold">Order Summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal ({cart.itemCount} items)</span><span>${cart.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span>${cart.subtotal.toFixed(2)}</span></div>
          </div>
          <Link to="/checkout" className="btn-primary mt-6 block w-full text-center">Proceed to Checkout</Link>
        </div>
      </div>
    </div>
  );
}
