/**
 * AI Assistant Orchestrator
 * Part of Phase 6: AI Operations Query feature.
 * 
 * Receives user questions, parses them, queries Supabase for data,
 * and formats human-readable responses.
 */

import { supabase } from './supabase'
import {
  parseQuery,
  getDateRangeFilter,
  ParsedQuery,
  DateRange,
} from './aiQueryParser'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface OrderInfo {
  id: string
  order_no: string
  work_done: string | null
  service_type: string | null
  final_amount: number | null
  technician_id: string | null
}

// ============================================================================
// DATE RANGE LABEL HELPER
// ============================================================================

/**
 * Converts a DateRange enum value to a human-readable label.
 */
function getDateRangeLabel(dateRange: DateRange): string {
  switch (dateRange) {
    case 'today':
      return 'today'
    case 'this_week':
      return 'this week'
    case 'last_week':
      return 'last week'
    case 'this_month':
      return 'this month'
    case 'unknown':
    default:
      return ''
  }
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Fetches completed jobs for a specific technician.
 * For 'list_jobs' intent when technician name is specified.
 */
async function fetchJobsByTechnician(parsed: ParsedQuery): Promise<string> {
  try {
    if (!parsed.technicianName) {
      return 'Please specify a technician name.'
    }

    // Look up technician by name
    const { data: technician, error: techError } = await supabase
      .from('technicians')
      .select('id, name')
      .ilike('name', parsed.technicianName)
      .single()

    if (techError || !technician) {
      return `Technician "${parsed.technicianName}" not found.`
    }

    // Build query for completed jobs
    const { gte, lt } = getDateRangeFilter(parsed.dateRange)
    
    let query = supabase
      .from('orders')
      .select('order_no, work_done, service_type')
      .eq('technician_id', technician.id)
      .eq('status', 'job_done')
      .order('updated_at', { ascending: false })

    if (gte) {
      query = query.gte('updated_at', gte)
    }
    if (lt) {
      query = query.lt('updated_at', lt)
    }

    const { data: jobs, error: jobsError } = await query

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
      return 'Failed to fetch jobs data.'
    }

    const dateLabel = getDateRangeLabel(parsed.dateRange)
    const dateLabelText = dateLabel ? ` ${dateLabel}` : ''

    if (!jobs || jobs.length === 0) {
      return `No completed jobs found for technician ${technician.name}${dateLabelText}.`
    }

    const jobList = jobs
      .map((job) => {
        const description = job.work_done || job.service_type || 'No description'
        return `${job.order_no} – ${description}`
      })
      .join('\n')

    return `Technician ${technician.name} completed ${jobs.length} jobs${dateLabelText}:\n${jobList}`
  } catch (error) {
    console.error('Error in fetchJobsByTechnician:', error)
    return 'An error occurred while fetching jobs.'
  }
}

/**
 * Counts completed jobs.
 * For 'count_jobs' intent.
 */
async function fetchJobCount(parsed: ParsedQuery): Promise<string> {
  try {
    const { gte, lt } = getDateRangeFilter(parsed.dateRange)
    const dateLabel = getDateRangeLabel(parsed.dateRange)
    const dateLabelText = dateLabel ? ` ${dateLabel}` : ' '

    // If technician specified, look up their ID first
    let technicianFilter: string | null = null
    if (parsed.technicianName) {
      const { data: technician, error: techError } = await supabase
        .from('technicians')
        .select('id, name')
        .ilike('name', parsed.technicianName)
        .single()

      if (techError || !technician) {
        return `Technician "${parsed.technicianName}" not found.`
      }
      technicianFilter = technician.id
    }

    let query = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'job_done')

    if (gte) {
      query = query.gte('updated_at', gte)
    }
    if (lt) {
      query = query.lt('updated_at', lt)
    }
    if (technicianFilter) {
      query = query.eq('technician_id', technicianFilter)
    }

    const { count, error } = await query

    if (error) {
      console.error('Error counting jobs:', error)
      return 'Failed to count jobs.'
    }

    const jobCount = count || 0

    if (parsed.technicianName && technicianFilter) {
      // Look up technician name again for the response
      const { data: technician } = await supabase
        .from('technicians')
        .select('name')
        .eq('id', technicianFilter)
        .single()
      
      const name = technician?.name || parsed.technicianName
      return `Technician ${name} completed ${jobCount} jobs${dateLabelText}${dateLabel ? '.' : ''}`
    }

    return `${jobCount} jobs were completed${dateLabelText}${dateLabel ? '.' : ''}`
  } catch (error) {
    console.error('Error in fetchJobCount:', error)
    return 'An error occurred while counting jobs.'
  }
}

/**
 * Finds the technician with the most completed jobs.
 * For 'top_technician' intent.
 */
async function fetchTopTechnician(parsed: ParsedQuery): Promise<string> {
  try {
    const { gte, lt } = getDateRangeFilter(parsed.dateRange)
    const dateLabel = getDateRangeLabel(parsed.dateRange)
    const dateLabelText = dateLabel ? ` ${dateLabel}` : ''

    // Query all completed jobs with technician info
    let query = supabase
      .from('orders')
      .select('technician_id')
      .eq('status', 'job_done')

    if (gte) {
      query = query.gte('updated_at', gte)
    }
    if (lt) {
      query = query.lt('updated_at', lt)
    }

    const { data: jobs, error } = await query

    if (error) {
      console.error('Error fetching jobs for top technician:', error)
      return 'Failed to determine top technician.'
    }

    if (!jobs || jobs.length === 0) {
      return `No completed jobs found${dateLabelText}.`
    }

    // Count jobs per technician
    const technicianCounts: Record<string, number> = {}
    for (const job of jobs) {
      if (job.technician_id) {
        technicianCounts[job.technician_id] = (technicianCounts[job.technician_id] || 0) + 1
      }
    }

    // Find the technician with most jobs
    let topTechnicianId: string | null = null
    let maxCount = 0
    for (const [techId, count] of Object.entries(technicianCounts)) {
      if (count > maxCount) {
        maxCount = count
        topTechnicianId = techId
      }
    }

    if (!topTechnicianId) {
      return `No completed jobs found${dateLabelText}.`
    }

    // Get technician name
    const { data: technician, error: techError } = await supabase
      .from('technicians')
      .select('name')
      .eq('id', topTechnicianId)
      .single()

    if (techError || !technician) {
      return `Top technician completed ${maxCount} jobs${dateLabelText}.`
    }

    return `Technician ${technician.name} completed the most jobs${dateLabelText} with ${maxCount} completed jobs.`
  } catch (error) {
    console.error('Error in fetchTopTechnician:', error)
    return 'An error occurred while determining top technician.'
  }
}

/**
 * Calculates total revenue from completed jobs.
 * For 'revenue' intent.
 */
async function fetchRevenue(parsed: ParsedQuery): Promise<string> {
  try {
    const { gte, lt } = getDateRangeFilter(parsed.dateRange)
    const dateLabel = getDateRangeLabel(parsed.dateRange)
    const dateLabelText = dateLabel ? ` ${dateLabel}` : ''

    // If technician specified, look up their ID first
    let technicianFilter: string | null = null
    if (parsed.technicianName) {
      const { data: technician, error: techError } = await supabase
        .from('technicians')
        .select('id, name')
        .ilike('name', parsed.technicianName)
        .single()

      if (techError || !technician) {
        return `Technician "${parsed.technicianName}" not found.`
      }
      technicianFilter = technician.id
    }

    let query = supabase
      .from('orders')
      .select('final_amount')
      .eq('status', 'job_done')
      .not('final_amount', 'is', null)

    if (gte) {
      query = query.gte('updated_at', gte)
    }
    if (lt) {
      query = query.lt('updated_at', lt)
    }
    if (technicianFilter) {
      query = query.eq('technician_id', technicianFilter)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Error fetching revenue:', error)
      return 'Failed to calculate revenue.'
    }

    if (!orders || orders.length === 0) {
      return `No revenue data found${dateLabelText}.`
    }

    // Sum up final_amount
    const totalRevenue = orders.reduce<number>((sum, order) => {
      return sum + (Number(order.final_amount) || 0)
    }, 0)

    // Format with thousand separators
    const formattedAmount = totalRevenue.toLocaleString('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    if (parsed.technicianName && technicianFilter) {
      // Get technician name for response
      const { data: technician } = await supabase
        .from('technicians')
        .select('name')
        .eq('id', technicianFilter)
        .single()
      
      const name = technician?.name || parsed.technicianName
      return `Total revenue${dateLabelText} for technician ${name}: RM ${formattedAmount}.`
    }

    return `Total revenue${dateLabelText}: RM ${formattedAmount}.`
  } catch (error) {
    console.error('Error in fetchRevenue:', error)
    return 'An error occurred while calculating revenue.'
  }
}

/**
 * Handles unknown or unrecognized queries.
 * For 'unknown' intent.
 */
async function handleUnknown(parsed: ParsedQuery): Promise<string> {
  return `I'm not sure what you're asking. Try questions like:
• What jobs did Ali complete last week?
• How many jobs were completed today?
• Which technician completed the most jobs this week?`
}

// ============================================================================
// OPENAI ENHANCEMENT (OPTIONAL)
// ============================================================================

/**
 * Enhances the raw response using OpenAI API (if available).
 * Uses raw fetch() to call the API - no OpenAI npm package needed.
 */
async function enhanceWithAI(question: string, rawData: string): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  
  if (!apiKey) {
    return rawData
  }

  try {
    const response = await fetch('https://nano-gpt.com/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          {
            role: 'system',
            content: 'You are an AC operations assistant. Given the user\'s question and the raw data, provide a clear, concise answer. Keep the same factual data but make it sound natural.',
          },
          {
            role: 'user',
            content: `Question: ${question}\n\nData: ${rawData}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.error('OpenAI API error:', response.status)
      return rawData // Fallback to raw response
    }

    const data = await response.json()
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim()
    }

    return rawData // Fallback if response format unexpected
  } catch (error) {
    console.error('Error calling OpenAI API:', error)
    return rawData // Fallback on any error
  }
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Main orchestrator function for the AI Assistant.
 * Takes a user's question, parses it, queries the database, and returns a formatted response.
 */
export async function askAIAssistant(question: string, options?: { forceOffline?: boolean }): Promise<string> {
  const parsed = parseQuery(question)
  let rawResponse: string

  switch (parsed.intent) {
    case 'list_jobs':
      rawResponse = await fetchJobsByTechnician(parsed)
      break
    case 'count_jobs':
      rawResponse = await fetchJobCount(parsed)
      break
    case 'top_technician':
      rawResponse = await fetchTopTechnician(parsed)
      break
    case 'revenue':
      rawResponse = await fetchRevenue(parsed)
      break
    default:
      rawResponse = await handleUnknown(parsed)
  }

  // If OpenAI key available, enhance the response
  const openAIKey = import.meta.env.VITE_OPENAI_API_KEY
  if (openAIKey && !options?.forceOffline) {
    try {
      return await enhanceWithAI(question, rawResponse)
    } catch (error) {
      console.error('OpenAI enhancement failed:', error)
      return rawResponse // Fallback to template
    }
  }

  return rawResponse
}

/**
 * Check if AI is available and working.
 * Makes a lightweight API call to verify connectivity.
 */
export async function checkAIStatus(): Promise<{ available: boolean; provider: string }> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    return { available: false, provider: 'none' }
  }

  try {
    const response = await fetch('https://nano-gpt.com/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1
      })
    })

    if (response.ok) {
      return { available: true, provider: 'OpenAI (nano-gpt)' }
    }
    return { available: false, provider: 'none' }
  } catch {
    return { available: false, provider: 'none' }
  }
}
