'use client'

import { useEffect, useRef, useState } from 'react'
import VideoStreams from './VideoStreams'
import Logger from './Logger'
import { setupWebRTC } from '../lib/webrtc'
import type { WebRTCConnection } from '../lib/types'

export default function ScreenShare() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const webrtcConnection = useRef<WebRTCConnection | null>(null)

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message])
  }

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'window',
        },
        audio: false,
      })
      
      setLocalStream(stream)
      webrtcConnection.current = await setupWebRTC(stream, {
        onRemoteStream: setRemoteStream,
        onLog: addLog,
      })
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const stopCapture = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop())
      setRemoteStream(null)
    }
    if (webrtcConnection.current) {
      webrtcConnection.current.connection.close()
      webrtcConnection.current = null
    }
    setLogs([])
  }

  useEffect(() => {
    return () => {
      stopCapture()
    }
  }, [])

  return (
    <div>
      <p className="mb-4">
        This example shows you the contents of the selected part of your display.
        Click the Start Capture button to begin.
      </p>

      <div className="space-x-2 mb-4">
        <button
          onClick={startCapture}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Start Capture
        </button>
        <button
          onClick={stopCapture}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Stop Capture
        </button>
      </div>

      <VideoStreams
        localStream={localStream}
        remoteStream={remoteStream}
      />

      <Logger logs={logs} />
    </div>
  )
}