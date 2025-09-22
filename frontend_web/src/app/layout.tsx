import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI角色扮演',
  description: '与哈利·波特、苏格拉底、爱因斯坦等著名角色进行AI对话，支持语音聊天功能',
  keywords: 'AI, 角色扮演, 对话, 语音聊天, 历史人物',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
