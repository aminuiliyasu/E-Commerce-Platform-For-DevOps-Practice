import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { DashboardMetrics } from '../types';

export default function DashboardPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard/metrics');
      return data.data as DashboardMetrics;
    },
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" /></div>;

  const cards = [
    { label: 'Total Revenue', value: `$${Number(metrics?.totalRevenue || 0).toFixed(2)}`, color: 'bg-green-500' },
    { label: 'Revenue Today', value: `$${Number(metrics?.revenueToday || 0).toFixed(2)}`, color: 'bg-emerald-500' },
    { label: 'Total Orders', value: metrics?.totalOrders ?? 0, color: 'bg-blue-500' },
    { label: 'Orders Today', value: metrics?.ordersToday ?? 0, color: 'bg-indigo-500' },
    { label: 'Products', value: metrics?.totalProducts ?? 0, color: 'bg-purple-500' },
    { label: 'Users', value: metrics?.totalUsers ?? 0, color: 'bg-orange-500' },
    { label: 'Low Stock', value: metrics?.lowStockProducts ?? 0, color: 'bg-red-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-gray-500">Overview of your store performance</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${c.color} opacity-80`} />
              <div>
                <p className="text-sm text-gray-500">{c.label}</p>
                <p className="text-2xl font-bold">{c.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
