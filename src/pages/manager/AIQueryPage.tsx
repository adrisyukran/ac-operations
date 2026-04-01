import { useState, useEffect, useRef, useCallback } from 'react'
import { askAIAssistant, checkAIStatus } from '../../lib/aiAssistant'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTED_QUESTIONS = [
  'What jobs did Ali complete last week?',
  'How many jobs were completed today?',
  'Which technician completed the most jobs this week?',
  'What is the total revenue this week?',
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AIQueryPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiOnline, setAiOnline] = useState<boolean | null>(null)
  const [useAI, setUseAI] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check AI status on mount
  useEffect(() => {
    checkAIStatus().then((status) => {
      setAiOnline(status.available)
      setUseAI(status.available)
    })
  }, [])

  // Welcome message on mount
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: generateId(),
      type: 'assistant',
      content:
        '👋 Hi! I\'m your AI operations assistant. Ask me questions about jobs, technicians, and performance. Try one of the suggestions below!',
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = useCallback(
    async (question: string) => {
      if (!question.trim() || isLoading) return

      const userMessage: ChatMessage = {
        id: generateId(),
        type: 'user',
        content: question.trim(),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setIsLoading(true)

      try {
        const response = await askAIAssistant(question.trim(), { forceOffline: !useAI })
        const assistantMessage: ChatMessage = {
          id: generateId(),
          type: 'assistant',
          content: response,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      } catch (error) {
        console.error('Error asking AI assistant:', error)
        const errorMessage: ChatMessage = {
          id: generateId(),
          type: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(input)
    }
  }

  const handleSuggestedClick = (question: string) => {
    handleSubmit(question)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-4">🤖 AI Operations Assistant</h1>

      {/* AI Status Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg mb-4">
        {aiOnline === null ? (
          <span className="text-sm text-gray-500">Checking AI status...</span>
        ) : (
          <>
            <span className={`h-2.5 w-2.5 rounded-full ${aiOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-600">
              {aiOnline ? 'AI Online — Responses enhanced with AI' : 'AI Offline — Using template-based responses'}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  disabled={!aiOnline}
                  className="sr-only peer"
                />
                <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${aiOnline ? 'peer-checked:bg-blue-600' : ''} ${!aiOnline ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
              </label>
              <span className="text-sm text-gray-600">🤖 AI</span>
            </div>
          </>
        )}
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-white rounded-lg shadow flex flex-col overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}
                >
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">🤖 Thinking</span>
                  <span className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Questions (shown after welcome, before first user message) */}
          {messages.length === 1 && !isLoading && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-3">Suggested questions:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedClick(question)}
                    className="text-sm px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about jobs, technicians, performance..."
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={() => handleSubmit(input)}
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              📤 Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
