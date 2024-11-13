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
  const signalingSocket = new WebSocket('wss://another-one-6vdy.onrender.com')

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream)
  })

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
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

  signalingSocket.onopen = () => {
    onLog('WebSocket connection established')
    createAndSendOffer()
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

  async function createAndSendOffer() {
    try {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      signalingSocket.send(
        JSON.stringify({
          type: 'offer',
          offer: peerConnection.localDescription,
        })
      )
      onLog('Offer sent')
    } catch (err) {
      onLog(`Failed to create and send offer: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function handleOffer(offer: RTCSessionDescriptionInit) {
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      signalingSocket.send(
        JSON.stringify({
          type: 'answer',
          answer: peerConnection.localDescription,
        })
      )
      onLog('Answer sent')
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
      onLog(`Failed to add ICE candidate: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return {
    connection: peerConnection,
    socket: signalingSocket,
  }
}