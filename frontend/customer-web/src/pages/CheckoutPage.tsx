import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { Address, CheckoutPreview } from '../types';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [addressId, setAddressId] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home', fullName: '', street: '', city: '', state: '', postalCode: '', country: 'USA', phone: '', isDefault: true,
  });

  const { data: addresses, refetch: refetchAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await api.get('/addresses');
      return data.data as Address[];
    },
  });

  const { data: preview, refetch: refetchPreview } = useQuery({
    queryKey: ['checkout-preview', couponCode],
    queryFn: async () => {
      const { data } = await api.post('/checkout/preview', { couponCode: couponCode || undefined });
      return data.data as CheckoutPreview;
    },
  });

  const addAddress = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/addresses', newAddress);
      return data.data as Address;
    },
    onSuccess: (addr) => {
      setAddressId(addr.id);
      setShowAddressForm(false);
      refetchAddresses();
    },
  });

  const placeOrder = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/checkout/confirm', { addressId, couponCode: couponCode || undefined });
      return data.data;
    },
    onSuccess: (order) => navigate(`/orders/${order.id}`),
  });

  const applyCoupon = () => refetchPreview();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-bold">Shipping Address</h2>
            {addresses && addresses.length > 0 ? (
              <div className="mt-4 space-y-2">
                {addresses.map((a) => (
                  <label key={a.id} className={`flex cursor-pointer rounded-lg border p-4 ${addressId === a.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200'}`}>
                    <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mr-3" />
                    <div>
                      <p className="font-medium">{a.label} — {a.fullName}</p>
                      <p className="text-sm text-gray-500">{a.street}, {a.city}, {a.state} {a.postalCode}</p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">No saved addresses. Add one below.</p>
            )}
            {!showAddressForm ? (
              <button onClick={() => setShowAddressForm(true)} className="btn-secondary mt-4">Add New Address</button>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); addAddress.mutate(); }} className="mt-4 grid gap-3 sm:grid-cols-2">
                {(['label', 'fullName', 'street', 'city', 'state', 'postalCode', 'country', 'phone'] as const).map((field) => (
                  <input key={field} placeholder={field} value={newAddress[field]} onChange={(e) => setNewAddress({ ...newAddress, [field]: e.target.value })} className="input-field" required={field !== 'phone'} />
                ))}
                <button type="submit" className="btn-primary sm:col-span-2" disabled={addAddress.isPending}>Save Address</button>
              </form>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold">Coupon Code</h2>
            <div className="mt-3 flex gap-2">
              <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Enter code (e.g. WELCOME10)" className="input-field" />
              <button onClick={applyCoupon} className="btn-secondary">Apply</button>
            </div>
          </div>
        </div>

        <div className="card h-fit p-6">
          <h2 className="text-lg font-bold">Order Summary</h2>
          {preview && (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>${preview.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{preview.shippingCost === 0 ? 'Free' : `$${preview.shippingCost.toFixed(2)}`}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>${preview.taxAmount.toFixed(2)}</span></div>
              {preview.discountAmount > 0 && (
                <div className="flex justify-between text-green-600"><span>Discount</span><span>-${preview.discountAmount.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span>${preview.total.toFixed(2)}</span></div>
            </div>
          )}
          <button
            onClick={() => placeOrder.mutate()}
            disabled={!addressId || placeOrder.isPending}
            className="btn-primary mt-6 w-full"
          >
            {placeOrder.isPending ? 'Placing Order...' : 'Place Order'}
          </button>
          {placeOrder.isError && <p className="mt-2 text-sm text-red-500">Failed to place order. Please try again.</p>}
        </div>
      </div>
    </div>
  );
}
