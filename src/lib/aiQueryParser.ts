/**
 * AI Query Parser Utility
 * Parses natural language queries from managers into structured parameters for Supabase queries.
 * Part of Phase 6: AI Operations Query feature.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type QueryIntent = 'list_jobs' | 'count_jobs' | 'top_technician' | 'revenue' | 'unknown';
type DateRange = 'today' | 'this_week' | 'last_week' | 'this_month' | 'unknown';
type ServiceType = 'repair' | 'service' | 'installation' | 'unknown';

interface ParsedQuery {
  intent: QueryIntent;
  technicianName: string | null;
  dateRange: DateRange;
  serviceType: ServiceType;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const KNOWN_TECHNICIAN_NAMES = ['Ali', 'John', 'Bala', 'Yusoff'] as const;

// Intent detection keywords
const INTENT_KEYWORDS: Record<QueryIntent, string[]> = {
  list_jobs: ['what jobs', 'list jobs', 'show jobs', 'which jobs', 'what did', 'jobs did'],
  count_jobs: ['how many jobs', 'count', 'total jobs', 'number of jobs'],
  top_technician: ['most jobs', 'top technician', 'best technician', 'who completed the most'],
  revenue: ['revenue', 'how much', 'total amount', 'sales', 'income'],
  unknown: [],
};

// Technician name variations (lowercase -> proper case)
const TECHNICIAN_VARIATIONS: Record<string, string> = {
  ali: 'Ali',
  john: 'John',
  bala: 'Bala',
  yusoff: 'Yusoff',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Checks if the question contains any of the specified keywords (case-insensitive).
 */
function containsKeyword(question: string, keywords: string[]): boolean {
  const lowerQuestion = question.toLowerCase();
  return keywords.some((keyword) => lowerQuestion.includes(keyword.toLowerCase()));
}

/**
 * Gets the start of a day in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ).
 */
function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Gets the end of a day in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ).
 */
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Gets Monday of the current week at midnight.
 */
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Gets Sunday of the current week at 23:59:59.999.
 */
function getEndOfWeek(date: Date): Date {
  const startOfWeekDate = getStartOfWeek(date);
  const endOfWeekDate = new Date(startOfWeekDate);
  endOfWeekDate.setDate(startOfWeekDate.getDate() + 6);
  endOfWeekDate.setHours(23, 59, 59, 999);
  return endOfWeekDate;
}

/**
 * Gets the first day of the current month at midnight.
 */
function getStartOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Gets the last day of the current month at 23:59:59.999.
 */
function getEndOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}

// ============================================================================
// INTENT DETECTION
// ============================================================================

/**
 * Detects the query intent based on keywords in the question.
 */
export function detectIntent(question: string): QueryIntent {
  if (containsKeyword(question, INTENT_KEYWORDS.list_jobs)) {
    return 'list_jobs';
  }
  if (containsKeyword(question, INTENT_KEYWORDS.count_jobs)) {
    return 'count_jobs';
  }
  if (containsKeyword(question, INTENT_KEYWORDS.top_technician)) {
    return 'top_technician';
  }
  if (containsKeyword(question, INTENT_KEYWORDS.revenue)) {
    return 'revenue';
  }
  return 'unknown';
}

// ============================================================================
// TECHNICIAN NAME EXTRACTION
// ============================================================================

/**
 * Extracts a known technician name from the question (case-insensitive).
 * Returns the matched name in proper case, or null if not found.
 */
export function extractTechnicianName(question: string): string | null {
  const lowerQuestion = question.toLowerCase();

  for (const name of KNOWN_TECHNICIAN_NAMES) {
    if (lowerQuestion.includes(name.toLowerCase())) {
      return name;
    }
  }

  // Check for variations
  for (const [variation, properName] of Object.entries(TECHNICIAN_VARIATIONS)) {
    if (lowerQuestion.includes(variation)) {
      return properName;
    }
  }

  return null;
}

// ============================================================================
// DATE RANGE EXTRACTION
// ============================================================================

/**
 * Extracts the date range from the question.
 */
export function extractDateRange(question: string): DateRange {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes('today')) {
    return 'today';
  }
  if (lowerQuestion.includes('this week')) {
    return 'this_week';
  }
  if (lowerQuestion.includes('last week')) {
    return 'last_week';
  }
  if (lowerQuestion.includes('this month')) {
    return 'this_month';
  }

  return 'unknown';
}

// ============================================================================
// SERVICE TYPE EXTRACTION
// ============================================================================

/**
 * Extracts the service type from the question.
 * Maps variations to standard types.
 */
export function extractServiceType(question: string): ServiceType {
  const lowerQuestion = question.toLowerCase();

  // Check for installation first (more specific)
  if (lowerQuestion.includes('installation') || lowerQuestion.includes('install')) {
    return 'installation';
  }

  // Check for repair
  if (lowerQuestion.includes('repair')) {
    return 'repair';
  }

  // Check for service variants (cleaning, maintenance -> service)
  if (
    lowerQuestion.includes('service') ||
    lowerQuestion.includes('cleaning') ||
    lowerQuestion.includes('maintenance')
  ) {
    return 'service';
  }

  return 'unknown';
}

// ============================================================================
// DATE RANGE FILTER HELPER
// ============================================================================

/**
 * Returns ISO date strings for Supabase query filtering based on date range.
 * Returns null values for 'unknown' (no filter applied).
 */
export function getDateRangeFilter(
  dateRange: DateRange
): { gte: string | null; lt: string | null } {
  const now = new Date();

  switch (dateRange) {
    case 'today':
      return {
        gte: startOfDay(now),
        lt: endOfDay(now).toISOString(),
      };

    case 'this_week': {
      const start = getStartOfWeek(now);
      const end = getEndOfWeek(now);
      return {
        gte: start.toISOString(),
        lt: end.toISOString(),
      };
    }

    case 'last_week': {
      const lastWeek = new Date(now);
      lastWeek.setDate(now.getDate() - 7);
      const start = getStartOfWeek(lastWeek);
      const end = getEndOfWeek(lastWeek);
      return {
        gte: start.toISOString(),
        lt: end.toISOString(),
      };
    }

    case 'this_month': {
      const start = getStartOfMonth(now);
      const end = getEndOfMonth(now);
      return {
        gte: start.toISOString(),
        lt: end.toISOString(),
      };
    }

    case 'unknown':
    default:
      return {
        gte: null,
        lt: null,
      };
  }
}

// ============================================================================
// MAIN PARSE FUNCTION
// ============================================================================

/**
 * Parses a natural language question into a structured ParsedQuery object.
 * This is the main export for the AI Query Parser.
 */
export function parseQuery(question: string): ParsedQuery {
  return {
    intent: detectIntent(question),
    technicianName: extractTechnicianName(question),
    dateRange: extractDateRange(question),
    serviceType: extractServiceType(question),
  };
}

// ============================================================================
// TYPE EXPORTS (for use by other modules)
// ============================================================================

export type { QueryIntent, DateRange, ServiceType, ParsedQuery };
