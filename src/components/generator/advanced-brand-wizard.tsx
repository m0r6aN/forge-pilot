'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Sparkles, Download, RefreshCw, Heart } from 'lucide-react'
import Image from 'next/image'

const industries = [
  'Technology', 'Healthcare', 'Finance', 'E-commerce', 'Education', 
  'Real Estate', 'Food & Beverage', 'Fashion', 'Consulting', 'Other'
]

const brandStyles = [
  'modern', 'minimalist', 'classic', 'playful', 'bold', 'elegant', 'tech', 'organic'
]

export function AdvancedBrandWizard() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    businessDescription: '',
    industry: '',
    targetAudience: '',
    style: 'modern',
    iterations: 3,
    includeLogos: true
  })
  const [brandResult, setBrandResult] = useState<any>(null)
  const [selectedConcept, setSelectedConcept] = useState(0)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/generate/advanced-brand', {
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

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/dashboard/download/brand-package?brandId=demo')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Brand_Package.zip'
      a.click()
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const regenerateWithFeedback = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/generate/advanced-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          previousResults: [brandResult.brandIdentity, ...brandResult.alternatives]
        }),
      })
      const result = await response.json()
      setBrandResult(result)
    } catch (error) {
      console.error('Regeneration failed:', error)
    } finally {
      setLoading(false)
    }
  }

  if (step === 4 && brandResult) {
    const currentConcept = selectedConcept === 0 
      ? brandResult.brandIdentity 
      : brandResult.alternatives[selectedConcept - 1]

    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Your Brand Concepts Are Ready! 🎉</h2>
          <p className="text-muted-foreground">Choose your favorite concept or regenerate for new options</p>
        </div>

        {/* Concept Selector */}
        <div className="flex gap-4 justify-center flex-wrap">
          <Button
            variant={selectedConcept === 0 ? 'default' : 'outline'}
            onClick={() => setSelectedConcept(0)}
          >
            Primary Concept
          </Button>
          {brandResult.alternatives.map((_: any, i: number) => (
            <Button
              key={i}
              variant={selectedConcept === i + 1 ? 'default' : 'outline'}
              onClick={() => setSelectedConcept(i + 1)}
            >
              Alternative {i + 1}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Brand Identity Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {currentConcept.brandName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Tagline</h3>
                <p className="text-lg italic">"{currentConcept.tagline}"</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Color Palette</h3>
                <div className="flex gap-2 flex-wrap">
                  {currentConcept.colorPalette?.map((color: any, i: number) => (
                    <div key={i} className="text-center">
                      <div 
                        className="w-12 h-12 rounded-lg border-2 border-gray-200"
                        style={{ backgroundColor: color.hex || color }}
                      />
                      <p className="text-xs mt-1">{color.name || color}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Brand Voice</h3>
                <p>{currentConcept.brandVoice}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Typography</h3>
                <p><strong>Primary:</strong> {currentConcept.typography?.primary}</p>
                <p><strong>Secondary:</strong> {currentConcept.typography?.secondary}</p>
              </div>

              {currentConcept.brandPersonality && (
                <div>
                  <h3 className="font-semibold mb-2">Brand Personality</h3>
                  <div className="flex gap-2 flex-wrap">
                    {currentConcept.brandPersonality.map((trait: string, i: number) => (
                      <Badge key={i} variant="secondary">{trait}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logo Variations */}
          {brandResult.logoVariations && (
            <Card>
              <CardHeader>
                <CardTitle>Logo Variations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {brandResult.logoVariations.logos.map((logo: any, i: number) => (
                    <div key={i} className="border rounded-lg p-4 text-center">
                      <Image 
                        src={logo.url} 
                        alt={`${logo.style} logo`}
                        width={150}
                        height={150}
                        className="mx-auto mb-2"
                      />
                      <p className="text-sm font-medium">{logo.style}</p>
                      <p className="text-xs text-muted-foreground">{logo.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Strategic Reasoning */}
        {brandResult.reasoning && (
          <Card>
            <CardHeader>
              <CardTitle>Strategic Reasoning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-line">{brandResult.reasoning}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button onClick={handleDownload} size="lg">
            <Download className="mr-2 h-4 w-4" />
            Download Brand Package
          </Button>
          <Button variant="outline" onClick={regenerateWithFeedback} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Generate New Concepts
          </Button>
          <Button variant="outline">
            <Heart className="mr-2 h-4 w-4" />
            Save to Favorites
          </Button>
        </div>
      </div>
    )
  }

  // Rest of the wizard steps (simplified for brevity)
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Advanced Brand Generator</CardTitle>
          <p className="text-muted-foreground">Step {step} of 3</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Business Description</label>
                <Textarea
                  placeholder="Describe your business, what you do, and what makes you unique..."
                  value={formData.businessDescription}
                  onChange={(e) => setFormData({...formData, businessDescription: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Industry</label>
                  <Select value={formData.industry} onValueChange={(value) => setFormData({...formData, industry: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map(industry => (
                        <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Brand Style</label>
                  <Select value={formData.style} onValueChange={(value) => setFormData({...formData, style: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {brandStyles.map(style => (
                        <SelectItem key={style} value={style}>{style}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => setStep(2)} className="w-full">Continue</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Target Audience</label>
                <Textarea
                  placeholder="Who is your ideal customer? Demographics, interests, pain points..."
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                />
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} className="flex-1">Continue</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Number of Concepts</label>
                <Select value={formData.iterations.toString()} onValueChange={(value) => setFormData({...formData, iterations: parseInt(value)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Concepts</SelectItem>
                    <SelectItem value="3">3 Concepts</SelectItem>
                    <SelectItem value="4">4 Concepts</SelectItem>
                    <SelectItem value="5">5 Concepts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={handleGenerate} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate Brand Concepts
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}