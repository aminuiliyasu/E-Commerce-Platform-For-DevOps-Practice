import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { Category } from '../types';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await api.get('/admin/categories');
      return data.data as Category[];
    },
  });

  const createCategory = useMutation({
    mutationFn: async () => {
      await api.post('/admin/categories', { name, description, active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setName('');
      setDescription('');
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/admin/categories/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-categories'] }),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Categories</h1>
      <form onSubmit={(e) => { e.preventDefault(); createCategory.mutate(); }} className="card mt-4 flex gap-3 p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className="input-field" required />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="input-field" />
        <button type="submit" className="btn-primary whitespace-nowrap" disabled={createCategory.isPending}>Add</button>
      </form>
      <div className="card mt-6 divide-y">
        {categories?.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-gray-500">{c.description}</p>
            </div>
            <button onClick={() => deleteCategory.mutate(c.id)} className="text-sm text-red-500 hover:underline">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
