import { Storage } from '@google-cloud/storage'
import { FirestoreService } from '@/lib/db/firestore'

export interface SiteTemplate {
  id: string
  name: string
  category: 'landing' | 'portfolio' | 'ecommerce' | 'blog' | 'saas'
  preview: string
  features: string[]
  premium: boolean
}

export interface SiteConfig {
  template: string
  domain?: string
  customDomain?: string
  seo: {
    title: string
    description: string
    keywords: string[]
  }
  analytics: {
    googleAnalytics?: string
    facebookPixel?: string
  }
  integrations: {
    stripe?: boolean
    mailchimp?: boolean
    calendly?: boolean
  }
}

export interface DeployedSite {
  id: string
  userId: string
  brandId: string
  subdomain: string
  customDomain?: string
  template: string
  status: 'building' | 'deployed' | 'failed'
  url: string
  previewUrl: string
  lastDeployed: Date
  analytics: {
    visitors: number
    pageViews: number
    conversionRate: number
  }
}

export class SiteBuilder {
  private storage: Storage
  
  constructor() {
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    })
  }
  
  async getTemplates(): Promise<SiteTemplate[]> {
    return [
      {
        id: 'modern-landing',
        name: 'Modern Landing Page',
        category: 'landing',
        preview: 'https://storage.googleapis.com/forgepilot-templates/modern-landing-preview.jpg',
        features: ['Responsive Design', 'Contact Form', 'SEO Optimized'],
        premium: false
      },
      {
        id: 'ecommerce-store',
        name: 'E-commerce Store',
        category: 'ecommerce',
        preview: 'https://storage.googleapis.com/forgepilot-templates/ecommerce-preview.jpg',
        features: ['Product Catalog', 'Shopping Cart', 'Payment Integration', 'Inventory Management'],
        premium: true
      },
      {
        id: 'saas-platform',
        name: 'SaaS Platform',
        category: 'saas',
        preview: 'https://storage.googleapis.com/forgepilot-templates/saas-preview.jpg',
        features: ['User Dashboard', 'Subscription Management', 'API Documentation', 'Analytics'],
        premium: true
      },
      {
        id: 'portfolio-showcase',
        name: 'Portfolio Showcase',
        category: 'portfolio',
        preview: 'https://storage.googleapis.com/forgepilot-templates/portfolio-preview.jpg',
        features: ['Gallery', 'Blog', 'Contact Form', 'Social Integration'],
        premium: false
      }
    ]
  }
  
  async createSite(userId: string, brandId: string, config: SiteConfig): Promise<DeployedSite> {
    // Generate unique subdomain
    const subdomain = await this.generateSubdomain(brandId)
    
    // Get brand data for customization
    const brand = await FirestoreService.getBrand(brandId)
    
    // Build site with brand customization
    const siteFiles = await this.buildSiteFiles(config.template, brand, config)
    
    // Deploy to Google Cloud Storage
    const bucketName = `${subdomain}.forgepilot.app`
    await this.createSiteBucket(bucketName)
    await this.uploadSiteFiles(bucketName, siteFiles)
    
    // Configure custom domain if provided
    if (config.customDomain) {
      await this.setupCustomDomain(bucketName, config.customDomain)
    }
    
    // Create site record
    const site: DeployedSite = {
      id: `site_${Date.now()}`,
      userId,
      brandId,
      subdomain,
      customDomain: config.customDomain,
      template: config.template,
      status: 'deployed',
      url: config.customDomain ? `https://${config.customDomain}` : `https://${subdomain}.forgepilot.app`,
      previewUrl: `https://${subdomain}.forgepilot.app`,
      lastDeployed: new Date(),
      analytics: {
        visitors: 0,
        pageViews: 0,
        conversionRate: 0
      }
    }
    
    // Save to database
    await FirestoreService.createSite(site)
    
    return site
  }
  
  async updateSite(siteId: string, updates: Partial<SiteConfig>): Promise<void> {
    const site = await FirestoreService.getSite(siteId)
    if (!site) throw new Error('Site not found')
    
    // Rebuild with updates
    const brand = await FirestoreService.getBrand(site.brandId)
    const siteFiles = await this.buildSiteFiles(site.template, brand, updates)
    
    // Redeploy
    const bucketName = `${site.subdomain}.forgepilot.app`
    await this.uploadSiteFiles(bucketName, siteFiles)
    
    // Update database
    await FirestoreService.updateSite(siteId, {
      lastDeployed: new Date(),
      status: 'deployed'
    })
  }
  
  async deleteSite(siteId: string): Promise<void> {
    const site = await FirestoreService.getSite(siteId)
    if (!site) throw new Error('Site not found')
    
    // Delete bucket and files
    const bucketName = `${site.subdomain}.forgepilot.app`
    await this.storage.bucket(bucketName).deleteFiles()
    await this.storage.bucket(bucketName).delete()
    
    // Remove from database
    await FirestoreService.deleteSite(siteId)
  }
  
  private async generateSubdomain(brandId: string): Promise<string> {
    const brand = await FirestoreService.getBrand(brandId)
    const baseName = brand.brandName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const timestamp = Date.now().toString().slice(-6)
    return `${baseName}-${timestamp}`
  }
  
  private async buildSiteFiles(template: string, brand: any, config: SiteConfig): Promise<Map<string, string>> {
    const files = new Map<string, string>()
    
    // Load template
    const templateFiles = await this.loadTemplate(template)
    
    // Customize with brand data
    for (const [path, content] of templateFiles) {
      let customizedContent = content
        .replace(/{{BRAND_NAME}}/g, brand.brandName)
        .replace(/{{TAGLINE}}/g, brand.tagline)
        .replace(/{{PRIMARY_COLOR}}/g, brand.colorPalette[0] || '#000000')
        .replace(/{{SECONDARY_COLOR}}/g, brand.colorPalette[1] || '#ffffff')
        .replace(/{{BRAND_VOICE}}/g, brand.brandVoice)
        .replace(/{{SEO_TITLE}}/g, config.seo.title)
        .replace(/{{SEO_DESCRIPTION}}/g, config.seo.description)
        .replace(/{{SEO_KEYWORDS}}/g, config.seo.keywords.join(', '))
      
      // Add analytics if configured
      if (config.analytics.googleAnalytics) {
        customizedContent = customizedContent.replace(
          '</head>',
          `<script async src="https://www.googletagmanager.com/gtag/js?id=${config.analytics.googleAnalytics}"></script>
          <script>
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${config.analytics.googleAnalytics}');
          </script>
          </head>`
        )
      }
      
      files.set(path, customizedContent)
    }
    
    return files
  }
  
  private async loadTemplate(templateId: string): Promise<Map<string, string>> {
    // Load template files from storage or generate dynamically
    const templates = {
      'modern-landing': this.generateModernLandingTemplate(),
      'ecommerce-store': this.generateEcommerceTemplate(),
      'saas-platform': this.generateSaaSTemplate(),
      'portfolio-showcase': this.generatePortfolioTemplate()
    }
    
    return templates[templateId as keyof typeof templates] || templates['modern-landing']
  }
  
  private generateModernLandingTemplate(): Map<string, string> {
    const files = new Map<string, string>()
    
    files.set('index.html', `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{SEO_TITLE}}</title>
    <meta name="description" content="{{SEO_DESCRIPTION}}">
    <meta name="keywords" content="{{SEO_KEYWORDS}}">
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: {{PRIMARY_COLOR}};
            --secondary-color: {{SECONDARY_COLOR}};
        }
        .brand-primary { color: var(--primary-color); }
        .bg-brand-primary { background-color: var(--primary-color); }
    </style>
</head>
<body class="font-sans">
    <header class="bg-white shadow-sm">
        <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <div class="flex items-center">
                    <h1 class="text-2xl font-bold brand-primary">{{BRAND_NAME}}</h1>
                </div>
                <div class="flex items-center space-x-4">
                    <a href="#about" class="text-gray-700 hover:text-gray-900">About</a>
                    <a href="#services" class="text-gray-700 hover:text-gray-900">Services</a>
                    <a href="#contact" class="bg-brand-primary text-white px-4 py-2 rounded-md">Contact</a>
                </div>
            </div>
        </nav>
    </header>

    <main>
        <section class="bg-gradient-to-r from-blue-50 to-indigo-100 py-20">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 class="text-4xl font-bold text-gray-900 mb-4">{{BRAND_NAME}}</h2>
                <p class="text-xl text-gray-600 mb-8">{{TAGLINE}}</p>
                <button class="bg-brand-primary text-white px-8 py-3 rounded-lg text-lg font-semibold hover:opacity-90">
                    Get Started
                </button>
            </div>
        </section>

        <section id="about" class="py-16">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h3 class="text-3xl font-bold text-center mb-12">About Us</h3>
                <p class="text-lg text-gray-600 text-center max-w-3xl mx-auto">
                    {{BRAND_VOICE}}
                </p>
            </div>
        </section>

        <section id="contact" class="bg-gray-50 py-16">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h3 class="text-3xl font-bold text-center mb-12">Contact Us</h3>
                <form class="max-w-lg mx-auto">
                    <div class="mb-4">
                        <input type="text" placeholder="Your Name" class="w-full px-4 py-2 border rounded-lg">
                    </div>
                    <div class="mb-4">
                        <input type="email" placeholder="Your Email" class="w-full px-4 py-2 border rounded-lg">
                    </div>
                    <div class="mb-4">
                        <textarea placeholder="Your Message" rows="4" class="w-full px-4 py-2 border rounded-lg"></textarea>
                    </div>
                    <button type="submit" class="w-full bg-brand-primary text-white py-2 rounded-lg font-semibold">
                        Send Message
                    </button>
                </form>
            </div>
        </section>
    </main>

    <footer class="bg-gray-800 text-white py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p>&copy; 2024 {{BRAND_NAME}}. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>
    `)
    
    return files
  }
  
  private generateEcommerceTemplate(): Map<string, string> {
    // E-commerce template with product catalog, cart, checkout
    const files = new Map<string, string>()
    // ... implement e-commerce template
    return files
  }
  
  private generateSaaSTemplate(): Map<string, string> {
    // SaaS template with pricing, features, dashboard preview
    const files = new Map<string, string>()
    // ... implement SaaS template
    return files
  }
  
  private generatePortfolioTemplate(): Map<string, string> {
    // Portfolio template with gallery, blog, contact
    const files = new Map<string, string>()
    // ... implement portfolio template
    return files
  }
  
  private async createSiteBucket(bucketName: string): Promise<void> {
    const bucket = this.storage.bucket(bucketName)
    
    await bucket.create({
      location: 'US',
      storageClass: 'STANDARD',
    })
    
    // Configure for website hosting
    await bucket.setMetadata({
      website: {
        mainPageSuffix: 'index.html',
        notFoundPage: '404.html',
      },
    })
    
    // Make bucket publicly readable
    await bucket.makePublic()
  }
  
  private async uploadSiteFiles(bucketName: string, files: Map<string, string>): Promise<void> {
    const bucket = this.storage.bucket(bucketName)
    
    const uploadPromises = Array.from(files.entries()).map(async ([path, content]) => {
      const file = bucket.file(path)
      await file.save(content, {
        metadata: {
          contentType: this.getContentType(path),
        },
      })
    })
    
    await Promise.all(uploadPromises)
  }
  
  private async setupCustomDomain(bucketName: string, customDomain: string): Promise<void> {
    // Configure custom domain with Cloud CDN
    // This would involve creating DNS records and SSL certificates
    console.log(`Setting up custom domain ${customDomain} for bucket ${bucketName}`)
  }
  
  private getContentType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase()
    const contentTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
    }
    return contentTypes[ext || ''] || 'text/plain'
  }
}