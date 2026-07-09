import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { Coupon } from '../types';

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ code: '', description: '', discountType: 'PERCENTAGE', discountValue: 10, minOrderAmount: 0, maxUses: 100, active: true });

  const { data: coupons } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data } = await api.get('/admin/coupons');
      return data.data as Coupon[];
    },
  });

  const createCoupon = useMutation({
    mutationFn: async () => { await api.post('/admin/coupons', form); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setForm({ code: '', description: '', discountType: 'PERCENTAGE', discountValue: 10, minOrderAmount: 0, maxUses: 100, active: true });
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/admin/coupons/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Coupons</h1>
      <form onSubmit={(e) => { e.preventDefault(); createCoupon.mutate(); }} className="card mt-4 grid gap-3 p-4 sm:grid-cols-3">
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Code" className="input-field" required />
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="input-field" required />
        <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="input-field">
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED">Fixed Amount</option>
        </select>
        <input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} placeholder="Value" className="input-field" />
        <input type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })} placeholder="Min order" className="input-field" />
        <button type="submit" className="btn-primary" disabled={createCoupon.isPending}>Create Coupon</button>
      </form>
      <div className="card mt-6 divide-y">
        {coupons?.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-mono font-bold">{c.code}</p>
              <p className="text-sm text-gray-500">{c.description} — {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `$${c.discountValue}`} off</p>
              <p className="text-xs text-gray-400">Used: {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</p>
            </div>
            <button onClick={() => deleteCoupon.mutate(c.id)} className="text-sm text-red-500 hover:underline">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
