/**
 * AI Operational Insight Library
 * Provides AI-powered analysis of technician workload and operational data.
 */

import { supabase } from './supabase'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Aggregated workload data for a single technician
 */
export interface TechnicianWorkload {
  technicianId: string
  technicianName: string
  jobsCompleted: number
  totalRevenue: number
  avgJobValue: number
}

/**
 * Complete insight response from AI analysis
 */
export interface OperationalInsight {
  question: string
  answer: string
  data: TechnicianWorkload[]
  generatedAt: string
}

// ============================================================================
// DATE HELPER FUNCTIONS
// ============================================================================

/**
 * Get the start (Monday 00:00) and end (Sunday 23:59:59) of the current week
 */
function getThisWeekDateRange(): { start: string; end: string } {
  const now = new Date()
  
  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = now.getDay()
  
  // Calculate days to subtract to get to Monday
  // Sunday (0) -> 6 days back, Monday (1) -> 0 days back, etc.
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  
  // Get Monday 00:00:00
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysToMonday)
  monday.setHours(0, 0, 0, 0)
  
  // Get Sunday 23:59:59
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  
  return {
    start: monday.toISOString(),
    end: sunday.toISOString(),
  }
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch technician workload data for this week (Monday to Sunday).
 * Only includes completed orders (job_done, reviewed, closed).
 */
export async function getTechnicianWorkload(): Promise<TechnicianWorkload[]> {
  const { start, end } = getThisWeekDateRange()
  
  const completedStatuses = ['job_done', 'reviewed', 'closed']
  
  // Query orders with completed statuses within this week
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      technician_id,
      final_amount,
      technicians (
        id,
        name
      )
    `)
    .in('status', completedStatuses)
    .gte('updated_at', start)
    .lte('updated_at', end)
    .not('technician_id', 'is', null)
    .not('final_amount', 'is', null)
  
  if (error) {
    console.error('Error fetching technician workload:', error)
    return []
  }
  
  if (!orders || orders.length === 0) {
    return []
  }
  
  // Group by technician
  const workloadMap = new Map<string, {
    technicianId: string
    technicianName: string
    jobsCompleted: number
    totalRevenue: number
  }>()
  
  for (const order of orders) {
    const tech = order.technicians as unknown as { id: string; name: string } | null
    if (!tech) continue
    
    const existing = workloadMap.get(tech.id)
    const amount = Number(order.final_amount) || 0
    
    if (existing) {
      existing.jobsCompleted++
      existing.totalRevenue += amount
    } else {
      workloadMap.set(tech.id, {
        technicianId: tech.id,
        technicianName: tech.name,
        jobsCompleted: 1,
        totalRevenue: amount,
      })
    }
  }
  
  // Calculate average job value and format result
  const result: TechnicianWorkload[] = []
  
  for (const [, data] of workloadMap) {
    result.push({
      technicianId: data.technicianId,
      technicianName: data.technicianName,
      jobsCompleted: data.jobsCompleted,
      totalRevenue: data.totalRevenue,
      avgJobValue: data.jobsCompleted > 0 ? data.totalRevenue / data.jobsCompleted : 0,
    })
  }
  
  // Sort by total revenue descending
  result.sort((a, b) => b.totalRevenue - a.totalRevenue)
  
  return result
}

// ============================================================================
// AI ANALYSIS
// ============================================================================

/**
 * Send workload data to AI for analysis and get operational insights.
 * Falls back to basic summary if API key is missing.
 */
export async function askOperationalQuestion(question: string): Promise<OperationalInsight> {
  const workloadData = await getTechnicianWorkload()
  const generatedAt = new Date().toISOString()
  
  // If no data, return empty result
  if (workloadData.length === 0) {
    return {
      question,
      answer: 'No completed jobs found for this week yet.',
      data: [],
      generatedAt,
    }
  }
  
  // Check if API key is available
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    // Fallback: return basic summary without AI formatting
    const summary = workloadData
      .map(t => `${t.technicianName}: ${t.jobsCompleted} jobs, RM ${t.totalRevenue.toFixed(2)} total`)
      .join('\n')
    
    return {
      question,
      answer: `No AI API key configured. Raw data:\n${summary}`,
      data: workloadData,
      generatedAt,
    }
  }
  
  // Prepare the AI prompt
  const prompt = `You are an operations analyst. Based on the following technician workload data for this week, answer the user's question concisely.

Data: ${JSON.stringify(workloadData, null, 2)}

User question: ${question}

Provide a clear, actionable insight. Mention specific numbers and names where relevant.`
  
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
            content: 'You are an operations analyst for an AC service company. Analyze technician workload data and provide clear, actionable insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    })
    
    if (!response.ok) {
      console.error('AI API error:', response.status)
      throw new Error(`AI API returned ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return {
        question,
        answer: data.choices[0].message.content.trim(),
        data: workloadData,
        generatedAt,
      }
    }
    
    // Fallback if response format is unexpected
    return {
      question,
      answer: 'Received unexpected response format from AI.',
      data: workloadData,
      generatedAt,
    }
  } catch (error) {
    console.error('Error calling AI API:', error)
    
    // Fallback: return raw data summary
    const summary = workloadData
      .map(t => `${t.technicianName}: ${t.jobsCompleted} jobs, RM ${t.totalRevenue.toFixed(2)} total`)
      .join('\n')
    
    return {
      question,
      answer: `AI analysis failed. Raw data:\n${summary}`,
      data: workloadData,
      generatedAt,
    }
  }
}
