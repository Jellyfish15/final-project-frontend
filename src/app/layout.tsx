import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'EduTok - Educational Short Videos',
  description: 'A TikTok-type app for educational content powered by AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}