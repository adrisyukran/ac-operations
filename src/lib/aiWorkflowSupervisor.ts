/**
 * AI Workflow Supervisor
 * Flags potential issues in completed jobs using rule-based checks and AI summarization.
 */

import { supabase } from './supabase'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Alert {
  orderId: string
  orderNo: string
  customerName: string
  type: 'price_overrun' | 'missing_photos' | 'missing_work_description'
  severity: 'high' | 'medium' | 'low'
  message: string
  details: {
    quotedPrice?: number
    finalAmount?: number
    technicianName?: string
  }
}

// ============================================================================
// RULE-BASED SUPERVISION
// ============================================================================

/**
 * Supervises completed jobs (status: 'job_done' or 'reviewed') for potential issues.
 * Runs rule-based checks:
 * - Price overrun: final_amount > quoted_price * 1.5 (50%+ over quote) → severity 'high'
 * - Missing photos: photo_urls array is empty → severity 'medium'
 * - Missing work description: work_done is null or empty → severity 'low'
 *
 * @returns { alerts: Alert[], checkedCount: number }
 */
export async function superviseCompletedJobs(): Promise<{ alerts: Alert[]; checkedCount: number }> {
  const alerts: Alert[] = []

  // Fetch orders with status 'job_done' or 'reviewed', joined with technician name
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_no,
      customer_name,
      quoted_price,
      final_amount,
      photo_urls,
      work_done,
      technician_id,
      technicians (
        name
      )
    `)
    .in('status', ['job_done', 'reviewed'])

  if (error) {
    console.error('Error fetching completed jobs:', error)
    return { alerts: [], checkedCount: 0 }
  }

  if (!orders || orders.length === 0) {
    return { alerts: [], checkedCount: 0 }
  }

  // Run rule-based checks on each order
  for (const order of orders) {
    const technicianName = (order as any).technicians?.name || 'Unknown'

    // Check 1: Price overrun (50% or more over quote)
    if (order.quoted_price && order.final_amount) {
      if (order.final_amount > order.quoted_price * 1.5) {
        alerts.push({
          orderId: order.id,
          orderNo: order.order_no,
          customerName: order.customer_name,
          type: 'price_overrun',
          severity: 'high',
          message: `Final amount ${order.final_amount} exceeds quoted price ${order.quoted_price} by more than 50%`,
          details: {
            quotedPrice: order.quoted_price,
            finalAmount: order.final_amount,
            technicianName,
          },
        })
      }
    }

    // Check 2: Missing photos
    if (!order.photo_urls || order.photo_urls.length === 0) {
      alerts.push({
        orderId: order.id,
        orderNo: order.order_no,
        customerName: order.customer_name,
        type: 'missing_photos',
        severity: 'medium',
        message: 'No photos uploaded for this completed job',
        details: {
          quotedPrice: order.quoted_price ?? undefined,
          finalAmount: order.final_amount ?? undefined,
          technicianName,
        },
      })
    }

    // Check 3: Missing work description
    if (!order.work_done || order.work_done.trim() === '') {
      alerts.push({
        orderId: order.id,
        orderNo: order.order_no,
        customerName: order.customer_name,
        type: 'missing_work_description',
        severity: 'low',
        message: 'Work description is missing for this job',
        details: {
          quotedPrice: order.quoted_price ?? undefined,
          finalAmount: order.final_amount ?? undefined,
          technicianName,
        },
      })
    }
  }

  return {
    alerts,
    checkedCount: orders.length,
  }
}

// ============================================================================
// AI SUMMARIZATION (OPTIONAL)
// ============================================================================

/**
 * Generates a brief natural language summary of alerts using AI.
 * Only executes if VITE_OPENAI_API_KEY is available.
 *
 * @param alerts - Array of alerts to summarize
 * @returns Summary string, or empty string if AI fails or API key missing
 */
export async function getAISupervisorSummary(alerts: Alert[]): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!apiKey) {
    return ''
  }

  if (alerts.length === 0) {
    return 'No issues detected in completed jobs.'
  }

  const alertsSummary = alerts
    .map((a) => {
      return `- ${a.type.replace(/_/g, ' ')}: ${a.message} (Order: ${a.orderNo}, Customer: ${a.customerName}, Severity: ${a.severity})`
    })
    .join('\n')

  const systemPrompt = `You are a workflow supervisor for an AC service operations team.
Your task is to provide a brief, actionable summary of job completion issues.
Keep it concise and professional - maximum 2-3 sentences.
Focus on the most critical issues first.`

  const userMessage = `Summarize these job completion alerts:\n\n${alertsSummary}`

  try {
    const response = await fetch('https://nano-gpt.com/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-super-120b-a12b',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        max_tokens: 300,
        temperature: 0.5,
      }),
    })

    if (!response.ok) {
      console.error('AI summary request failed:', response.status)
      return ''
    }

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content?.trim() || ''

    return summary
  } catch (err) {
    console.error('Error getting AI supervisor summary:', err)
    return ''
  }
}
