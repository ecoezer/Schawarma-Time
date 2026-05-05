import toast from 'react-hot-toast'

/**
 * Centralized error handler for all service/store operations.
 * Logs to console and shows a user-friendly persistent toast with a close button.
 */
export function handleError(err: unknown, context: string): string {
  const message = extractMessage(err)
  console.error(`[Schawarma-Time:${context}]`, message)
  
  // Persistent toast with a close button (X)
  toast.error((t) => (
    <span className="flex items-center gap-2 text-sm font-medium">
      {message}
      <button 
        onClick={() => toast.dismiss(t.id)}
        className="ml-2 p-1 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
        title="Schließen"
      >
        ✕
      </button>
    </span>
  ), { 
    duration: Infinity,
    position: 'top-center'
  })
  
  return message
}

/**
 * Extract a human-readable message from any error type.
 */
export function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return (err as { message: string }).message
  }
  if (typeof err === 'string') return err
  return 'Unbekannter Fehler'
}
