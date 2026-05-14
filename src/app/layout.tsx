import type { Metadata } from 'next'
import { Inter, Inter_Tight, Newsreader, JetBrains_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import ZoomControl from '@/components/layout/zoom-control'
import { ThemeProvider } from '@/lib/theme/provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'LicitaIA - Gestao de Licitacoes',
  description: 'Plataforma de automacao de processos licitatorios conforme Lei 14.133/21',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${interTight.variable} ${newsreader.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider initial="petroleo">
          {children}
          <ZoomControl />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}