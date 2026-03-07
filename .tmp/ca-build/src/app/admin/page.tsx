import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { AdminMetrics } from '@/components/admin/admin-metrics'
import { UserManagement } from '@/components/admin/user-management'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <AdminDashboard />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        <AdminMetrics />
        <UserManagement />
        {/* Revenue tracking, usage analytics, etc. */}
      </div>
    </div>
  )
}