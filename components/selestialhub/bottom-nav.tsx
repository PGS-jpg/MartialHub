"use client"

import { useRouter } from "next/navigation"
import { LayoutDashboard, MapPin, Calendar, User, Crown, MessageCircle, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useUser } from "@/context/user-context"

const navItems = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard, href: "/dashboard" },
  { id: "academias", label: "Academias", icon: MapPin, href: "/academias" },
  { id: "eventos", label: "Eventos", icon: Calendar, href: "/eventos" },
  { id: "tecnicos", label: "Tecnicos", icon: ClipboardList, href: "/tecnicos", requiresCoach: true },
  { id: "treino", label: "Treino", icon: Crown, href: "/treino" },
  { id: "chat", label: "Chat", icon: MessageCircle, href: "/chat" },
  { id: "perfil", label: "Perfil", icon: User, href: "/profile" },
]

interface BottomNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const router = useRouter()
  const { user } = useUser()
  const visibleNavItems = navItems.filter((item) => !item.requiresCoach || user?.is_coach)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="px-2 pb-1 pt-1">
        <div className="rounded-2xl border border-border/80 bg-[#0a0a0a]/92 backdrop-blur-xl shadow-[0_14px_45px_rgba(0,0,0,0.5)]">
        <div className="grid h-[68px] px-1" style={{ gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))` }}>
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id)
                if (item.href) router.push(item.href)
              }}
              className={cn(
                "relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 pb-1 pt-1 transition-colors",
                activeTab === item.id ? "text-primary" : "text-muted-foreground"
              )}
            >
              {activeTab === item.id && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <item.icon className="h-4 w-4" />
              <span className="truncate text-[9px] font-medium leading-none">
                {item.label}
              </span>
            </button>
          ))}
        </div>
        </div>
      </div>
      <div className="h-safe-area-inset-bottom bg-[#0a0a0a]" />
    </nav>
  )
}
