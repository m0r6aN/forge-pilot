   import { BrandAssets } from '@/components/dashboard/brand-assets'
   import { MarketingCampaigns } from '@/components/dashboard/marketing-campaigns'
   import { DashboardStats } from '@/components/dashboard/dashboard-stats'

   export default function DashboardPage() {
     return (
       <div className="container py-8">
         <div className="mb-8">
           <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
           <p className="text-muted-foreground">
             Manage your brand assets and marketing campaigns
           </p>
         </div>

         <div className="space-y-8">
           <DashboardStats />
           
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <BrandAssets />
             <MarketingCampaigns />
           </div>
         </div>
       </div>
     )
   }

