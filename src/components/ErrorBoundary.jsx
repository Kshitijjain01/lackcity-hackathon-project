import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-white p-8">
          <div className="max-w-xl rounded-2xl bg-red-500/20 p-8 ring-1 ring-red-500/30">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h1>
            <p className="text-white/70 mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <pre className="text-xs text-white/50 overflow-auto max-h-48 bg-black/30 p-4 rounded-lg">
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-sky-500 px-6 py-3 text-sm font-medium text-white hover:bg-sky-400"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
