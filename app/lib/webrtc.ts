'use client'

import type { WebRTCConnection } from './types'

const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:numb.viagenie.ca',
      credential: 'muazkh',
      username: 'webrtc@live.com',
    },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
}

interface SetupOptions {
  onRemoteStream: (stream: MediaStream) => void
  onLog: (message: string) => void
}

export async function setupWebRTC(
  localStream: MediaStream,
  options: SetupOptions
): Promise<WebRTCConnection> {
  const { onRemoteStream, onLog } = options
  const peerConnection = new RTCPeerConnection(config)
  
  // Use environment variable for WebSocket URL
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
  const signalingSocket = new WebSocket(wsUrl)

  let reconnectAttempts = 0
  const maxReconnectAttempts = 5
  const reconnectDelay = 2000 // 2 seconds

  function setupWebSocketHandlers() {
    signalingSocket.onopen = () => {
      onLog('WebSocket connection established')
      reconnectAttempts = 0
      createAndSendOffer()
    }

    signalingSocket.onclose = () => {
      onLog('WebSocket connection closed')
      if (reconnectAttempts < maxReconnectAttempts) {
        setTimeout(() => {
          reconnectAttempts++
          onLog(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`)
          signalingSocket.close()
          setupWebSocketConnection()
        }, reconnectDelay)
      }
    }

    signalingSocket.onerror = (error) => {
      onLog(`WebSocket error: ${error}`)
    }

    signalingSocket.onmessage = async (event) => {
      let messageData: string
      
      try {
        messageData = event.data instanceof Blob ? await event.data.text() : event.data
        const data = JSON.parse(messageData)
        
        switch (data.type) {
          case 'offer':
            handleOffer(data.offer)
            break
          case 'answer':
            handleAnswer(data.answer)
            break
          case 'ice-candidate':
            handleIceCandidate(data.candidate)
            break
          default:
            onLog(`Unknown message type: ${data.type}`)
        }
      } catch (err) {
        onLog(`Error processing message: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  function setupWebSocketConnection() {
    setupWebSocketHandlers()
  }

  // Set up WebRTC handlers
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream)
  })

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && signalingSocket.readyState === WebSocket.OPEN) {
      signalingSocket.send(
        JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
        })
      )
      onLog('New ICE candidate sent')
    }
  }

  peerConnection.oniceconnectionstatechange = () => {
    onLog(`ICE connection state: ${peerConnection.iceConnectionState}`)
  }

  peerConnection.onsignalingstatechange = () => {
    onLog(`Signaling state: ${peerConnection.signalingState}`)
  }

  peerConnection.ontrack = (event) => {
    if (event.streams?.[0]) {
      onLog('Received remote stream')
      onRemoteStream(event.streams[0])
    }
  }

  // Initial WebSocket setup
  setupWebSocketConnection()

  async function createAndSendOffer() {
    try {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      if (signalingSocket.readyState === WebSocket.OPEN) {
        signalingSocket.send(
          JSON.stringify({
            type: 'offer',
            offer: peerConnection.localDescription,
          })
        )
        onLog('Offer sent')
      } else {
        onLog('WebSocket not ready, could not send offer')
      }
    } catch (err) {
      onLog(`Failed to create and send offer: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function handleOffer(offer: RTCSessionDescriptionInit) {
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      if (signalingSocket.readyState === WebSocket.OPEN) {
        signalingSocket.send(
          JSON.stringify({
            type: 'answer',
            answer: peerConnection.localDescription,
          })
        )
        onLog('Answer sent')
      } else {
        onLog('WebSocket not ready, could not send answer')
      }
    } catch (err) {
      onLog(`Failed to handle offer: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function handleAnswer(answer: RTCSessionDescriptionInit) {
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      onLog('Remote description set')
    } catch (err) {
      onLog(`Failed to set remote description: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function handleIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      onLog('ICE candidate added')
    } catch (err) {
      if (err instanceof Error && err.message.includes('Unknown ufrag')) {
        onLog(`Ignoring ICE candidate with unknown ufrag: ${err.message}`)
      } else {
        onLog(`Failed to add ICE candidate: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  return {
    connection: peerConnection,
    socket: signalingSocket,
  }
}