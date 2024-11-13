'use client'

import { useEffect, useRef } from 'react'

interface VideoStreamsProps {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
}

export default function VideoStreams({ localStream, remoteStream }: VideoStreamsProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  return (
    <div className="flex justify-around gap-4 mb-4">
      <div className="w-1/2">
        <strong>Local Stream:</strong>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          className="w-full border border-gray-300 rounded"
        />
      </div>
      <div className="w-1/2">
        <strong>Remote Stream:</strong>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full border border-gray-300 rounded"
        />
      </div>
    </div>
  )
}