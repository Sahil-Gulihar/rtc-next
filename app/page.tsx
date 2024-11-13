'use client'

import ScreenShare from './components/ScreenShare'

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">WebRTC Screen Sharing</h1>
      <ScreenShare />
    </main>
  )
}