import toast from 'react-hot-toast'

/**
 * Centralized error handler for all service/store operations.
 * Logs to console and shows a user-friendly toast.
 */
export function handleError(err: unknown, context: string): string {
  const message = extractMessage(err)
  // Log message only — never log raw error objects (may contain schema/key details)
  console.error(`[Schawarma-Time:${context}]`, message)
  toast.error(message)
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
