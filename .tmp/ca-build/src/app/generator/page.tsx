import { BrandGeneratorWizard } from '@/components/generator/brand-wizard'
import { getPageMetadata } from '@/lib/seo'

export const metadata = getPageMetadata('generator')

export default function GeneratorPage() {
  return (
    <div className="container py-8 generator-cinematic fp-cinematic-page rounded-2xl px-2 md:px-3">
      <div className="fp-cinematic-content py-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Create Your Brand Identity</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Generate a complete brand package in minutes with AI-powered creativity
          </p>
        </div>
        <BrandGeneratorWizard />
      </div>
    </div>
  )
}
