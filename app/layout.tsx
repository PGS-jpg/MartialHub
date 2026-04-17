import type { Metadata, Viewport } from 'next'
import { Inter, Oswald } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { UserProvider } from '@/context/user-context'
import { ThemeProvider } from '@/components/theme-provider'
import { PwaRegister } from '@/components/pwa-register'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap'
})

const oswald = Oswald({ 
  subsets: ["latin"],
  variable: '--font-oswald',
  display: 'swap'
})

export const metadata: Metadata = {
  metadataBase: new URL('https://selestialhub.com'),
  manifest: '/manifest.webmanifest',
  title: 'SelestialHub - Matchmaking para Atletas de Artes Marciais',
  description: 'Plataforma profissional de matchmaking e gestão para atletas de BJJ, Muay Thai, Boxe, MMA e Judô. Encontre adversários, gerencie seu ranking e evolua como lutador.',
  keywords: ['artes marciais', 'bjj', 'muay thai', 'boxe', 'mma', 'judo', 'matchmaking', 'luta'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'SelestialHub - Matchmaking para Atletas de Artes Marciais',
    description: 'Plataforma profissional de matchmaking e gestão para atletas de artes marciais.',
    url: 'https://selestialhub.com',
    siteName: 'SelestialHub',
    locale: 'pt_BR',
    type: 'website',
  },
  generator: 'v0.app',
  icons: {
    icon: '/logo-mh.svg',
    shortcut: '/logo-mh.svg',
    apple: '/logo-mh.svg',
  },
  applicationName: "SelestialHub",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SelestialHub",
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#0b0d10',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${oswald.variable} font-sans antialiased bg-[#050505] text-foreground`}>
        <PwaRegister />
        <UserProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            {children}
          </ThemeProvider>
        </UserProvider>
        <Analytics />
      </body>
    </html>
  )
}
