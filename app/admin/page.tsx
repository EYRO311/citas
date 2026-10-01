import type { Metadata } from 'next';
import AdminDashboard from '@/modules/admin/components/AdminDashboard';

export const metadata: Metadata = {
  title: 'Gestión de Citas & Sorpresas | Eyro & Adi',
  description: 'Panel de administración de citas públicas y eventos ocultos - Eyro para Adi',
};

export default function AdminPage() {
  return <AdminDashboard />;
}
