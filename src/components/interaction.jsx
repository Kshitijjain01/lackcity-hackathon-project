import { useState } from 'react'
import { getTriageResult } from '../utils/openai'

export default function Interaction() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { specialist: "", urgency: "" }
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const triageResult = await getTriageResult(input)
      setResult(triageResult)
      console.log('Triage result:', triageResult)
    } catch (err) {
      const errorMessage = err.message || 'Failed to analyze symptoms. Please try again.'
      setError(errorMessage)
      console.error('Triage error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      {/* Background image with blur */}
      <div className="pointer-events-none absolute inset-0">
        <img
          src="/image.png"
          alt=""
          className="h-full w-full object-cover blur-sm"
        />
        <div className="absolute inset-0 bg-slate-950/70" />
      </div>

      {/* Header */}
      <header className="relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <span className="h-4 w-4 rounded bg-gradient-to-br from-sky-400 to-indigo-400" />
            </span>
            <span className="text-lg">lackecity</span>
          </a>

          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white/85 ring-1 ring-white/15 hover:bg-white/15"
          >
            Back to Home
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex min-h-[calc(100vh-88px)] flex-col items-center justify-center px-6">
        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-white/90 sm:text-4xl">
            Tell us how you're feeling.
          </h1>
          <p className="mt-3 text-base text-white/60">
            Describe your symptoms and we'll guide you to the right care.
          </p>
        </div>

        {/* Input Box */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl">
          <div className="relative flex items-center rounded-2xl bg-slate-800/80 ring-1 ring-white/10 backdrop-blur-sm transition-all focus-within:ring-2 focus-within:ring-sky-500/50">
            {/* Plus Icon */}
            <button
              type="button"
              className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your symptoms..."
              className="flex-1 bg-transparent px-4 py-4 text-base text-white placeholder-white/40 outline-none"
            />

            {/* Mic Icon */}
            <button
              type="button"
              className="mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/50 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/25 transition-colors hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              )}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
            {error}
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="mt-8 w-full max-w-md rounded-2xl bg-white/10 p-6 ring-1 ring-white/15 backdrop-blur-sm">
            <h2 className="mb-4 text-center text-lg font-semibold text-white">Triage Result</h2>
            
            {/* Emergency Alert */}
            {result.emergency_required && (
              <div className="mb-4 rounded-xl bg-red-500/20 p-4 text-center ring-1 ring-red-500/30">
                <span className="text-lg font-bold text-red-400">⚠️ Emergency Care Required</span>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
                <span className="text-white/70">Specialist</span>
                <span className="font-semibold text-indigo-300">{result.specialist}</span>
              </div>
              
              <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
                <span className="text-white/70">Department</span>
                <span className="font-semibold text-sky-300">{result.department}</span>
              </div>
              
              <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
                <span className="text-white/70">Urgency</span>
                <span className={`font-semibold capitalize ${
                  result.urgency === 'emergency' ? 'text-red-400' :
                  result.urgency === 'urgent' ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {result.urgency}
                </span>
              </div>
              
              <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
                <span className="text-white/70">Facility Type</span>
                <span className="font-semibold capitalize text-purple-300">{result.facility_type?.replace('_', ' ')}</span>
              </div>
            </div>

            <button
              onClick={() => { setResult(null); setInput(''); }}
              className="mt-6 w-full rounded-xl bg-white/10 py-3 text-sm font-medium text-white/80 ring-1 ring-white/15 transition-colors hover:bg-white/15"
            >
              Check another symptom
            </button>
          </div>
        )}

        {/* Suggestion Chips */}
        {!result && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['Headache', 'Fever', 'Chest pain', 'Fatigue', 'Cough'].map((symptom) => (
              <button
                key={symptom}
                onClick={() => setInput(symptom)}
                className="rounded-full bg-white/5 px-4 py-2 text-sm text-white/70 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
              >
                {symptom}
              </button>
            ))}
          </div>
        )}

        {/* Footer hint */}
        <p className="mt-12 text-center text-xs text-white/40">
          Your information is private and secure. We don't store personal health data.
        </p>
      </main>
    </div>
  )
}
