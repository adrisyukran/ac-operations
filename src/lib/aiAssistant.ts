/**
 * AI Assistant Orchestrator
 * Part of Phase 6: AI Operations Query feature.
 * 
 * Two-Phase AI Processing:
 * Phase 1: AI parses natural language question → structured parameters
 * Phase 2: Query database → AI formats natural language response
 */

import { supabase } from './supabase'
import {
  parseQuery,
  getDateRangeFilter,
  ParsedQuery,
  DateRange,
} from './aiQueryParser'

/**
 * Chat message type for conversation history
 */
export interface ChatMessage {
  type: 'user' | 'assistant'
  content: string
}

/**
 * Structured query parameters returned by AI parsing (Phase 1)
 */
interface AIQueryParams {
  intent: 'list_jobs' | 'count_jobs' | 'top_technician' | 'revenue' | 'unknown'
  technicianName: string | null
  dateRange: 'today' | 'this_week' | 'last_week' | 'this_month' | 'all_time'
  serviceType: 'repair' | 'service' | 'installation' | null
  reasoning: string // Explanation of how the AI interpreted the question
}

// ============================================================================
// DATABASE SCHEMA CONTEXT (for AI prompts)
// ============================================================================

const DATABASE_SCHEMA = `
Database Tables:

1. technicians
   - id (UUID, primary key)
   - name (TEXT) - values: "Ali", "John", "Bala", "Yusoff"
   - phone (TEXT)
   - branch_id (TEXT)
   - is_active (BOOLEAN)

2. orders
   - id (UUID, primary key)
   - order_no (TEXT, unique) - format: "REP2703-001"
   - customer_name (TEXT)
   - customer_phone (TEXT)
   - customer_address (TEXT)
   - problem_description (TEXT)
   - service_type (TEXT) - values: "repair", "service", "installation"
   - quoted_price (NUMERIC)
   - technician_id (UUID, foreign key → technicians.id)
   - status (TEXT) - values: "new", "assigned", "in_progress", "job_done", "reviewed", "closed"
   - work_done (TEXT) - description of work completed
   - extra_charges (NUMERIC)
   - remarks (TEXT)
   - final_amount (NUMERIC) - quoted_price + extra_charges
   - photo_urls (TEXT[])
   - created_at (TIMESTAMPTZ)
   - updated_at (TIMESTAMPTZ)

Intent Types:
- list_jobs: User wants to see a list of specific jobs/orders
- count_jobs: User wants to count number of jobs
- top_technician: User wants to know which technician performed best
- revenue: User wants to know total revenue/earnings
- unknown: Question doesn't match supported intents
`

const EXAMPLE_QUESTIONS = `
Example interpretations:

Q: "What jobs did Ali complete last week?"
{
  "intent": "list_jobs",
  "technicianName": "Ali",
  "dateRange": "last_week",
  "serviceType": null,
  "reasoning": "User wants list of jobs for technician Ali, filtered to last week"
}

Q: "How many jobs were completed today?"
{
  "intent": "count_jobs",
  "technicianName": null,
  "dateRange": "today",
  "serviceType": null,
  "reasoning": "User wants count of all jobs completed today"
}

Q: "Which technician completed the most jobs this week?"
{
  "intent": "top_technician",
  "technicianName": null,
  "dateRange": "this_week",
  "serviceType": null,
  "reasoning": "User wants to identify top performer this week"
}

Q: "Show me all repair jobs for John"
{
  "intent": "list_jobs",
  "technicianName": "John",
  "dateRange": "all_time",
  "serviceType": "repair",
  "reasoning": "User wants list of repair jobs for John across all time"
}

Q: "What's the revenue from cleaning services this month?"
{
  "intent": "revenue",
  "technicianName": null,
  "dateRange": "this_month",
  "serviceType": "service",
  "reasoning": "User wants total revenue from service/cleaning jobs this month"
}
`

// ============================================================================
// PHASE 1: AI PARSING
// ============================================================================

/**
 * Uses AI to parse the user's question into structured parameters.
 * Falls back to regex-based parsing if AI is unavailable.
 */
async function parseWithAI(question: string, useAI: boolean, history?: ChatMessage[]): Promise<ParsedQuery> {
  if (!useAI) {
    // Fallback to regex-based parsing
    return parseQuery(question)
  }

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    // Fallback to regex-based parsing
    return parseQuery(question)
  }

  // Build conversation context from history
  const contextMessages: { role: string; content: string }[] = []
  
  if (history && history.length > 0) {
    // Add conversation context as a reference
    const contextStr = history
      .map((msg) => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n')
    contextMessages.push({
      role: 'system',
      content: `Previous conversation context:\n${contextStr}\n\nUse this context to understand follow-up questions. For example, if the user asks "How much revenue for this order?", "this order" refers to the order mentioned in the previous conversation.`
    })
  }

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
            content: `You are a query interpreter for an AC service operations database.
Your task is to parse user questions into structured parameters for database queries.

IMPORTANT: The user may ask follow-up questions referring to previous conversation context.
For example, if the previous answer mentioned order "INS2703-001" and the user asks "How much revenue for this order?",
you should interpret "this order" as referring to that specific order.

${DATABASE_SCHEMA}

Output format: Return ONLY valid JSON (no markdown, no explanation).
The JSON must have this exact structure:
{
  "intent": "list_jobs" | "count_jobs" | "top_technician" | "revenue" | "unknown",
  "technicianName": "Ali" | "John" | "Bala" | "Yusoff" | null,
  "dateRange": "today" | "this_week" | "last_week" | "this_month" | "all_time",
  "serviceType": "repair" | "service" | "installation" | null,
  "reasoning": "Brief explanation of interpretation"
}

Rules:
- If no technician mentioned, set technicianName to null
- If no date specified, set dateRange to "all_time"
- Map "cleaning", "maintenance" to serviceType "service"
- Map "install" to serviceType "installation"
- If question doesn't match any intent, set intent to "unknown"
- technicianName must be one of: Ali, John, Bala, Yusoff (case-insensitive match)

${EXAMPLE_QUESTIONS}`,
          },
          ...contextMessages,
          {
            role: 'user',
            content: question,
          },
        ],
        max_tokens: 300,
        temperature: 0.1, // Low temperature for consistent structured output
      }),
    })

    if (!response.ok) {
      console.error('AI parsing failed:', response.status)
      return parseQuery(question) // Fallback
    }

    const data = await response.json()
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const content = data.choices[0].message.content.trim()
      
      // Parse the JSON response
      // Remove any markdown formatting if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(jsonStr) as AIQueryParams

      // Convert to ParsedQuery format
      return {
        intent: parsed.intent,
        technicianName: parsed.technicianName,
        dateRange: parsed.dateRange === 'all_time' ? 'unknown' : parsed.dateRange,
        serviceType: parsed.serviceType || 'unknown',
      }
    }

    return parseQuery(question) // Fallback
  } catch (error) {
    console.error('Error in AI parsing:', error)
    return parseQuery(question) // Fallback
  }
}

// ============================================================================
// DATE RANGE LABEL HELPER
// ============================================================================

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
// DATABASE QUERY FUNCTIONS
// ============================================================================

async function fetchJobsByTechnician(parsed: ParsedQuery): Promise<string> {
  try {
    if (!parsed.technicianName) {
      return 'Please specify a technician name.'
    }

    const { data: technician, error: techError } = await supabase
      .from('technicians')
      .select('id, name')
      .ilike('name', parsed.technicianName)
      .single()

    if (techError || !technician) {
      return `Technician "${parsed.technicianName}" not found.`
    }

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
    if (parsed.serviceType && parsed.serviceType !== 'unknown') {
      query = query.eq('service_type', parsed.serviceType)
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

async function fetchJobCount(parsed: ParsedQuery): Promise<string> {
  try {
    const { gte, lt } = getDateRangeFilter(parsed.dateRange)
    const dateLabel = getDateRangeLabel(parsed.dateRange)
    const dateLabelText = dateLabel ? ` ${dateLabel}` : ' '

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
    if (parsed.serviceType && parsed.serviceType !== 'unknown') {
      query = query.eq('service_type', parsed.serviceType)
    }

    const { count, error } = await query

    if (error) {
      console.error('Error counting jobs:', error)
      return 'Failed to count jobs.'
    }

    const jobCount = count || 0

    if (parsed.technicianName && technicianFilter) {
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

async function fetchTopTechnician(parsed: ParsedQuery): Promise<string> {
  try {
    const { gte, lt } = getDateRangeFilter(parsed.dateRange)
    const dateLabel = getDateRangeLabel(parsed.dateRange)
    const dateLabelText = dateLabel ? ` ${dateLabel}` : ''

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
    if (parsed.serviceType && parsed.serviceType !== 'unknown') {
      query = query.eq('service_type', parsed.serviceType)
    }

    const { data: jobs, error } = await query

    if (error) {
      console.error('Error fetching jobs for top technician:', error)
      return 'Failed to determine top technician.'
    }

    if (!jobs || jobs.length === 0) {
      return `No completed jobs found${dateLabelText}.`
    }

    const technicianCounts: Record<string, number> = {}
    for (const job of jobs) {
      if (job.technician_id) {
        technicianCounts[job.technician_id] = (technicianCounts[job.technician_id] || 0) + 1
      }
    }

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

async function fetchRevenue(parsed: ParsedQuery): Promise<string> {
  try {
    const { gte, lt } = getDateRangeFilter(parsed.dateRange)
    const dateLabel = getDateRangeLabel(parsed.dateRange)
    const dateLabelText = dateLabel ? ` ${dateLabel}` : ''

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
    if (parsed.serviceType && parsed.serviceType !== 'unknown') {
      query = query.eq('service_type', parsed.serviceType)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Error fetching revenue:', error)
      return 'Failed to calculate revenue.'
    }

    if (!orders || orders.length === 0) {
      return `No revenue data found${dateLabelText}.`
    }

    const totalRevenue = orders.reduce<number>((sum, order) => {
      return sum + (Number(order.final_amount) || 0)
    }, 0)

    const formattedAmount = totalRevenue.toLocaleString('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    if (parsed.technicianName && technicianFilter) {
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

async function handleUnknown(_question: string): Promise<string> {
  return `I'm not sure what you're asking. Try questions like:
• What jobs did Ali complete last week?
• How many jobs were completed today?
• Which technician completed the most jobs this week?
• Show me revenue for this month`
}

// ============================================================================
// PHASE 2: AI RESPONSE FORMATTING
// ============================================================================

/**
 * Uses AI to format the raw database response into a natural language answer.
 * Includes conversation history for contextual follow-up responses.
 */
async function formatWithAI(question: string, rawData: string, useAI: boolean, history?: ChatMessage[]): Promise<string> {
  if (!useAI) {
    return rawData
  }

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    return rawData
  }

  // Build conversation context messages from history
  const contextMessages: { role: string; content: string }[] = []
  
  if (history && history.length > 0) {
    // Add previous conversation as context (last 10 messages to keep token count manageable)
    const recentHistory = history.slice(-10)
    for (const msg of recentHistory) {
      contextMessages.push({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })
    }
  }

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
            content: `You are an AC operations assistant having a conversation with a manager.
The user asked a question and we retrieved data from the database.
Format the data into a clear, conversational answer.

IMPORTANT: The user may be asking follow-up questions. Use the conversation history to understand context.
For example, if the previous answer mentioned order "INS2703-001" and the user asks "How much revenue for this order?",
understand they're asking about that specific order.

Rules:
- Keep it concise but informative
- Use the same facts from the data
- If the data shows a list, present it as a numbered or bulleted list
- If the data shows a number/count, highlight it
- Add context where helpful (e.g., "Here's what I found...")
- If no data was found, say so in a friendly way
- For follow-up questions, acknowledge the connection to previous context

Example:
Data: "Technician Ali completed 3 jobs last week:\nREP001 – Gas refill\nREP002 – Cleaning\nREP003 – Repair"
Response: "Here's what I found for Ali last week — they completed 3 jobs:\n1. REP001 – Gas refill\n2. REP002 – Cleaning\n3. REP003 – Repair"`,
          },
          ...contextMessages,
          {
            role: 'user',
            content: `User Question: ${question}\n\nDatabase Data:\n${rawData}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.error('AI formatting failed:', response.status)
      return rawData
    }

    const data = await response.json()
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim()
    }

    return rawData
  } catch (error) {
    console.error('Error in AI formatting:', error)
    return rawData
  }
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Main orchestrator function - Two-Phase AI Processing.
 * 
 * Phase 1: Parse question with AI (or regex fallback)
 * Phase 2: Query database → Format response with AI (or template fallback)
 */
export async function askAIAssistant(
  question: string,
  options?: { forceOffline?: boolean; useAI?: boolean; history?: ChatMessage[] }
): Promise<string> {
  // Determine if we should use AI
  const useAI = !options?.forceOffline && !!import.meta.env.VITE_OPENAI_API_KEY
  const history = options?.history
  
  if (useAI) {
    console.log('🤖 Using Two-Phase AI Processing (with conversation context)')
  } else {
    console.log('📋 Using template-based processing')
  }

  // Phase 1: Parse the question (with conversation history for context)
  const parsed = await parseWithAI(question, useAI, history)
  console.log('📊 Parsed query:', parsed)

  // Execute the appropriate query based on intent
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
      rawResponse = await handleUnknown(question)
  }

  console.log('📦 Raw response:', rawResponse)

  // Phase 2: Format the response (AI enhancement with conversation history)
  if (useAI && parsed.intent !== 'unknown') {
    try {
      const formattedResponse = await formatWithAI(question, rawResponse, useAI, history)
      console.log('✨ AI formatted response:', formattedResponse)
      return formattedResponse
    } catch (error) {
      console.error('AI formatting failed, using raw response:', error)
      return rawResponse
    }
  }

  return rawResponse
}

/**
 * Check if AI is available and working.
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
        model: 'nvidia/nemotron-3-super-120b-a12b',
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
