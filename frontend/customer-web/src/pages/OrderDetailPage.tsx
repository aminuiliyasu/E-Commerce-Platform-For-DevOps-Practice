import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { Order } from '../types';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${id}`);
      return data.data as Order;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" /></div>;
  if (!order) return <p className="py-12 text-center">Order not found.</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link to="/orders" className="text-sm text-brand-600 hover:text-brand-700">← Back to orders</Link>
      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">{order.status}</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">Placed on {new Date(order.createdAt).toLocaleString()}</p>

      <div className="card mt-6 p-4">
        <h2 className="font-semibold">Shipping Address</h2>
        <p className="mt-2 text-sm text-gray-600">
          {order.shippingFullName}<br />
          {order.shippingStreet}<br />
          {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}<br />
          {order.shippingCountry}
        </p>
      </div>

      <div className="card mt-4 divide-y">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-4 p-4">
            <img src={item.imageUrl || 'https://picsum.photos/80/80'} alt={item.productName} className="h-16 w-16 rounded object-cover" />
            <div className="flex-1">
              <p className="font-medium">{item.productName}</p>
              <p className="text-sm text-gray-500">Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}</p>
            </div>
            <p className="font-medium">${item.total.toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-4 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Shipping</span><span>${order.shippingCost.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Tax</span><span>${order.taxAmount.toFixed(2)}</span></div>
        {order.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-${order.discountAmount.toFixed(2)}</span></div>}
        <div className="mt-2 flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span>${order.total.toFixed(2)}</span></div>
      </div>
    </div>
  );
}
