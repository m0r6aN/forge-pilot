   'use client'
   
   import { useState } from 'react'
   import { Button } from '@/components/ui/button'
   import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
   import { Input } from '@/components/ui/input'
   import { Textarea } from '@/components/ui/textarea'
   import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
   import { Loader2 } from 'lucide-react'

   const industries = [
     'Technology', 'Healthcare', 'Finance', 'Retail', 'Food & Beverage',
     'Real Estate', 'Education', 'Consulting', 'Creative Services', 'Other'
   ]

   export function BrandGeneratorWizard() {
     const [step, setStep] = useState(1)
     const [loading, setLoading] = useState(false)
     const [formData, setFormData] = useState({
       businessDescription: '',
       industry: '',
       targetAudience: '',
     })
     const [brandResult, setBrandResult] = useState(null)

     const handleGenerate = async () => {
       setLoading(true)
       try {
         const response = await fetch('/api/generate/brand', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(formData),
         })
         const result = await response.json()
         setBrandResult(result)
         setStep(4)
       } catch (error) {
         console.error('Generation failed:', error)
       } finally {
         setLoading(false)
       }
     }

     return (
       <div className="max-w-2xl mx-auto">
         {step === 1 && (
           <Card>
             <CardHeader>
               <CardTitle>Tell us about your business</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <Textarea
                 placeholder="Describe your business idea, products, or services..."
                 value={formData.businessDescription}
                 onChange={(e) => setFormData({...formData, businessDescription: e.target.value})}
                 rows={4}
               />
               <Button onClick={() => setStep(2)} disabled={!formData.businessDescription}>
                 Next
               </Button>
             </CardContent>
           </Card>
         )}

         {step === 2 && (
           <Card>
             <CardHeader>
               <CardTitle>Industry & Audience</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <Select onValueChange={(value) => setFormData({...formData, industry: value})}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select your industry" />
                 </SelectTrigger>
                 <SelectContent>
                   {industries.map(industry => (
                     <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
               <Input
                 placeholder="Who is your target audience?"
                 value={formData.targetAudience}
                 onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
               />
               <div className="flex gap-2">
                 <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                 <Button onClick={() => setStep(3)} disabled={!formData.industry || !formData.targetAudience}>
                   Next
                 </Button>
               </div>
             </CardContent>
           </Card>
         )}

         {step === 3 && (
           <Card>
             <CardHeader>
               <CardTitle>Generate Your Brand</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-4">
                 <p>Ready to create your brand identity?</p>
                 <div className="flex gap-2">
                   <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                   <Button onClick={handleGenerate} disabled={loading}>
                     {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Generate Brand
                   </Button>
                 </div>
               </div>
             </CardContent>
           </Card>
         )}

         {step === 4 && brandResult && (
           <Card>
             <CardHeader>
               <CardTitle>Your Brand Identity</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-6">
                 <div>
                   <h3 className="font-semibold">Brand Name</h3>
                   <p className="text-2xl font-bold text-primary">{brandResult.brandName}</p>
                 </div>
                 <div>
                   <h3 className="font-semibold">Tagline</h3>
                   <p className="italic">{brandResult.tagline}</p>
                 </div>
                 {brandResult.colorPalette && (
                   <div>
                     <h3 className="font-semibold mb-2">Color Palette</h3>
                     <div className="flex gap-2">
                       {Object.entries(brandResult.colorPalette).map(([name, color]) => (
                         <div key={name} className="text-center">
                           <div 
                             className="w-16 h-16 rounded-lg border"
                             style={{ backgroundColor: color }}
                           />
                           <p className="text-xs mt-1">{name}</p>
                           <p className="text-xs text-muted-foreground">{color}</p>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
                 <Button className="w-full">Save & Continue to Dashboard</Button>
               </div>
             </CardContent>
           </Card>
         )}
       </div>
     )
   }


