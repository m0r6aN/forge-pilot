import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIRESTORE_SERVICE_ACCOUNT_KEY || '{}'
  )
  
  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  })
}

export const db = getFirestore()

// Collections
export const collections = {
  users: 'users',
  brands: 'brands',
  generations: 'generations',
  subscriptions: 'subscriptions',
  analytics: 'analytics',
} as const

// Types
export interface User {
  id: string
  email: string
  name: string
  plan: 'free' | 'starter' | 'growth'
  stripeCustomerId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Brand {
  id: string
  userId: string
  brandName: string
  tagline: string
  colorPalette: string[]
  brandVoice: string
  typography: string
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
  type: 'brand' | 'logo' | 'variation'
  prompt: string
  result?: any
  status: 'pending' | 'completed' | 'failed'
  error?: string
  createdAt: Date
  completedAt?: Date
}

// Database helpers
export class FirestoreService {
  static async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const userRef = db.collection(collections.users).doc()
    const user: User = {
      ...userData,
      id: userRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    await userRef.set(user)
    return user
  }
  
  static async getUserByEmail(email: string): Promise<User | null> {
    const snapshot = await db
      .collection(collections.users)
      .where('email', '==', email)
      .limit(1)
      .get()
    
    if (snapshot.empty) return null
    
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() } as User
  }
  
  static async createBrand(brandData: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>): Promise<Brand> {
    const brandRef = db.collection(collections.brands).doc()
    const brand: Brand = {
      ...brandData,
      id: brandRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    await brandRef.set(brand)
    return brand
  }
  
  static async getUserBrands(userId: string, limit = 10): Promise<Brand[]> {
    const snapshot = await db
      .collection(collections.brands)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Brand))
  }
  
  static async updateBrand(brandId: string, updates: Partial<Brand>): Promise<void> {
    await db.collection(collections.brands).doc(brandId).update({
      ...updates,
      updatedAt: new Date(),
    })
  }
  
  static async trackGeneration(generationData: Omit<Generation, 'id' | 'createdAt'>): Promise<Generation> {
    const genRef = db.collection(collections.generations).doc()
    const generation: Generation = {
      ...generationData,
      id: genRef.id,
      createdAt: new Date(),
    }
    
    await genRef.set(generation)
    return generation
  }
  
  static async completeGeneration(generationId: string, result: any): Promise<void> {
    await db.collection(collections.generations).doc(generationId).update({
      result,
      status: 'completed',
      completedAt: new Date(),
    })
  }
  
  static async getAnalytics(userId: string, days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const [brandsSnapshot, generationsSnapshot] = await Promise.all([
      db.collection(collections.brands)
        .where('userId', '==', userId)
        .where('createdAt', '>=', startDate)
        .get(),
      db.collection(collections.generations)
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
}