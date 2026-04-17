"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { Bell, Calendar, ClipboardList, Crown, LayoutDashboard, MapPin, Menu, MessageCircle, Settings, ShoppingBag, Sparkles, Trophy, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser } from "@/context/user-context"

const PRIMARY_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"
const API_BASE_CANDIDATES = Array.from(new Set(["http://127.0.0.1:5001", PRIMARY_API_BASE]))

interface TopBarProps {
  onMenuToggle?: () => void
}

const mobileMenuItems = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Academias", href: "/academias", icon: MapPin },
  { label: "Eventos", href: "/eventos", icon: Calendar },
  { label: "Tecnicos", href: "/tecnicos", icon: ClipboardList, requiresCoach: true },
  { label: "Treino", href: "/treino", icon: Crown },
  { label: "Loja", href: "/loja", icon: ShoppingBag },
  { label: "Ranking", href: "/ranking", icon: Trophy },
  { label: "Chat", href: "/chat", icon: MessageCircle },
  { label: "Perfil", href: "/profile", icon: User },
  { label: "Configuracoes", href: "/configuracoes", icon: Settings },
]

export function TopBar({ onMenuToggle }: TopBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isPremium, user, logout } = useUser()
  const [notificationsCount, setNotificationsCount] = useState(0)
  const [apiBase, setApiBase] = useState(PRIMARY_API_BASE)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      setNotificationsCount(0)
      return
    }

    const syncNotificationsCount = async () => {
      if (document.hidden) return
      for (const base of [apiBase, ...API_BASE_CANDIDATES.filter((b) => b !== apiBase)]) {
        try {
          const controller = new AbortController()
          const timeoutId = window.setTimeout(() => controller.abort(), 1500)
          const res = await fetch(`${base}/api/notifications?user_id=${user.id}`, { signal: controller.signal })
          window.clearTimeout(timeoutId)
          if (!res.ok) continue
          const payload = await res.json()
          setNotificationsCount(Number(payload?.unread || 0))
          setApiBase(base)
          return
        } catch {
          // tenta proximo backend
        }
      }

      setNotificationsCount(0)
    }

    syncNotificationsCount()
  const interval = window.setInterval(syncNotificationsCount, 12000)
    window.addEventListener("focus", syncNotificationsCount)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", syncNotificationsCount)
    }
  }, [apiBase, user])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-[#0a0a0a]/92 backdrop-blur-xl shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-foreground hover:bg-muted/60"
            onClick={() => {
              setMobileMenuOpen((prev) => !prev)
              onMenuToggle?.()
            }}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden h-10 w-[220px] items-center sm:flex">
            <Image
              src="/logo-mh.svg"
              alt="SelestialHub"
              width={220}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </div>

          <div className="sm:hidden">
            <Image
              src="/logo-mh.svg"
              alt="SelestialHub"
              width={110}
              height={20}
              className="h-6 w-auto"
              priority
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPremium ? (
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex items-center gap-1.5 text-[#FFD700] hover:bg-[#FFD700]/12"
            >
              <Crown className="h-4 w-4" />
              <span className="font-serif text-xs uppercase tracking-wider">PRO</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex items-center gap-1.5 text-primary hover:bg-primary/12"
            >
              <Sparkles className="h-4 w-4" />
              <span className="font-serif text-xs uppercase tracking-wider">FREE</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="relative text-foreground hover:bg-muted/60"
            onClick={() => router.push("/notificacoes")}
            aria-label="Abrir notificações"
          >
            <Bell className="h-5 w-5" />
            {notificationsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 inline-flex min-w-6 items-center justify-center gap-1 rounded-full border border-[#2b3038] bg-[#161a21] px-1.5 py-0.5 text-[10px] font-bold leading-none text-foreground shadow-[0_8px_20px_rgba(0,0,0,0.45)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff5b00]" aria-hidden="true" />
                {notificationsCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border/80 bg-[#0a0a0a]/95 backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-1 p-2">
            {mobileMenuItems
              .filter((item) => !item.requiresCoach || user?.is_coach)
              .map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className="h-10 justify-start gap-2 rounded-md"
                onClick={() => {
                  setMobileMenuOpen(false)
                  router.push(item.href)
                }}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-xs">{item.label}</span>
              </Button>
            ))}
            <Button
              variant="ghost"
              className="h-10 justify-start gap-2 rounded-md text-red-400 hover:text-red-300"
              onClick={() => {
                setMobileMenuOpen(false)
                logout()
              }}
            >
              <User className="h-4 w-4" />
              <span className="text-xs">Sair da conta</span>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
