import { BrandAssets } from '@/components/dashboard/brand-assets'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'

export default function DashboardPage() {
  return (
       <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your Launch Blueprint outputs and downloadable brand evidence
          </p>
        </div>

        <div className="space-y-8">
          <DashboardStats />
          <BrandAssets />
        </div>
      </div>
    )
  }
