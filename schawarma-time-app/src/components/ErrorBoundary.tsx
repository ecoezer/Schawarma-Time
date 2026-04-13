import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 text-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ein Fehler ist aufgetreten</h1>
            <p className="text-gray-500 mb-4 text-sm">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#142328] text-white rounded-lg text-sm font-semibold"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
