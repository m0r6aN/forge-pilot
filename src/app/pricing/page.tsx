   import { PricingTiers } from '@/components/pricing/pricing-tiers'
   
   export default function PricingPage() {
     return (
       <div className="container py-16">
         <h1 className="text-4xl font-bold text-center mb-12">Choose Your Plan</h1>
         <PricingTiers />
       </div>
     )
   }
