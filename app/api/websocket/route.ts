import { WebSocket, WebSocketServer } from 'ws'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

let wss: WebSocketServer | null = null

// Initialize WebSocket server if it hasn't been created yet
if (!wss) {
  wss = new WebSocketServer({ port: parseInt(process.env.WS_PORT || '8080') })

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established')

    ws.on('message', (message) => {
      // Broadcast the message to all other clients
      wss!.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      })
    })

    ws.on('close', () => {
      console.log('Client disconnected')
    })

    ws.on('error', (error) => {
      console.error('WebSocket error:', error)
    })
  })

  console.log(`WebSocket server running on ws://localhost:${process.env.WS_PORT || '8080'}`)
}

// This route handler is just for health checking
export async function GET(request: NextRequest) {
  return new NextResponse(JSON.stringify({
    status: 'ok',
    clients: wss?.clients.size || 0
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}