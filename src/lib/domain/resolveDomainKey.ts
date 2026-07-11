const DOMAIN_KEYWORDS: Array<{ key: string; patterns: RegExp[] }> = [
  {
    key: 'landscaping_service',
    patterns: [/\blandscap/i, /\blawn\b/i, /\byard\b/i, /\bmow(ing)?\b/i, /\bgard(en|ening)\b/i],
  },
  {
    key: 'home_cleaning_service',
    patterns: [/\bhome cleaning\b/i, /\bhouse cleaning\b/i, /\bmaid\b/i, /\bcleaning service\b/i],
  },
  {
    key: 'food_truck',
    patterns: [/\bfood truck\b/i, /\bmobile kitchen\b/i, /\bstreet food\b/i],
  },
  {
    key: 'fitness_studio',
    patterns: [/\bfitness\b/i, /\bgym\b/i, /\byoga\b/i, /\bpilates\b/i, /\bspin studio\b/i],
  },
  {
    key: 'cafe_coffee_shop',
    patterns: [/\bcafe\b/i, /\bcoffee shop\b/i, /\bespresso\b/i, /\bbarista\b/i],
  },
  {
    key: 'retail_boutique',
    patterns: [/\bboutique\b/i, /\bretail\b/i, /\bapparel\b/i, /\bfashion store\b/i],
  },
  {
    key: 'corporate_fleet_carwash',
    patterns: [/\bfleet\b/i, /\bcar wash\b/i, /\bdetailing\b/i, /\bvehicle wash\b/i],
  },
  {
    key: 'nonprofit_community_initiative',
    patterns: [/\bnonprofit\b/i, /\bnon-profit\b/i, /\bcharity\b/i, /\bcommunity initiative\b/i, /\bngo\b/i],
  },
]

export const SEEDED_DOMAIN_KEYS = DOMAIN_KEYWORDS.map((item) => item.key)

export function resolveDomainKeyFromIdea(idea: string): string | null {
  const normalized = idea.trim()
  if (!normalized) {
    return null
  }

  for (const candidate of DOMAIN_KEYWORDS) {
    if (candidate.patterns.some((pattern) => pattern.test(normalized))) {
      return candidate.key
    }
  }

  return null
}
