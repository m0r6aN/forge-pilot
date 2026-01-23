import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let firestoreDb: Firestore | null = null

function initializeFirestore(): Firestore {
  if (firestoreDb) return firestoreDb
  
  const serviceAccountKey = process.env.FIRESTORE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    throw new Error('FIRESTORE_SERVICE_ACCOUNT_KEY environment variable is not set')
  }
  
  let serviceAccount
  try {
    serviceAccount = JSON.parse(serviceAccountKey)
  } catch (error) {
    throw new Error('Invalid FIRESTORE_SERVICE_ACCOUNT_KEY: must be valid JSON')
  }
  
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    })
  }
  
  firestoreDb = getFirestore()
  return firestoreDb
}

export const db = {
  get instance() {
    return initializeFirestore()
  }
}

// Collections
export const collections = {
  users: 'users',
  brands: 'brands',
  generations: 'generations',
  subscriptions: 'subscriptions',
  analytics: 'analytics',
  sites: 'sites',
  usage: 'usage',
  settings: 'settings',
  passwordResets: 'passwordResets',
  emailVerifications: 'emailVerifications',
} as const

// Types
export interface User {
  id: string
  email: string
  name: string
  passwordHash: string
  plan: 'free' | 'starter' | 'growth' | 'professional' | 'enterprise'
  stripeCustomerId?: string
  emailVerified: boolean
  emailVerificationToken?: string
  createdAt: Date
  updatedAt: Date
}

export interface Brand {
  id: string
  userId: string
  brandName: string
  tagline: string
  colorPalette: string[] | { primary: string; secondary: string; accent: string; neutral: string[] } | any
  brandVoice: string | { tone: string; personality: string[]; messaging: string[] } | any
  typography: string | { primary: string; secondary: string; headings: string } | any
  logoUrl?: string
  logoVariations?: Array<{
    url: string
    style: string
    description: string
  }>
  status: 'generating' | 'completed' | 'failed'
  businessDescription: string
  industry: string
  targetAudience: string
  createdAt: Date
  updatedAt: Date
}

export interface Generation {
  id: string
  userId: string
  brandId: string
  type: 'brand' | 'logo' | 'variation' | '3d-render' | 'video' | 'social-media' | 'marketing'
  prompt: string
  result?: any
  status: 'pending' | 'completed' | 'failed'
  error?: string
  createdAt: Date
  completedAt?: Date
}

export interface Site {
  id: string
  userId: string
  brandId: string
  domain: string
  status: 'pending' | 'active' | 'suspended'
  sslEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UserSettings {
  id: string
  userId: string
  notifications: {
    email: boolean
    push: boolean
    marketing: boolean
  }
  theme: 'light' | 'dark' | 'system'
  timezone: string
  language: string
  updatedAt: Date
}

export interface UsageRecord {
  id: string
  userId: string
  type: 'brand_generation' | 'logo_generation' | 'video_generation' | 'api_call' | '3d-render' | 'site-hosting' | 'domain-registration'
  count: number
  period: string
  createdAt: Date
  updatedAt: Date
}

export interface Subscription {
  id: string
  userId: string
  plan: 'free' | 'starter' | 'growth' | 'professional' | 'enterprise'
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  stripeSubscriptionId?: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PasswordReset {
  id: string
  userId: string
  token: string
  expiresAt: Date
  used: boolean
  createdAt: Date
}

export const PLAN_LIMITS = {
  free: { brands: 1, generations: 5, logoVariations: 2 },
  starter: { brands: 5, generations: 50, logoVariations: 10 },
  growth: { brands: 25, generations: 200, logoVariations: 50 },
  professional: { brands: 100, generations: 1000, logoVariations: 200 },
  enterprise: { brands: -1, generations: -1, logoVariations: -1 },
} as const

// Database helpers
export class FirestoreService {
  // User operations
  static async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const userRef = db.instance.collection(collections.users).doc()
    const user: User = {
      ...userData,
      id: userRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    await userRef.set(user)
    return user
  }

  static async getUser(userId: string): Promise<User | null> {
    const doc = await db.instance.collection(collections.users).doc(userId).get()
    if (!doc.exists) return null
    return { id: doc.id, ...doc.data() } as User
  }
  
  static async getUserByEmail(email: string): Promise<User | null> {
    const snapshot = await db.instance
      .collection(collections.users)
      .where('email', '==', email)
      .limit(1)
      .get()
    
    if (snapshot.empty) return null
    
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() } as User
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    await db.instance.collection(collections.users).doc(userId).update({
      ...updates,
      updatedAt: new Date(),
    })
  }

  static async deleteUser(userId: string): Promise<void> {
    await db.instance.collection(collections.users).doc(userId).delete()
  }

  // Brand operations
  static async createBrand(brandData: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>): Promise<Brand> {
    const brandRef = db.instance.collection(collections.brands).doc()
    const brand: Brand = {
      ...brandData,
      id: brandRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    await brandRef.set(brand)
    return brand
  }

  static async getBrand(brandId: string): Promise<Brand | null> {
    const doc = await db.instance.collection(collections.brands).doc(brandId).get()
    if (!doc.exists) return null
    return { id: doc.id, ...doc.data() } as Brand
  }
  
  static async getUserBrands(userId: string, limit = 10): Promise<Brand[]> {
    const snapshot = await db.instance
      .collection(collections.brands)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Brand))
  }
  
  static async updateBrand(brandId: string, updates: Partial<Brand>): Promise<void> {
    await db.instance.collection(collections.brands).doc(brandId).update({
      ...updates,
      updatedAt: new Date(),
    })
  }

  static async deleteBrand(brandId: string): Promise<void> {
    await db.instance.collection(collections.brands).doc(brandId).delete()
  }

  // Site operations
  static async createSite(siteData: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>): Promise<Site> {
    const siteRef = db.instance.collection(collections.sites).doc()
    const site: Site = {
      ...siteData,
      id: siteRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    await siteRef.set(site)
    return site
  }

  static async getSite(siteId: string): Promise<Site | null> {
    const doc = await db.instance.collection(collections.sites).doc(siteId).get()
    if (!doc.exists) return null
    return { id: doc.id, ...doc.data() } as Site
  }

  static async getUserSites(userId: string): Promise<Site[]> {
    const snapshot = await db.instance
      .collection(collections.sites)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site))
  }

  static async updateSite(siteId: string, updates: Partial<Site>): Promise<void> {
    await db.instance.collection(collections.sites).doc(siteId).update({
      ...updates,
      updatedAt: new Date(),
    })
  }

  // Usage tracking
  static async recordUsage(
    userId: string, 
    type: UsageRecord['type'], 
    count: number = 1
  ): Promise<void> {
    const period = new Date().toISOString().slice(0, 7) // YYYY-MM
    const usageId = `${userId}_${type}_${period}`
    const usageRef = db.instance.collection(collections.usage).doc(usageId)
    
    const doc = await usageRef.get()
    if (doc.exists) {
      await usageRef.update({
        count: (doc.data()?.count || 0) + count,
        updatedAt: new Date(),
      })
    } else {
      await usageRef.set({
        id: usageId,
        userId,
        type,
        count,
        period,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  }

  static async getUserUsageRecords(userId: string, period?: string): Promise<UsageRecord[]> {
    const targetPeriod = period || new Date().toISOString().slice(0, 7)
    const snapshot = await db.instance
      .collection(collections.usage)
      .where('userId', '==', userId)
      .where('period', '==', targetPeriod)
      .get()
    
    return snapshot.docs.map(doc => doc.data() as UsageRecord)
  }

  // Plan checking
  static async checkUserPlan(userId: string, action: keyof typeof PLAN_LIMITS.free): Promise<{
    allowed: boolean
    remaining: number
    limit: number
    currentUsage: number
  }> {
    const user = await this.getUser(userId)
    if (!user) throw new Error('User not found')
    
    const limits = PLAN_LIMITS[user.plan]
    const limit = limits[action]
    
    // Unlimited for enterprise
    if (limit === -1) {
      return { allowed: true, remaining: -1, limit: -1, currentUsage: 0 }
    }
    
    const usageRecords = await this.getUserUsageRecords(userId)
    const typeMap: Record<string, UsageRecord['type']> = {
      brands: 'brand_generation',
      generations: 'brand_generation',
      logoVariations: 'logo_generation',
    }
    
    const usageType = typeMap[action] || 'brand_generation'
    const currentUsage = usageRecords
      .filter(r => r.type === usageType)
      .reduce((sum, r) => sum + r.count, 0)
    
    return {
      allowed: currentUsage < limit,
      remaining: Math.max(0, limit - currentUsage),
      limit,
      currentUsage,
    }
  }

  // User settings
  static async getUserSettings(userId: string): Promise<UserSettings | null> {
    const doc = await db.instance.collection(collections.settings).doc(userId).get()
    if (!doc.exists) return null
    return { id: doc.id, ...doc.data() } as UserSettings
  }

  static async createUserSettings(userId: string, settings?: Partial<UserSettings>): Promise<UserSettings> {
    const defaultSettings: UserSettings = {
      id: userId,
      userId,
      notifications: { email: true, push: true, marketing: false },
      theme: 'system',
      timezone: 'UTC',
      language: 'en',
      updatedAt: new Date(),
      ...settings,
    }
    
    await db.instance.collection(collections.settings).doc(userId).set(defaultSettings)
    return defaultSettings
  }

  static async updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<void> {
    await db.instance.collection(collections.settings).doc(userId).update({
      ...updates,
      updatedAt: new Date(),
    })
  }

  // Subscription operations
  static async getSubscription(userId: string): Promise<Subscription | null> {
    const snapshot = await db.instance
      .collection(collections.subscriptions)
      .where('userId', '==', userId)
      .limit(1)
      .get()
    
    if (snapshot.empty) return null
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Subscription
  }

  static async createSubscription(subData: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
    const subRef = db.instance.collection(collections.subscriptions).doc()
    const subscription: Subscription = {
      ...subData,
      id: subRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    await subRef.set(subscription)
    return subscription
  }

  static async updateSubscription(subscriptionId: string, updates: Partial<Subscription>): Promise<void> {
    await db.instance.collection(collections.subscriptions).doc(subscriptionId).update({
      ...updates,
      updatedAt: new Date(),
    })
  }

  // Password reset operations
  static async createPasswordReset(userId: string, token: string, expiresIn: number = 3600000): Promise<PasswordReset> {
    const resetRef = db.instance.collection(collections.passwordResets).doc()
    const reset: PasswordReset = {
      id: resetRef.id,
      userId,
      token,
      expiresAt: new Date(Date.now() + expiresIn),
      used: false,
      createdAt: new Date(),
    }
    
    await resetRef.set(reset)
    return reset
  }

  static async getPasswordResetByToken(token: string): Promise<PasswordReset | null> {
    const snapshot = await db.instance
      .collection(collections.passwordResets)
      .where('token', '==', token)
      .where('used', '==', false)
      .limit(1)
      .get()
    
    if (snapshot.empty) return null
    
    const reset = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PasswordReset
    if (new Date(reset.expiresAt) < new Date()) return null
    
    return reset
  }

  static async markPasswordResetUsed(resetId: string): Promise<void> {
    await db.instance.collection(collections.passwordResets).doc(resetId).update({ used: true })
  }

  // Generation tracking
  static async trackGeneration(generationData: Omit<Generation, 'id' | 'createdAt'>): Promise<Generation> {
    const genRef = db.instance.collection(collections.generations).doc()
    const generation: Generation = {
      ...generationData,
      id: genRef.id,
      createdAt: new Date(),
    }
    
    await genRef.set(generation)
    return generation
  }
  
  static async completeGeneration(generationId: string, result: any): Promise<void> {
    await db.instance.collection(collections.generations).doc(generationId).update({
      result,
      status: 'completed',
      completedAt: new Date(),
    })
  }
  
  // Analytics
  static async getAnalytics(userId: string, days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const [brandsSnapshot, generationsSnapshot] = await Promise.all([
      db.instance.collection(collections.brands)
        .where('userId', '==', userId)
        .where('createdAt', '>=', startDate)
        .get(),
      db.instance.collection(collections.generations)
        .where('userId', '==', userId)
        .where('createdAt', '>=', startDate)
        .get()
    ])
    
    return {
      totalBrands: brandsSnapshot.size,
      totalGenerations: generationsSnapshot.size,
      completedGenerations: generationsSnapshot.docs.filter(
        doc => doc.data().status === 'completed'
      ).length,
    }
  }

  // Additional methods for subscription and 3D rendering
  static async getUserById(userId: string): Promise<User | null> {
    return this.getUser(userId)
  }

  static async getUserUsage(userId: string): Promise<{ generationsThisMonth?: number; storageUsed?: number } | null> {
    const usageRecords = await this.getUserUsageRecords(userId)
    const generationsThisMonth = usageRecords
      .filter(r => r.type === 'brand_generation' || r.type === 'logo_generation')
      .reduce((sum, r) => sum + r.count, 0)
    
    return {
      generationsThisMonth,
      storageUsed: 0, // TODO: Calculate actual storage usage
    }
  }

  static async save3DRender(renderData: any): Promise<void> {
    const renderRef = db.instance.collection('renders').doc()
    await renderRef.set({
      ...renderData,
      id: renderRef.id,
      createdAt: new Date(),
    })
  }

  static async get3DRenders(userId: string, brandId?: string | null): Promise<any[]> {
    let query = db.instance.collection('renders').where('userId', '==', userId)
    
    if (brandId) {
      query = query.where('brandId', '==', brandId)
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get()
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }

  static async recordActivity(userId: string, activityType: string, data: any): Promise<void> {
    const activityRef = db.instance.collection('activities').doc()
    await activityRef.set({
      id: activityRef.id,
      userId,
      activityType,
      data,
      createdAt: new Date(),
    })
  }
}
