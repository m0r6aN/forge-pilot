import { FirestoreService } from '@/lib/db/firestore'

export type PlanType = 'free' | 'starter' | 'growth' | 'scale' | 'enterprise'

export interface PlanLimits {
  brands: number
  generations: number
  storage: number // in MB
  features: string[]
}

const planLimits: Record<PlanType, PlanLimits> = {
  free: {
    brands: 1,
    generations: 5,
    storage: 100,
    features: ['basic-branding', 'logo-generation', 'color-palettes'],
  },
  starter: {
    brands: 3,
    generations: 50,
    storage: 1000,
    features: [
      'basic-branding',
      'logo-generation',
      'color-palettes',
      'typography',
      'brand-voice',
      'social-media-templates',
    ],
  },
  growth: {
    brands: 10,
    generations: 200,
    storage: 5000,
    features: [
      'basic-branding',
      'logo-generation',
      'color-palettes',
      'typography',
      'brand-voice',
      'social-media-templates',
      '3d-rendering',
      'domain-registration',
      'site-hosting',
      'advanced-analytics',
    ],
  },
  scale: {
    brands: 50,
    generations: 1000,
    storage: 25000,
    features: [
      'basic-branding',
      'logo-generation',
      'color-palettes',
      'typography',
      'brand-voice',
      'social-media-templates',
      '3d-rendering',
      'domain-registration',
      'site-hosting',
      'advanced-analytics',
      'white-label',
      'api-access',
      'priority-support',
    ],
  },
  enterprise: {
    brands: -1, // unlimited
    generations: -1, // unlimited
    storage: -1, // unlimited
    features: [
      'basic-branding',
      'logo-generation',
      'color-palettes',
      'typography',
      'brand-voice',
      'social-media-templates',
      '3d-rendering',
      'domain-registration',
      'site-hosting',
      'advanced-analytics',
      'white-label',
      'api-access',
      'priority-support',
      'custom-integrations',
      'dedicated-support',
      'sla-guarantee',
    ],
  },
}

/**
 * Get the user's current plan
 */
export async function checkUserPlan(userId: string): Promise<PlanType> {
  try {
    const user = await FirestoreService.getUserById(userId)
    return (user?.plan as PlanType) || 'free'
  } catch (error) {
    console.error('Error checking user plan:', error)
    return 'free'
  }
}

/**
 * Get plan limits for a specific plan
 */
export function getPlanLimits(plan: PlanType): PlanLimits {
  return planLimits[plan]
}

/**
 * Check if a user has access to a specific feature
 */
export async function hasFeatureAccess(
  userId: string,
  feature: string
): Promise<boolean> {
  const plan = await checkUserPlan(userId)
  const limits = getPlanLimits(plan)
  return limits.features.includes(feature)
}

/**
 * Check if a user can create more brands
 */
export async function canCreateBrand(userId: string): Promise<boolean> {
  const plan = await checkUserPlan(userId)
  const limits = getPlanLimits(plan)
  
  // Unlimited brands
  if (limits.brands === -1) {
    return true
  }
  
  const brands = await FirestoreService.getUserBrands(userId)
  return brands.length < limits.brands
}

/**
 * Check if a user can perform more generations
 */
export async function canGenerate(userId: string): Promise<boolean> {
  const plan = await checkUserPlan(userId)
  const limits = getPlanLimits(plan)
  
  // Unlimited generations
  if (limits.generations === -1) {
    return true
  }
  
  const usage = await FirestoreService.getUserUsage(userId)
  return (usage?.generationsThisMonth || 0) < limits.generations
}

/**
 * Get user's usage statistics
 */
export async function getUserUsageStats(userId: string) {
  const plan = await checkUserPlan(userId)
  const limits = getPlanLimits(plan)
  const usage = await FirestoreService.getUserUsage(userId)
  const brands = await FirestoreService.getUserBrands(userId)
  
  return {
    plan,
    limits,
    usage: {
      brands: brands.length,
      generations: usage?.generationsThisMonth || 0,
      storage: usage?.storageUsed || 0,
    },
    remaining: {
      brands: limits.brands === -1 ? -1 : Math.max(0, limits.brands - brands.length),
      generations: limits.generations === -1 ? -1 : Math.max(0, limits.generations - (usage?.generationsThisMonth || 0)),
      storage: limits.storage === -1 ? -1 : Math.max(0, limits.storage - (usage?.storageUsed || 0)),
    },
  }
}
