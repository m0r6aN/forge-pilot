import { SiteBuilder } from './site-builder'
import { Storage } from '@google-cloud/storage'

export interface PaymentProvider {
  id: string
  name: string
  logo: string
  fees: {
    percentage: number
    fixed: number
    currency: string
  }
  features: string[]
  countries: string[]
  cryptoSupport: boolean
}

export interface EcommerceConfig {
  paymentProviders: string[]
  inventory: {
    trackStock: boolean
    lowStockAlert: number
    backorderAllowed: boolean
  }
  shipping: {
    zones: Array<{
      name: string
      countries: string[]
      rates: Array<{
        method: string
        price: number
        estimatedDays: string
      }>
    }>
    freeShippingThreshold?: number
  }
  taxes: {
    enabled: boolean
    rate: number
    regions: string[]
  }
  analytics: {
    googleAnalytics?: string
    facebookPixel?: string
    tiktokPixel?: string
    snapchatPixel?: string
  }
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  compareAtPrice?: number
  images: string[]
  variants: Array<{
    id: string
    name: string
    price: number
    sku: string
    inventory: number
    attributes: Record<string, string>
  }>
  categories: string[]
  tags: string[]
  seo: {
    title: string
    description: string
    keywords: string[]
  }
}

export class EcommerceBuilder extends SiteBuilder {
  
  getPaymentProviders(): PaymentProvider[] {
    return [
      {
        id: 'stripe',
        name: 'Stripe',
        logo: '/providers/stripe.svg',
        fees: { percentage: 2.9, fixed: 0.30, currency: 'USD' },
        features: ['Credit Cards', 'Apple Pay', 'Google Pay', 'Bank Transfers'],
        countries: ['US', 'CA', 'UK', 'EU', 'AU', 'JP'],
        cryptoSupport: false
      },
      {
        id: 'paypal',
        name: 'PayPal',
        logo: '/providers/paypal.svg',
        fees: { percentage: 3.49, fixed: 0.49, currency: 'USD' },
        features: ['PayPal', 'Credit Cards', 'Buy Now Pay Later'],
        countries: ['Global'],
        cryptoSupport: false
      },
      {
        id: 'square',
        name: 'Square',
        logo: '/providers/square.svg',
        fees: { percentage: 2.9, fixed: 0.30, currency: 'USD' },
        features: ['Credit Cards', 'In-Person Payments', 'Invoicing'],
        countries: ['US', 'CA', 'UK', 'AU', 'JP'],
        cryptoSupport: false
      },
      {
        id: 'coinbase',
        name: 'Coinbase Commerce',
        logo: '/providers/coinbase.svg',
        fees: { percentage: 1.0, fixed: 0, currency: 'USD' },
        features: ['Bitcoin', 'Ethereum', 'USDC', '100+ Cryptocurrencies'],
        countries: ['Global'],
        cryptoSupport: true
      },
      {
        id: 'shopify-payments',
        name: 'Shopify Payments',
        logo: '/providers/shopify.svg',
        fees: { percentage: 2.4, fixed: 0.30, currency: 'USD' },
        features: ['Credit Cards', 'Shop Pay', 'Installments'],
        countries: ['US', 'CA', 'UK', 'AU'],
        cryptoSupport: false
      },
      {
        id: 'razorpay',
        name: 'Razorpay',
        logo: '/providers/razorpay.svg',
        fees: { percentage: 2.0, fixed: 0, currency: 'INR' },
        features: ['UPI', 'Credit Cards', 'Net Banking', 'Wallets'],
        countries: ['IN', 'MY', 'SG'],
        cryptoSupport: false
      }
    ]
  }
  
  async createEcommerceStore(
    userId: string, 
    brandId: string, 
    config: EcommerceConfig,
    products: Product[]
  ): Promise<any> {
    // Generate e-commerce site with full functionality
    const subdomain = await this.generateSubdomain(brandId)
    const brand = await this.getBrandData(brandId)
    
    // Build advanced e-commerce template
    const siteFiles = await this.buildEcommerceTemplate(brand, config, products)
    
    // Deploy with e-commerce functionality
    const bucketName = `${subdomain}.forgepilot.app`
    await this.createSiteBucket(bucketName)
    await this.uploadSiteFiles(bucketName, siteFiles)
    
    // Setup payment integrations
    await this.setupPaymentProviders(config.paymentProviders, brand)
    
    // Configure analytics and tracking
    await this.setupEcommerceAnalytics(config.analytics)
    
    return {
      id: `ecommerce_${Date.now()}`,
      userId,
      brandId,
      subdomain,
      type: 'ecommerce',
      url: `https://${subdomain}.forgepilot.app`,
      paymentProviders: config.paymentProviders,
      products: products.length,
      status: 'deployed'
    }
  }
  
  private async buildEcommerceTemplate(
    brand: any, 
    config: EcommerceConfig, 
    products: Product[]
  ): Promise<Map<string, string>> {
    const files = new Map<string, string>()
    
    // Main store page
    files.set('index.html', this.generateStorefront(brand, products))
    
    // Product pages
    products.forEach(product => {
      files.set(`products/${product.id}.html`, this.generateProductPage(brand, product))
    })
    
    // Cart and checkout
    files.set('cart.html', this.generateCartPage(brand, config))
    files.set('checkout.html', this.generateCheckoutPage(brand, config))
    
    // Admin dashboard
    files.set('admin/index.html', this.generateAdminDashboard(brand))
    files.set('admin/products.html', this.generateProductManagement())
    files.set('admin/orders.html', this.generateOrderManagement())
    
    // API endpoints (serverless functions)
    files.set('api/products.js', this.generateProductAPI())
    files.set('api/cart.js', this.generateCartAPI())
    files.set('api/checkout.js', this.generateCheckoutAPI(config))
    files.set('api/webhooks.js', this.generateWebhookHandlers(config))
    
    return files
  }
  
  private generateStorefront(brand: any, products: Product[]): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${brand.brandName} - Online Store</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://js.stripe.com/v3/"></script>
    <script src="https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID"></script>
</head>
<body>
    <header class="bg-white shadow-sm sticky top-0 z-50">
        <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <h1 class="text-2xl font-bold" style="color: ${brand.colorPalette[0]}">${brand.brandName}</h1>
                <div class="flex items-center space-x-4">
                    <button id="cart-btn" class="relative">
                        🛒 <span id="cart-count" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">0</span>
                    </button>
                </div>
            </div>
        </nav>
    </header>

    <main>
        <section class="hero bg-gradient-to-r from-blue-50 to-indigo-100 py-20">
            <div class="max-w-7xl mx-auto px-4 text-center">
                <h2 class="text-4xl font-bold mb-4">${brand.brandName}</h2>
                <p class="text-xl text-gray-600 mb-8">${brand.tagline}</p>
            </div>
        </section>

        <section class="products py-16">
            <div class="max-w-7xl mx-auto px-4">
                <h3 class="text-3xl font-bold text-center mb-12">Our Products</h3>
                <div class="grid md:grid-cols-3 lg:grid-cols-4 gap-6" id="products-grid">
                    ${products.map(product => `
                        <div class="product-card bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                            <img src="${product.images[0]}" alt="${product.name}" class="w-full h-48 object-cover">
                            <div class="p-4">
                                <h4 class="font-semibold mb-2">${product.name}</h4>
                                <p class="text-gray-600 text-sm mb-3">${product.description}</p>
                                <div class="flex justify-between items-center">
                                    <span class="text-xl font-bold" style="color: ${brand.colorPalette[0]}">$${product.price}</span>
                                    <button onclick="addToCart('${product.id}')" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>
    </main>

    <script>
        // E-commerce functionality
        let cart = JSON.parse(localStorage.getItem('cart') || '[]')
        
        function addToCart(productId) {
            const existingItem = cart.find(item => item.id === productId)
            if (existingItem) {
                existingItem.quantity += 1
            } else {
                cart.push({ id: productId, quantity: 1 })
            }
            localStorage.setItem('cart', JSON.stringify(cart))
            updateCartCount()
        }
        
        function updateCartCount() {
            const count = cart.reduce((sum, item) => sum + item.quantity, 0)
            document.getElementById('cart-count').textContent = count
        }
        
        updateCartCount()
    </script>
</body>
</html>
    `
  }
  
  private generateCheckoutAPI(config: EcommerceConfig): string {
    return `
// Serverless checkout API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const { items, paymentMethod, customerInfo } = req.body
  
  try {
    let paymentResult
    
    switch (paymentMethod) {
      case 'stripe':
        paymentResult = await processStripePayment(items, customerInfo)
        break
      case 'paypal':
        paymentResult = await processPayPalPayment(items, customerInfo)
        break
      case 'coinbase':
        paymentResult = await processCryptoPayment(items, customerInfo)
        break
      default:
        throw new Error('Unsupported payment method')
    }
    
    // Create order record
    const order = await createOrder({
      items,
      customer: customerInfo,
      payment: paymentResult,
      total: calculateTotal(items),
      status: 'confirmed'
    })
    
    // Send confirmation email
    await sendOrderConfirmation(customerInfo.email, order)
    
    res.json({ success: true, orderId: order.id, payment: paymentResult })
    
  } catch (error) {
    console.error('Checkout error:', error)
    res.status(500).json({ error: 'Payment processing failed' })
  }
}

async function processStripePayment(items, customer) {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: calculateTotal(items) * 100, // Convert to cents
    currency: 'usd',
    customer: customer.email,
    metadata: {
      items: JSON.stringify(items)
    }
  })
  
  return {
    provider: 'stripe',
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret
  }
}

async function processCryptoPayment(items, customer) {
  // Coinbase Commerce integration
  const coinbase = require('coinbase-commerce-node')
  coinbase.Client.init(process.env.COINBASE_API_KEY)
  
  const charge = await coinbase.resources.Charge.create({
    name: 'Order Payment',
    description: 'E-commerce order payment',
    pricing_type: 'fixed_price',
    local_price: {
      amount: calculateTotal(items).toString(),
      currency: 'USD'
    },
    metadata: {
      customer_email: customer.email,
      items: JSON.stringify(items)
    }
  })
  
  return {
    provider: 'coinbase',
    chargeId: charge.id,
    hostedUrl: charge.hosted_url
  }
}
    `
  }
}