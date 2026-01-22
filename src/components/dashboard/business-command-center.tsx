export function BusinessCommandCenter({ userId }: { userId: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">
          🚀 Business Command Center
        </h1>

        {/* Business Entity Status */}
        <BusinessEntityCard userId={userId} />
        
        {/* AI Platform Accounts */}
        <AIAccountsOverview userId={userId} />
        
        {/* Website & CMS Status */}
        <WebsiteManagement userId={userId} />
        
        {/* Social Media Automation */}
        <SocialMediaDashboard userId={userId} />
        
        {/* Banking & Financial Services */}
        <FinancialServicesDashboard userId={userId} />
        
        {/* Revenue Analytics */}
        <RevenueAnalytics userId={userId} />
      </div>
    </div>
  )
}