export interface Invoice {
  id: string
  customerId: string
  clientId: string
  invoiceNumber: string
  date: Date
  dueDate: Date
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  paymentTerms: string
  notes?: string
  brandingConfig: BrandingConfig
}

export interface InvoiceItem {
  description: string
  quantity: number
  rate: number
  amount: number
  taxable: boolean
}

export class InvoiceManager {
  private paymentProcessors: PaymentProcessor[]

  constructor() {
    this.paymentProcessors = [
      new StripeProcessor(),
      new PayPalProcessor(),
      new SquareProcessor()
    ]
  }

  async createInvoice(customerId: string, invoiceData: Partial<Invoice>): Promise<Invoice> {
    // Get customer branding
    const branding = await this.getCustomerBranding(customerId)
    
    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(customerId)
    
    // Calculate totals
    const { subtotal, tax, total } = this.calculateTotals(invoiceData.items || [])
    
    const invoice: Invoice = {
      id: `inv_${Date.now()}`,
      customerId,
      invoiceNumber,
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      subtotal,
      tax,
      total,
      status: 'draft',
      paymentTerms: 'Net 30',
      brandingConfig: branding,
      ...invoiceData
    }

    // Store invoice
    await FirestoreService.saveInvoice(invoice)
    
    return invoice
  }

  async generateInvoicePDF(invoiceId: string): Promise<string> {
    const invoice = await this.getInvoice(invoiceId)
    
    // Generate branded PDF using customer's brand assets
    const pdfBuffer = await this.createBrandedPDF(invoice)
    
    // Upload to storage
    const pdfUrl = await this.uploadPDF(pdfBuffer, invoiceId)
    
    return pdfUrl
  }

  async sendInvoice(invoiceId: string, method: 'email' | 'sms' | 'both'): Promise<void> {
    const invoice = await this.getInvoice(invoiceId)
    const pdfUrl = await this.generateInvoicePDF(invoiceId)
    
    // Create payment link
    const paymentLink = await this.createPaymentLink(invoice)
    
    if (method === 'email' || method === 'both') {
      await this.sendInvoiceEmail(invoice, pdfUrl, paymentLink)
    }
    
    if (method === 'sms' || method === 'both') {
      await this.sendInvoiceSMS(invoice, paymentLink)
    }
    
    // Update status
    await this.updateInvoiceStatus(invoiceId, 'sent')
  }

  async processPayment(invoiceId: string, paymentData: any): Promise<any> {
    const invoice = await this.getInvoice(invoiceId)
    
    // Process payment through preferred processor
    const processor = this.getPreferredProcessor(invoice.customerId)
    const paymentResult = await processor.processPayment({
      amount: invoice.total,
      currency: 'USD',
      description: `Invoice ${invoice.invoiceNumber}`,
      ...paymentData
    })
    
    if (paymentResult.success) {
      // Update invoice status
      await this.updateInvoiceStatus(invoiceId, 'paid')
      
      // Record payment
      await this.recordPayment(invoiceId, paymentResult)
      
      // Send confirmation
      await this.sendPaymentConfirmation(invoice, paymentResult)
    }
    
    return paymentResult
  }
}