import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [message, setMessage] = useState('');

  const updateProfile = useMutation({
    mutationFn: async () => {
      await api.put('/profile', form);
    },
    onSuccess: () => setMessage('Profile updated successfully'),
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">My Profile</h1>
      <div className="card mt-6 p-6">
        <p className="text-sm text-gray-500">Email: {user?.email}</p>
        <form onSubmit={(e) => { e.preventDefault(); updateProfile.mutate(); }} className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">First Name</label>
            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="input-field mt-1" required />
          </div>
          <div>
            <label className="text-sm font-medium">Last Name</label>
            <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="input-field mt-1" required />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field mt-1" />
          </div>
          <button type="submit" className="btn-primary" disabled={updateProfile.isPending}>Save Changes</button>
          {message && <p className="text-sm text-green-600">{message}</p>}
        </form>
      </div>
    </div>
  );
}
