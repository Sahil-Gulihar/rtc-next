'use client'

interface LoggerProps {
  logs: string[]
}

export default function Logger({ logs }: LoggerProps) {
  return (
    <div>
      <strong>Log:</strong>
      <pre className="mt-2 p-4 bg-gray-100 rounded overflow-auto max-h-60">
        {logs.join('\n')}
      </pre>
    </div>
  )
}