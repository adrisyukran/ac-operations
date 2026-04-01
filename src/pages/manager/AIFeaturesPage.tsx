import { useState } from 'react'
import { superviseCompletedJobs, getAISupervisorSummary, type Alert } from '../../lib/aiWorkflowSupervisor'
import { askOperationalQuestion, type TechnicianWorkload } from '../../lib/aiOperationalInsight'

type TabType = 'workflow' | 'document' | 'insight'

const ALERT_TYPE_LABELS: Record<Alert['type'], string> = {
  price_overrun: 'Price Overrun',
  missing_photos: 'Missing Photos',
  missing_work_description: 'Missing Description',
}

const ALERT_TYPE_ICONS: Record<Alert['type'], string> = {
  price_overrun: '💸',
  missing_photos: '📷',
  missing_work_description: '📝',
}

const SUGGESTED_QUESTIONS = [
  'Which technician might be overloaded this week?',
  'What is the workload distribution this week?',
  'Who has the highest revenue this week?',
]

export default function AIFeaturesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('workflow')

  return (
    <div className="h-full flex flex-col">
      {/* Page Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-4">🤖 AI Features</h1>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('workflow')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'workflow'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          🔍 Workflow Supervisor
        </button>
        
        <button
          onClick={() => setActiveTab('insight')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'insight'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          📊 Operational Insight
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'workflow' && <WorkflowSupervisorTab />}
        {activeTab === 'insight' && <OperationalInsightTab />}
      </div>
    </div>
  )
}

// ============================================================================
// TAB 1: WORKFLOW SUPERVISOR
// ============================================================================

function WorkflowSupervisorTab() {
  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [checkedCount, setCheckedCount] = useState<number | null>(null)
  const [summary, setSummary] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  async function handleRunCheck() {
    setLoading(true)
    setError(null)
    setAlerts([])
    setSummary('')

    try {
      const result = await superviseCompletedJobs()
      setAlerts(result.alerts)
      setCheckedCount(result.checkedCount)

      if (result.alerts.length > 0) {
        const aiSummary = await getAISupervisorSummary(result.alerts)
        setSummary(aiSummary)
      }
    } catch (err) {
      console.error('Error running workflow check:', err)
      setError('Failed to run workflow check. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function getSeverityColor(severity: Alert['severity']): string {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Run Check Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleRunCheck}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
        >
          {loading ? 'Checking...' : '🔍 Run Check'}
        </button>
        {checkedCount !== null && (
          <span className="text-sm text-gray-600">
            Checked {checkedCount} jobs, found {alerts.length} alerts
          </span>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-500 py-4">
          <span className="flex gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </span>
          <span>Analyzing completed jobs...</span>
        </div>
      )}

      {/* AI Summary */}
      {summary && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg">🤖</span>
            <p className="text-blue-800 text-sm whitespace-pre-wrap">{summary}</p>
          </div>
        </div>
      )}

      {/* Alerts List */}
      {!loading && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={`${alert.orderId}-${alert.type}-${index}`}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{ALERT_TYPE_ICONS[alert.type]}</span>
                  <div>
                    <div className="font-medium text-gray-800">
                      {alert.orderNo} - {alert.customerName}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {ALERT_TYPE_LABELS[alert.type]}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {alert.message}
                    </div>
                    {alert.details.technicianName && (
                      <div className="text-xs text-gray-400 mt-1">
                        Technician: {alert.details.technicianName}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                  {alert.severity.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Alerts */}
      {!loading && checkedCount !== null && alerts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-2 block">✅</span>
          <p>No issues detected in completed jobs.</p>
        </div>
      )}

      {/* Initial State */}
      {!loading && checkedCount === null && (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-2 block">🔍</span>
          <p>Click "Run Check" to analyze completed jobs for issues.</p>
        </div>
      )}
    </div>
  )
}


// ============================================================================
// TAB 2: OPERATIONAL INSIGHT
// ============================================================================

function OperationalInsightTab() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string>('')
  const [workloadData, setWorkloadData] = useState<TechnicianWorkload[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasAsked, setHasAsked] = useState(false)

  async function handleAsk(questionToAsk: string) {
    setQuestion(questionToAsk)
    setLoading(true)
    setError(null)
    setAnswer('')
    setWorkloadData([])
    setHasAsked(true)

    try {
      const result = await askOperationalQuestion(questionToAsk)
      setAnswer(result.answer)
      setWorkloadData(result.data)
    } catch (err) {
      console.error('Error asking operational question:', err)
      setError(err instanceof Error ? err.message : 'Failed to get operational insight')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (question.trim()) {
      handleAsk(question.trim())
    }
  }

  function formatCurrency(amount: number): string {
    return `RM ${amount.toFixed(2)}`
  }

  return (
    <div className="space-y-4">
      {/* Question Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about technician workload or operations..."
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
        >
          {loading ? '...' : '🤖 Ask'}
        </button>
      </form>

      {/* Suggested Questions */}
      {!hasAsked && !loading && (
        <div>
          <p className="text-sm text-gray-500 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q, index) => (
              <button
                key={index}
                onClick={() => handleAsk(q)}
                className="text-sm px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-500 py-4">
          <span className="flex gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </span>
          <span>Analyzing workload data...</span>
        </div>
      )}

      {/* AI Answer */}
      {answer && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg">🤖</span>
            <p className="text-blue-800 text-sm whitespace-pre-wrap">{answer}</p>
          </div>
        </div>
      )}

      {/* Workload Data Table */}
      {workloadData.length > 0 && !loading && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">Technician Workload This Week</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Technician</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Jobs Completed</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Total Revenue</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Avg Job Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workloadData.map((tech) => (
                  <tr key={tech.technicianId} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-800 font-medium">{tech.technicianName}</td>
                    <td className="px-4 py-2 text-gray-600 text-right">{tech.jobsCompleted}</td>
                    <td className="px-4 py-2 text-green-600 text-right font-medium">{formatCurrency(tech.totalRevenue)}</td>
                    <td className="px-4 py-2 text-gray-600 text-right">{formatCurrency(tech.avgJobValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Initial State */}
      {!hasAsked && !loading && (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-2 block">📊</span>
          <p>Ask a question about technician workload or operations.</p>
        </div>
      )}
    </div>
  )
}
