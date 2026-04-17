"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  ClipboardList,
  Crown,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageCircle,
  Settings,
  ShoppingBag,
  Trophy,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useUser } from "@/context/user-context"

const PRIMARY_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"
const API_BASE_CANDIDATES = Array.from(new Set(["http://127.0.0.1:5001", PRIMARY_API_BASE]))

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { id: "academias", label: "Academias", icon: MapPin, href: "/academias" },
  { id: "eventos", label: "Eventos", icon: Calendar, href: "/eventos" },
  { id: "ranking", label: "Ranking", icon: Trophy, href: "/ranking" },
  { id: "tecnicos", label: "Tecnicos", icon: ClipboardList, href: "/tecnicos", requiresCoach: true },
  { id: "loja", label: "Loja", icon: ShoppingBag, href: "/loja" },
  { id: "treino", label: "Treino", icon: Crown, href: "/treino" },
  { id: "chat", label: "Chat", icon: MessageCircle, href: "/chat" },
  { id: "perfil", label: "Perfil", icon: User, href: "/profile" },
]

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  isOpen?: boolean
}

function levelFromXP(xp: number) {
  const safeXP = Math.max(0, Math.floor(Number(xp) || 0))
  let remainingXP = safeXP
  let level = 1
  let requiredXP = 100

  while (remainingXP >= requiredXP) {
    remainingXP -= requiredXP
    level += 1
    requiredXP += 25
  }

  return level
}

export function Sidebar({ activeTab, onTabChange, isOpen = true }: SidebarProps) {
  const router = useRouter()
  const { user, isPremium, logout, isAuthReady } = useUser()
  const [apiBase, setApiBase] = useState(PRIMARY_API_BASE)
  const [avatarUrl, setAvatarUrl] = useState("")
  const [currentXP, setCurrentXP] = useState(0)

  const firstName = user?.nome ? user.nome.split(" ")[0] : "Atleta"
  const initials = useMemo(() => {
    const base = user?.nome || "M"
    return base
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }, [user?.nome])

  const requestWithFallback = useCallback(async (path: string, init?: RequestInit): Promise<Response | null> => {
    const orderedBases = [apiBase, ...API_BASE_CANDIDATES.filter((b) => b !== apiBase)]

    for (const base of orderedBases) {
      try {
        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), 1500)
        const response = await fetch(`${base}${path}`, { ...init, signal: controller.signal })
        window.clearTimeout(timeoutId)
        if (response.status === 404) continue
        setApiBase(base)
        return response
      } catch {
        // try next backend
      }
    }

    return null
  }, [apiBase])

  const level = useMemo(() => levelFromXP(currentXP), [currentXP])
  const visibleMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if ((item as { requiresCoach?: boolean }).requiresCoach && !user?.is_coach) return false
      return true
    })
  }, [user?.is_coach])

  useEffect(() => {
    if (!isAuthReady || !user) return

    const hydrateCard = async () => {
      if (document.hidden) return
      const profileRes = await requestWithFallback(`/api/users/${user.id}/public?viewer_id=${user.id}`)
      if (profileRes?.ok) {
        try {
          const payload = await profileRes.json()
          setAvatarUrl(String(payload?.profile?.avatarUrl || ""))
          const backendXP = Number(payload?.profile?.currentXP ?? 0)
          setCurrentXP(Number.isFinite(backendXP) ? backendXP : 0)
          return
        } catch {
          // keep local fallback
        }
      }

      const fallbackXP = Number((user as { currentXP?: number } | null)?.currentXP || 0)
      setCurrentXP(Number.isFinite(fallbackXP) ? fallbackXP : 0)
    }

    hydrateCard()
    const interval = window.setInterval(hydrateCard, 20000)
    return () => window.clearInterval(interval)
  }, [isAuthReady, requestWithFallback, user])

  const handleMenuClick = (item: typeof menuItems[0]) => {
    onTabChange(item.id)
    router.push(item.href)
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 border-r border-sidebar-border/80 bg-[linear-gradient(180deg,#080808,#0c0c0c)] z-40",
        "transition-transform duration-300 ease-in-out",
        "hidden lg:block",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-full flex-col p-3">
        <div className="mb-4 rounded-2xl border border-border/70 bg-gradient-to-br from-[#151515] to-[#0f0f0f] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={firstName} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-serif text-base font-bold text-foreground">{initials}</span>
                )}
              </div>
              {isPremium && (
                <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FFD700]">
                  <Crown className="h-2.5 w-2.5 text-[#000]" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="truncate font-serif text-sm font-bold uppercase tracking-wide text-foreground/95">{firstName}</h4>
              <p className="text-xs text-muted-foreground">Nivel {level} • {currentXP.toLocaleString("pt-BR")} XP</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          {visibleMenuItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "h-10 w-full justify-start gap-3 rounded-xl px-3 font-sans text-sm",
                activeTab === item.id
                  ? "bg-[#ff5b00] text-white hover:bg-[#e65200]"
                  : "text-muted-foreground hover:border hover:border-border/70 hover:bg-muted/35 hover:text-foreground"
              )}
              onClick={() => handleMenuClick(item)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>

        {!isPremium && (
          <div className="mb-3 mt-auto">
            <div className="rounded-xl border border-[#6b560f] bg-gradient-to-br from-[#2a2108] to-[#171307] p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <Crown className="h-4 w-4 text-[#FFD700]" />
                <span className="font-serif text-xs font-bold uppercase tracking-wide text-[#FFD700]">PRO</span>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">Desbloqueie recursos exclusivos e apareça no topo do ranking.</p>
              <Button
                variant="outline"
                className="w-full border-[#FFD700]/45 bg-[#FFD700]/10 font-serif text-xs uppercase tracking-wide text-[#FFD700] hover:bg-[#FFD700]/16"
                size="sm"
                onClick={() => router.push("/planos")}
              >
                Fazer Upgrade
              </Button>
            </div>
          </div>
        )}

        <div className={isPremium ? "mt-auto" : ""}>
          <Button
            variant="ghost"
            className={cn(
              "h-10 w-full justify-start gap-3 rounded-xl",
              activeTab === "configuracoes"
                ? "bg-[#ff5b00] text-white hover:bg-[#e65200]"
                : "text-muted-foreground hover:border hover:border-border/80 hover:bg-muted/45 hover:text-foreground"
            )}
            onClick={() => {
              onTabChange("configuracoes")
              router.push("/configuracoes")
            }}
          >
            <Settings className="h-4 w-4" />
            Configuracoes
          </Button>

          <Button
            onClick={logout}
            variant="outline"
            className="mt-1 h-10 w-full justify-start gap-3 rounded-xl border-border/80 text-muted-foreground hover:bg-muted/45 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair da Conta
          </Button>
        </div>
      </div>
    </aside>
  )
}
