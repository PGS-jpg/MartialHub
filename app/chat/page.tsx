"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, MessageCircle, Search, Send, Users } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { useUser } from "@/context/user-context"

const PRIMARY_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"
const API_BASE_CANDIDATES = Array.from(new Set(["http://127.0.0.1:5001", PRIMARY_API_BASE]))
const LOCAL_CHAT_KEY = "selestialhub_chat_local_messages"
const LOCAL_CHAT_READ_KEY = "selestialhub_chat_last_read"

interface ChatMessage {
  id: number
  user_id: number | null
  recipient_id: number | null
  user_name: string
  message: string
  created_at: string
}

interface ChatUser {
  id: number
  nome: string
  avatarUrl?: string
  can_message?: boolean
  i_follow?: boolean
  follows_me?: boolean
}

interface Conversation {
  key: string
  title: string
  subtitle: string
  peerId: number | null
  avatarUrl?: string
  lastMessageAt: string | null
  unreadCount: number
  canMessage: boolean
}

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthReady } = useUser()
  const preferredPeerId = Number(searchParams.get("peerId") || "")

  const [contacts, setContacts] = useState<ChatUser[]>([])
  const [serverMessages, setServerMessages] = useState<ChatMessage[]>([])
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState("")
  const [search, setSearch] = useState("")
  const [activeConversation, setActiveConversation] = useState<string>("community")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [apiBase, setApiBase] = useState(PRIMARY_API_BASE)
  const [lastReadByConversation, setLastReadByConversation] = useState<Record<string, number>>({})
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const requestWithFallback = async (path: string, init?: RequestInit): Promise<Response | null> => {
    const orderedBases = [apiBase, ...API_BASE_CANDIDATES.filter((b) => b !== apiBase)]
    let lastResponse: Response | null = null

    for (const base of orderedBases) {
      try {
        const response = await fetch(`${base}${path}`, init)

        if (response.status === 404) {
          lastResponse = response
          continue
        }

        setApiBase(base)
        return response
      } catch {
        // Tenta o próximo backend candidato.
      }
    }

    return lastResponse
  }

  const currentPeerId = useMemo(() => {
    if (!activeConversation || activeConversation === "community") return null
    const parsed = Number(activeConversation)
    return Number.isNaN(parsed) ? null : parsed
  }, [activeConversation])

  useEffect(() => {
    if (!user) return

    try {
      const stored = localStorage.getItem(LOCAL_CHAT_KEY)
      if (!stored) {
        setLocalMessages([])
        return
      }

      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) {
        setLocalMessages([])
        return
      }

      const mine = parsed.filter((m) => m && m.user_id === user.id)
      setLocalMessages(mine)
    } catch {
      setLocalMessages([])
    }
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    try {
      const raw = localStorage.getItem(LOCAL_CHAT_READ_KEY)
      if (!raw) {
        setLastReadByConversation({})
        return
      }
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object") {
        setLastReadByConversation(parsed)
      }
    } catch {
      setLastReadByConversation({})
    }
  }, [user?.id])

  useEffect(() => {
    localStorage.setItem(LOCAL_CHAT_READ_KEY, JSON.stringify(lastReadByConversation))
  }, [lastReadByConversation])

  useEffect(() => {
    if (!user) return

    try {
      const stored = localStorage.getItem(LOCAL_CHAT_KEY)
      const parsed = stored ? JSON.parse(stored) : []
      const others = Array.isArray(parsed) ? parsed.filter((m) => m && m.user_id !== user.id) : []
      localStorage.setItem(LOCAL_CHAT_KEY, JSON.stringify([...others, ...localMessages]))
    } catch {
      // ignorar falha local
    }
  }, [localMessages, user?.id])

  const allMessages = useMemo(() => {
    return [...serverMessages, ...localMessages].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime()
      const bTime = new Date(b.created_at).getTime()
      if (aTime !== bTime) return aTime - bTime
      return a.id - b.id
    })
  }, [serverMessages, localMessages])

  const fetchChatData = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const [usersRes, messagesRes] = await Promise.all([
        requestWithFallback(`/api/chat/users?exclude_id=${user.id}`),
        requestWithFallback(`/api/chat?user_id=${user.id}`),
      ])

      if (usersRes?.ok) {
        const usersPayload = await usersRes.json()
        const allUsers = Array.isArray(usersPayload.users) ? usersPayload.users : []
        setContacts(allUsers.filter((u: ChatUser) => Boolean(u.can_message)))
      }

      if (messagesRes?.ok) {
        const messagePayload = await messagesRes.json()
        setServerMessages(messagePayload.messages || [])
      }
    } catch {
      // Mantem o chat funcional mesmo sem backend.
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return

    fetchChatData()
    const interval = window.setInterval(fetchChatData, 2500)
    return () => window.clearInterval(interval)
  }, [user?.id])

  const directMessages = useMemo(() => {
    if (!user) return []

    return allMessages.filter((m) => m.recipient_id !== null && (m.user_id === user.id || m.recipient_id === user.id))
  }, [allMessages, user])

  const communityMessages = useMemo(() => {
    return allMessages.filter((m) => m.recipient_id === null)
  }, [allMessages])

  const conversations = useMemo<Conversation[]>(() => {
    const list: Conversation[] = []

    const communityLast = communityMessages[communityMessages.length - 1]
    const communityLastRead = Number(lastReadByConversation.community || 0)
    const communityUnreadCount = communityMessages.filter((m) => {
      const createdAt = new Date(m.created_at).getTime()
      return m.user_id !== user?.id && createdAt > communityLastRead
    }).length
    list.push({
      key: "community",
      title: "Comunidade SelestialHub",
      subtitle: communityLast?.message || "Conversa geral dos atletas",
      peerId: null,
      avatarUrl: "",
      lastMessageAt: communityLast?.created_at || null,
      unreadCount: communityUnreadCount,
      canMessage: true,
    })

    contacts.forEach((c) => {
      const messages = directMessages.filter(
        (m) => m.user_id === c.id || m.recipient_id === c.id
      )
      const last = messages[messages.length - 1]
      const conversationRead = Number(lastReadByConversation[String(c.id)] || 0)
      const unreadCount = messages.filter((m) => {
        const createdAt = new Date(m.created_at).getTime()
        return m.user_id === c.id && createdAt > conversationRead
      }).length
      list.push({
        key: String(c.id),
        title: c.nome,
        subtitle: last?.message || "Toque para iniciar conversa",
        peerId: c.id,
        avatarUrl: c.avatarUrl || "",
        lastMessageAt: last?.created_at || null,
        unreadCount,
        canMessage: Boolean(c.can_message),
      })
    })

    return list.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
      return bTime - aTime
    })
  }, [communityMessages, contacts, directMessages, lastReadByConversation, user?.id])

  useEffect(() => {
    if (!conversations.length) {
      setActiveConversation("")
      return
    }

    if (!activeConversation || !conversations.some((c) => c.key === activeConversation)) {
      setActiveConversation(conversations[0].key)
    }
  }, [activeConversation, conversations])

  useEffect(() => {
    if (!Number.isFinite(preferredPeerId) || preferredPeerId <= 0) return
    if (!contacts.some((c) => c.id === preferredPeerId)) return
    setActiveConversation(String(preferredPeerId))
  }, [contacts, preferredPeerId])

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q))
  }, [conversations, search])

  const activeMessages = useMemo(() => {
    if (!user) return []
    if (currentPeerId === null) return communityMessages

    return directMessages.filter(
      (m) =>
        (m.user_id === user.id && m.recipient_id === currentPeerId) ||
        (m.user_id === currentPeerId && m.recipient_id === user.id)
    )
  }, [communityMessages, currentPeerId, directMessages, user])

  const activeConversationMeta = useMemo(() => {
    return conversations.find((c) => c.key === activeConversation)
  }, [conversations, activeConversation])

  const contactMap = useMemo(() => {
    const map = new Map<number, ChatUser>()
    contacts.forEach((c) => map.set(c.id, c))
    return map
  }, [contacts])

  const myInitials = (user?.nome || "EU")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const cannotMessageDirect = currentPeerId !== null && !activeConversationMeta?.canMessage

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeMessages.length, activeConversation])

  useEffect(() => {
    if (!activeConversation) return

    const latestActiveTimestamp = activeMessages.length
      ? new Date(activeMessages[activeMessages.length - 1].created_at).getTime()
      : Date.now()

    setLastReadByConversation((prev) => {
      const current = Number(prev[activeConversation] || 0)
      if (latestActiveTimestamp <= current) return prev
      return { ...prev, [activeConversation]: latestActiveTimestamp }
    })
  }, [activeConversation, activeMessages])

  const sendMessage = async () => {
    if (!message.trim() || !user || isSending) return
    if (cannotMessageDirect) return

    const payload = {
      user_id: user.id,
      user_name: user.nome,
      recipient_id: currentPeerId,
      message: message.trim(),
    }

    try {
      setIsSending(true)
      const res = await requestWithFallback(`/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res?.ok) {
        const data = await res.json()
        setServerMessages((prev) => [...prev, data])
        setMessage("")
        return
      }

      if (res?.status === 403) {
        return
      }

      const fallbackMessage: ChatMessage = {
        id: Date.now() * -1,
        user_id: user.id,
        recipient_id: currentPeerId,
        user_name: user.nome,
        message: message.trim(),
        created_at: new Date().toISOString(),
      }

      setLocalMessages((prev) => [...prev, fallbackMessage])
      setMessage("")
    } catch {

      const fallbackMessage: ChatMessage = {
        id: Date.now() * -1,
        user_id: user.id,
        recipient_id: currentPeerId,
        user_name: user.nome,
        message: message.trim(),
        created_at: new Date().toISOString(),
      }

      setLocalMessages((prev) => [...prev, fallbackMessage])
      setMessage("")
    } finally {
      setIsSending(false)
    }
  }

  if (!isAuthReady) {
    return null
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0d10] p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#232832] bg-[#131820] p-6 text-center shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
          <MessageCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Faca login para usar o chat.</p>
          <button onClick={() => router.push("/login")} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#ff5b00] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e65200]">
            Ir para login
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#0b0d10]">
      <div className="flex items-center justify-between border-b border-[#232832] bg-[#0f1318] px-4 py-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#2a3040] bg-[#1b2027] px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-[#242b36]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Chat</p>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 w-full overflow-hidden bg-[#131820]">

          {/* ── Coluna esquerda: lista de conversas ── */}
          <aside className="flex w-full flex-col border-r border-[#232832] bg-[#0f1318] lg:w-[320px] xl:w-[360px] shrink-0">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[#232832] p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold uppercase tracking-[0.06em] text-foreground">{user.nome}</p>
                <p className="text-[11px] text-muted-foreground">Mensagens</p>
              </div>
            </div>

            {/* Search */}
            <div className="border-b border-[#232832] p-3">
              <div className="flex items-center gap-2 rounded-xl border border-[#2a3040] bg-[#1b2027] px-3">
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar conversa"
                  className="h-9 border-0 bg-transparent text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.key}
                  onClick={() => setActiveConversation(conversation.key)}
                  className={`w-full border-b border-[#1a2030] px-4 py-3 text-left transition-colors ${
                    activeConversation === conversation.key ? "bg-[#1b2027]" : "hover:bg-[#161c24]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#2a3040] bg-[#1b2027] text-[11px] font-bold text-foreground">
                        {conversation.avatarUrl ? (
                          <img src={conversation.avatarUrl} alt={conversation.title} className="h-full w-full object-cover" />
                        ) : conversation.peerId === null ? (
                          <MessageCircle className="h-4 w-4 text-primary" />
                        ) : (
                          conversation.title.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{conversation.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{conversation.subtitle}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[10px] text-muted-foreground/60" suppressHydrationWarning>
                        {conversation.lastMessageAt
                          ? new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "--:--"}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <p className="mt-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#ff5b00] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* ── Coluna direita: área de mensagens (desktop) ── */}
          <div className="hidden min-h-0 flex-1 flex-col lg:flex">
            {/* Chat header */}
            <div className="flex items-center border-b border-[#232832] px-5 py-3">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-[#2a3040] bg-[#1b2027] text-xs font-bold text-foreground">
                {activeConversationMeta?.avatarUrl ? (
                  <img src={activeConversationMeta.avatarUrl} alt={activeConversationMeta.title} className="h-full w-full object-cover" />
                ) : currentPeerId === null ? (
                  <MessageCircle className="h-4 w-4 text-primary" />
                ) : (
                  (activeConversationMeta?.title || "AT").slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-bold text-foreground">{activeConversationMeta?.title || "Conversa"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {currentPeerId === null ? "Canal geral da plataforma" : "Conversa direta"}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-2 overflow-y-auto p-5">
              {isLoading && activeMessages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
                </div>
              ) : activeMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/25" />
                  <p className="text-sm text-muted-foreground">Sem mensagens nesta conversa.</p>
                </div>
              ) : (
                activeMessages.map((m) => {
                  const isMe = m.user_id === user.id
                  const senderAvatar = !isMe && m.user_id ? contactMap.get(m.user_id)?.avatarUrl : ""
                  const senderInitials = isMe
                    ? myInitials
                    : (m.user_name || "AT").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                  return (
                    <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`flex max-w-[75%] items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#2a3040] bg-[#1b2027] text-[10px] font-bold text-foreground">
                          {senderAvatar ? (
                            <img src={senderAvatar} alt={m.user_name} className="h-full w-full object-cover" />
                          ) : senderInitials}
                        </div>
                        <div className={`rounded-2xl px-3.5 py-2.5 shadow-md ${isMe ? "rounded-br-md bg-[#ff5b00] text-white" : "rounded-bl-md border border-[#2a3040] bg-[#1b2027] text-foreground"}`}>
                          <div className={`mb-1 flex items-center justify-between gap-3 text-[10px] ${isMe ? "text-white/70" : "text-muted-foreground"}`}>
                            <span className="font-semibold uppercase tracking-[0.14em]">{isMe ? "Voce" : m.user_name}</span>
                            <span suppressHydrationWarning>
                              {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{m.message}</p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[#232832] bg-[#0f1318] p-3">
              {cannotMessageDirect && (
                <p className="mb-2 text-center text-[11px] text-muted-foreground">Siga e seja seguido para liberar mensagens diretas.</p>
              )}
              <div className="flex items-center gap-2">
                <Input
                  placeholder={
                    currentPeerId === null
                      ? "Mensagem para a comunidade..."
                      : cannotMessageDirect
                        ? "Mensagens bloqueadas"
                        : `Mensagem para ${activeConversationMeta?.title || "contato"}...`
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage() } }}
                  className="h-11 border-[#2a3040] bg-[#1b2027] text-foreground placeholder:text-muted-foreground/50"
                  disabled={cannotMessageDirect}
                />
                <button
                  onClick={sendMessage}
                  disabled={isSending || !message.trim() || cannotMessageDirect}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ff5b00] text-white transition hover:bg-[#e65200] disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Mobile: painel de mensagens ── */}
          <div className="flex min-h-0 flex-1 flex-col lg:hidden">
            {activeConversation && (
              <>
                <div className="flex items-center border-b border-[#232832] px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-[#2a3040] bg-[#1b2027] text-xs font-bold text-foreground">
                    {currentPeerId === null ? <MessageCircle className="h-4 w-4 text-primary" /> : (activeConversationMeta?.title || "AT").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-bold text-foreground">{activeConversationMeta?.title || "Conversa"}</p>
                    <p className="text-[11px] text-muted-foreground">{currentPeerId === null ? "Canal geral" : "Conversa direta"}</p>
                  </div>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto p-3">
                  {activeMessages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2">
                      <MessageCircle className="h-8 w-8 text-muted-foreground/25" />
                      <p className="text-sm text-muted-foreground">Sem mensagens.</p>
                    </div>
                  ) : (
                    activeMessages.map((m) => {
                      const isMe = m.user_id === user.id
                      const senderAvatar = !isMe && m.user_id ? contactMap.get(m.user_id)?.avatarUrl : ""
                      const senderInitials = isMe
                        ? myInitials
                        : (m.user_name || "AT").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                      return (
                        <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`flex max-w-[82%] items-end gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#2a3040] bg-[#1b2027] text-[9px] font-bold text-foreground">
                              {senderAvatar ? <img src={senderAvatar} alt={m.user_name} className="h-full w-full object-cover" /> : senderInitials}
                            </div>
                            <div className={`rounded-2xl px-3 py-2 ${isMe ? "rounded-br-md bg-[#ff5b00] text-white" : "rounded-bl-md border border-[#2a3040] bg-[#1b2027] text-foreground"}`}>
                              <div className={`mb-0.5 flex gap-2 text-[9px] ${isMe ? "text-white/70" : "text-muted-foreground"}`}>
                                <span className="font-semibold uppercase">{isMe ? "Voce" : m.user_name}</span>
                                <span suppressHydrationWarning>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                              <p className="text-sm leading-relaxed">{m.message}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-[#232832] bg-[#0f1318] p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={cannotMessageDirect ? "Mensagens bloqueadas" : "Escreva uma mensagem..."}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage() } }}
                      className="h-10 border-[#2a3040] bg-[#1b2027] text-foreground placeholder:text-muted-foreground/50"
                      disabled={cannotMessageDirect}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isSending || !message.trim() || cannotMessageDirect}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff5b00] text-white hover:bg-[#e65200] disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </main>
  )
}

