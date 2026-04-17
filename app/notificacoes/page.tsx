"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser } from "@/context/user-context"

interface Notification {
  id: number
  type: "system" | "chat" | "follow" | "mutual_follow"
  title: string
  message: string
  createdAt: string
  isRead: boolean
  actorId?: number | null
  actorName?: string
}

const PRIMARY_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"
const API_BASE_CANDIDATES = Array.from(new Set(["http://127.0.0.1:5001", PRIMARY_API_BASE]))

export default function NotificacoesPage() {
  const router = useRouter()
  const { user, isAuthReady } = useUser()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [apiBase, setApiBase] = useState(PRIMARY_API_BASE)

  const requestWithFallback = async (path: string, init?: RequestInit): Promise<Response | null> => {
    const orderedBases = [apiBase, ...API_BASE_CANDIDATES.filter((b) => b !== apiBase)]

    for (const base of orderedBases) {
      try {
        const response = await fetch(`${base}${path}`, init)
        if (response.status === 404) continue
        setApiBase(base)
        return response
      } catch {
        // tenta proximo backend
      }
    }

    return null
  }

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) {
      router.push("/login")
      return
    }

    const loadNotifications = async () => {
      const res = await requestWithFallback(`/api/notifications?user_id=${user.id}`)
      if (!res?.ok) return

      const payload = await res.json()
      if (Array.isArray(payload?.notifications)) {
        setNotifications(payload.notifications)
      }
    }

    loadNotifications()
    const interval = window.setInterval(loadNotifications, 4000)
    return () => window.clearInterval(interval)
  }, [isAuthReady, user, router])

  if (!isAuthReady || !user) return null

  const markAllAsRead = async () => {
    const res = await requestWithFallback("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    })
    if (!res?.ok) return
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const chatSummary = "Siga e seja seguido para liberar mensagens diretas entre atletas."

  return (
    <main className="min-h-screen bg-background p-4 lg:p-8">
      <div className="flex items-center justify-between mb-4">
        <Button variant="secondary" size="sm" onClick={() => router.push("/dashboard")}> 
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Dashboard
        </Button>
      </div>
      <h1 className="font-serif text-3xl font-bold text-foreground uppercase mb-3">Notificações e Chat</h1>
      <p className="text-sm text-muted-foreground mb-4">Centralize avisos e comunicação rápida com seu treinador.</p>

      <div className="space-y-4">
        <section className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Notificações</h2>
            <Button variant="secondary" size="sm" onClick={markAllAsRead}>
              <BellRing className="w-4 h-4 mr-2" /> Marcar como lidas
            </Button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-4">Não há notificações por enquanto.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {notifications.map((n) => (
                <li key={n.id} className={`border border-border rounded-lg p-3 bg-background ${n.isRead ? "opacity-75" : "ring-1 ring-primary/40"}`}>
                  <p className="font-semibold text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.createdAt} {n.actorName ? `• ${n.actorName}` : ""}</p>
                  <p className="text-sm mt-1">{n.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-lg">Chat do Site</h2>
          <p className="text-sm text-muted-foreground">{chatSummary}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/chat")}>Ir para o Chat</Button>
        </section>
      </div>
    </main>
  )
}

