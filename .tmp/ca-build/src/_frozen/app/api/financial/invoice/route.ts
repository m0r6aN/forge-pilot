import { NextRequest, NextResponse } from 'next/server'
import { InvoiceManager } from '@/lib/financial/invoice-manager'
import { verifyJWT } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const payload = await verifyJWT(token)
    const userId = payload.userId
    
    const body = await request.json()
    const { invoiceData, sendMethod } = body
    
    const invoiceManager = new InvoiceManager()
    
    // Create invoice
    const invoice = await invoiceManager.createInvoice(userId, invoiceData)
    
    // Send if requested
    if (sendMethod) {
      await invoiceManager.sendInvoice(invoice.id, sendMethod)
    }
    
    return NextResponse.json({
      success: true,
      invoice,
      pdfUrl: await invoiceManager.generateInvoicePDF(invoice.id),
      message: 'Invoice created successfully!'
    })
    
  } catch (error) {
    console.error('Invoice creation error:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}