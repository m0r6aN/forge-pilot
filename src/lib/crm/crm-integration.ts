export interface CRMIntegration {
  id: string
  customerId: string
  provider: 'hubspot' | 'salesforce' | 'pipedrive' | 'zoho' | 'custom'
  credentials: Record<string, string>
  syncSettings: SyncSettings
  lastSync: Date
  status: 'active' | 'inactive' | 'error'
}

export interface SyncSettings {
  syncContacts: boolean
  syncDeals: boolean
  syncCompanies: boolean
  syncActivities: boolean
  syncFrequency: 'realtime' | 'hourly' | 'daily'
  fieldMappings: Record<string, string>
}

export interface CRMContact {
  id: string
  email: string
  firstName: string
  lastName: string
  company: string
  phone?: string
  source: string
  tags: string[]
  customFields: Record<string, any>
  brandInterests: string[]
  engagementScore: number
  lastActivity: Date
}

export class CRMIntegrationManager {
  
  async connectCRM(customerId: string, provider: string, credentials: Record<string, string>): Promise<CRMIntegration> {
    // Validate credentials
    await this.validateCRMCredentials(provider, credentials)
    
    // Create integration
    const integration: CRMIntegration = {
      id: `crm_${Date.now()}`,
      customerId,
      provider: provider as any,
      credentials: this.encryptCredentials(credentials),
      syncSettings: {
        syncContacts: true,
        syncDeals: true,
        syncCompanies: true,
        syncActivities: true,
        syncFrequency: 'daily',
        fieldMappings: this.getDefaultFieldMappings(provider)
      },
      lastSync: new Date(),
      status: 'active'
    }
    
    // Initial sync
    await this.performInitialSync(integration)
    
    return integration
  }
  
  async syncBrandDataToCRM(customerId: string, brandId: string): Promise<void> {
    const integration = await this.getCRMIntegration(customerId)
    if (!integration) return
    
    const brand = await this.getBrandData(brandId)
    const customer = await this.getCustomerData(customerId)
    
    // Create/update contact in CRM
    const crmContact = await this.createCRMContact(integration, customer, brand)
    
    // Create deal/opportunity
    const deal = await this.createCRMDeal(integration, customer, brand)
    
    // Log activity
    await this.logCRMActivity(integration, crmContact.id, 'brand_created', {
      brandName: brand.brandName,
      industry: brand.industry,
      value: brand.estimatedValue
    })
  }
  
  private async createCRMContact(integration: CRMIntegration, customer: any, brand: any): Promise<any> {
    const contactData = {
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      company: brand.brandName,
      phone: customer.phone,
      source: 'BrandGenie AI',
      customFields: {
        brandgenie_customer_id: customer.id,
        brandgenie_plan: customer.plan,
        brand_industry: brand.industry,
        brand_target_audience: brand.targetAudience,
        brand_estimated_value: brand.estimatedValue,
        signup_date: customer.createdAt,
        last_brand_created: new Date()
      }
    }
    
    switch (integration.provider) {
      case 'hubspot':
        return await this.createHubSpotContact(integration, contactData)
      case 'salesforce':
        return await this.createSalesforceContact(integration, contactData)
      case 'pipedrive':
        return await this.createPipedriveContact(integration, contactData)
      default:
        throw new Error(`Unsupported CRM provider: ${integration.provider}`)
    }
  }
  
  private async createCRMDeal(integration: CRMIntegration, customer: any, brand: any): Promise<any> {
    const dealData = {
      name: `${brand.brandName} - Brand Development`,
      value: this.calculateDealValue(customer, brand),
      stage: this.getDealStage(customer),
      closeDate: this.estimateCloseDate(customer),
      customFields: {
        brand_name: brand.brandName,
        brand_industry: brand.industry,
        services_interested: this.getServicesInterested(customer),
        brandgenie_customer_id: customer.id
      }
    }
    
    switch (integration.provider) {
      case 'hubspot':
        return await this.createHubSpotDeal(integration, dealData)
      case 'salesforce':
        return await this.createSalesforceDeal(integration, dealData)
      case 'pipedrive':
        return await this.createPipedriveDeal(integration, dealData)
    }
  }
  
  async syncMarketingDataToCRM(customerId: string, campaignData: any): Promise<void> {
    const integration = await this.getCRMIntegration(customerId)
    if (!integration) return
    
    // Update contact with marketing data
    await this.updateCRMContactWithMarketingData(integration, customerId, campaignData)
    
    // Create marketing activities
    await this.logMarketingActivities(integration, customerId, campaignData)
  }
  
  async createLeadFromBrandGeneration(brandData: any, customerData: any): Promise<void> {
    // This runs when someone generates a brand (even free users)
    const leadData = {
      email: customerData.email,
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      company: brandData.brandName,
      source: 'BrandGenie AI - Free Brand Generation',
      leadScore: this.calculateLeadScore(customerData, brandData),
      interests: [brandData.industry, 'branding', 'business development'],
      customFields: {
        brand_generated: brandData.brandName,
        industry: brandData.industry,
        target_audience: brandData.targetAudience,
        generation_date: new Date(),
        conversion_potential: this.assessConversionPotential(customerData, brandData)
      }
    }
    
    // Add to all connected CRMs
    const integrations = await this.getAllCRMIntegrations()
    for (const integration of integrations) {
      await this.createCRMLead(integration, leadData)
    }
  }
  
  private calculateLeadScore(customer: any, brand: any): number {
    let score = 0
    
    // Industry scoring
    const highValueIndustries = ['technology', 'healthcare', 'finance', 'consulting']
    if (highValueIndustries.includes(brand.industry.toLowerCase())) score += 20
    
    // Company size indicators
    if (brand.targetAudience.includes('enterprise') || brand.targetAudience.includes('B2B')) score += 15
    
    // Engagement scoring
    if (customer.hasCompletedProfile) score += 10
    if (customer.hasUploadedLogo) score += 5
    if (customer.timeSpentOnPlatform > 300) score += 10 // 5+ minutes
    
    // Email domain scoring
    const businessDomains = ['gmail.com', 'yahoo.com', 'hotmail.com']
    if (!businessDomains.includes(customer.email.split('@')[1])) score += 15
    
    return Math.min(score, 100)
  }
  
  async automateFollowUpSequences(): Promise<void> {
    // Get all leads that need follow-up
    const leadsNeedingFollowUp = await this.getLeadsNeedingFollowUp()
    
    for (const lead of leadsNeedingFollowUp) {
      const followUpType = this.determineFollowUpType(lead)
      await this.triggerFollowUpSequence(lead, followUpType)
    }
  }
  
  private async triggerFollowUpSequence(lead: any, type: string): Promise<void> {
    switch (type) {
      case 'free-user-conversion':
        await this.sendConversionEmail(lead)
        await this.scheduleFollowUpCall(lead, 3) // 3 days
        break
        
      case 'trial-expiring':
        await this.sendTrialExpirationEmail(lead)
        await this.offerExtendedTrial(lead)
        break
        
      case 'inactive-customer':
        await this.sendReEngagementEmail(lead)
        await this.offerSpecialDiscount(lead)
        break
        
      case 'upsell-opportunity':
        await this.sendUpsellEmail(lead)
        await this.scheduleStrategyCall(lead)
        break
    }
  }
}