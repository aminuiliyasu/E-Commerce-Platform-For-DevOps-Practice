import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { PageResponse, Product } from '../types';

const emptyProduct = {
  name: '', description: '', categoryId: '', brand: 'AminuStore', sku: '',
  price: 0, compareAtPrice: 0, stockQuantity: 0, images: [] as string[], active: true, featured: false,
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [showForm, setShowForm] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data } = await api.get('/admin/products', { params: { size: 50 } });
      return data.data as PageResponse<Product>;
    },
  });

  const saveProduct = useMutation({
    mutationFn: async () => {
      if (editing) {
        await api.put(`/admin/products/${editing.id}`, form);
      } else {
        await api.post('/admin/products', form);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setShowForm(false);
      setEditing(null);
      setForm(emptyProduct);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/admin/products/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description, categoryId: p.categoryId, brand: p.brand, sku: p.sku,
      price: p.price, compareAtPrice: p.compareAtPrice, stockQuantity: p.stockQuantity,
      images: p.images, active: p.active, featured: p.featured,
    });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <button onClick={() => { setEditing(null); setForm(emptyProduct); setShowForm(true); }} className="btn-primary">Add Product</button>
      </div>

      {showForm && (
        <div className="card mt-4 p-6">
          <h2 className="font-semibold">{editing ? 'Edit Product' : 'New Product'}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(['name', 'sku', 'brand', 'description', 'categoryId'] as const).map((f) => (
              <input key={f} placeholder={f} value={(form as Record<string, unknown>)[f] as string} onChange={(e) => setForm({ ...form, [f]: e.target.value })} className="input-field" />
            ))}
            {(['price', 'compareAtPrice', 'stockQuantity'] as const).map((f) => (
              <input key={f} type="number" placeholder={f} value={form[f]} onChange={(e) => setForm({ ...form, [f]: Number(e.target.value) })} className="input-field" />
            ))}
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => saveProduct.mutate()} className="btn-primary" disabled={saveProduct.isPending}>Save</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="card mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">SKU</th>
              <th className="px-4 py-3 text-left font-medium">Price</th>
              <th className="px-4 py-3 text-left font-medium">Stock</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : products?.content.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                <td className="px-4 py-3">${p.price.toFixed(2)}</td>
                <td className="px-4 py-3">{p.stockQuantity}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${p.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {p.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(p)} className="text-accent hover:underline mr-3">Edit</button>
                  <button onClick={() => deleteProduct.mutate(p.id)} className="text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
