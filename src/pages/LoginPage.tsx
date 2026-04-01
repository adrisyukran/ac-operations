import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simulate a brief delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300))

    const success = login(id, password)
    
    if (success) {
      // Redirect to home (which will redirect to appropriate role page)
      navigate('/', { replace: true })
    } else {
      setError('Invalid ID or password. Please try again.')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Branding Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">❄️</div>
            <h1 className="text-2xl font-bold text-gray-800">
              Sejuk Sejuk Operations
            </h1>
            <p className="text-gray-500 mt-2">Assessor Login</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ID Input */}
            <div>
              <label 
                htmlFor="id" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                ID
              </label>
              <input
                type="text"
                id="id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition-colors duration-200
                           placeholder-gray-400"
                placeholder="Enter your ID"
                autoComplete="username"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition-colors duration-200
                           placeholder-gray-400"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 
                              px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white
                         transition-all duration-200
                         ${isLoading 
                           ? 'bg-blue-400 cursor-not-allowed' 
                           : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                         }
                         shadow-md hover:shadow-lg`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle 
                      className="opacity-25" 
                      cx="12" cy="12" r="10" 
                      stroke="currentColor" 
                      strokeWidth="4" 
                      fill="none" 
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
                    />
                  </svg>
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Footer Note */}
          <p className="text-center text-xs text-gray-400 mt-6">
            This system is for authorized assessors only.
          </p>
        </div>
      </div>
    </div>
  )
}
