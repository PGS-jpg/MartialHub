"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Award,
  CalendarClock,
  Crown,
  Flame,
  Medal,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react"
import { useUser } from "@/context/user-context"
import { TopBar } from "@/components/selestialhub/top-bar"
import { Sidebar } from "@/components/selestialhub/sidebar"
import { BottomNav } from "@/components/selestialhub/bottom-nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const PRIMARY_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"
const API_BASE_CANDIDATES = Array.from(new Set(["http://127.0.0.1:5001", PRIMARY_API_BASE]))
const RANKING_CACHE_KEY = "selestialhub_ranking_users_cache"

type BoardTab = "global" | "regional" | "academia" | "amigos" | "revelacoes" | "consistencia"
type ModalityFilter = "global" | "bjj" | "muay-thai" | "boxe" | "judo" | "mma"

interface Athlete {
  id: number
  name: string
  avatarUrl?: string
  academy: string
  region: string
  modalidade: Exclude<ModalityFilter, "global">
  faixa: "" | "branca" | "azul" | "roxa" | "marrom" | "preta"
  isPro: boolean
  verifiedFights: number
  repeatedOpponentRate: number
  last30Activity: number
  wins: number
  losses: number
  finishWins: number
  officialWins: number
  streak: number
  lastFightDaysAgo: number
  friendsWithUser?: boolean
}

interface RankingUser {
  id: number
  unique_key?: string
  nome: string
  avatarUrl?: string
  email?: string
  is_pro?: boolean
  cidade?: string
  modalidade?: string
  academia?: string
  faixa?: string
  currentXP?: number
  level?: number
  wins?: number
  losses?: number
  finishWins?: number
  officialWins?: number
  verifiedFights?: number
  repeatedOpponentRate?: number
  last30Activity?: number
  lastFightDaysAgo?: number
}

interface RankingAudit {
  users_total: number
  source_counts: Record<string, number>
  duplicates_filtered: number
}

function calculateScore(a: Athlete) {
  return Math.max(0, Number(a.officialWins) * 200 + Number(a.finishWins) * 40 + Number(a.wins - a.losses) * 20 + Number(a.last30Activity) * 10)
}

function trustLabel(a: Athlete) {
  if (a.verifiedFights >= 10 && a.repeatedOpponentRate <= 0.3) return "Confiavel"
  if (a.repeatedOpponentRate > 0.45) return "Em revisao"
  return "Padrao"
}

function normalizeModality(raw: string | undefined, seed: number): Exclude<ModalityFilter, "global"> {
  const value = (raw || "").trim().toLowerCase()
  if (value === "bjj" || value === "muay-thai" || value === "boxe" || value === "judo" || value === "mma") {
    return value
  }
  const defaults: Array<Exclude<ModalityFilter, "global">> = ["bjj", "muay-thai", "boxe", "judo", "mma"]
  return defaults[Math.abs(seed) % defaults.length]
}

function normalizeFaixa(raw: string | undefined): Athlete["faixa"] {
  const value = (raw || "").trim().toLowerCase()
  if (value === "branca" || value === "azul" || value === "roxa" || value === "marrom" || value === "preta") {
    return value
  }
  return ""
}

function buildAthleteFromUser(user: RankingUser, currentUserId?: number): Athlete {
  const seedBase = `${user.unique_key || user.id}-${user.nome || ""}-${user.email || ""}`
  const seed = Array.from(seedBase).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const modalidade = normalizeModality(user.modalidade, seed)
  const faixa = normalizeFaixa(user.faixa)
  const wins = Math.max(0, Number(user.wins) || 0)
  const losses = Math.max(0, Number(user.losses) || 0)
  const finishWins = Math.max(0, Number(user.finishWins) || 0)
  const officialWins = Math.max(0, Number(user.officialWins) || 0)
  const verifiedFights = Math.max(0, Number(user.verifiedFights) || 0)
  const repeatedOpponentRate = Math.max(0, Number(user.repeatedOpponentRate) || 0)
  const last30Activity = Math.max(0, Number(user.last30Activity) || 0)
  const lastFightDaysAgo = Number.isFinite(Number(user.lastFightDaysAgo)) ? Number(user.lastFightDaysAgo) : 999
  const score = Number(user.currentXP)
  const fallbackScore = calculateScore({
    id: user.id,
    name: user.nome,
    academy: user.academia?.trim() || "Sem academia",
    region: user.cidade?.trim() || "--",
    modalidade,
    faixa,
    isPro: Boolean(user.is_pro),
    verifiedFights,
    repeatedOpponentRate,
    last30Activity,
    wins,
    losses,
    finishWins,
    officialWins,
    streak: 0,
    lastFightDaysAgo,
  })

  return {
    id: user.id,
    name: user.nome,
    avatarUrl: user.avatarUrl || "",
    academy: user.academia?.trim() || "Sem academia",
    region: user.cidade?.trim() || "--",
    modalidade,
    faixa,
    isPro: Boolean(user.is_pro),
    verifiedFights,
    repeatedOpponentRate,
    last30Activity,
    wins,
    losses,
    finishWins,
    officialWins,
    streak: Math.max(0, last30Activity - losses),
    lastFightDaysAgo,
    friendsWithUser: currentUserId ? user.id !== currentUserId && user.id % 3 === 0 : user.id % 3 === 0,
    score: Number.isFinite(score) ? Math.max(0, score) : fallbackScore,
  }
}

export default function RankingPage() {
  const router = useRouter()
  const { user, isAuthReady } = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("ranking")
  const [boardTab, setBoardTab] = useState<BoardTab>("global")
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>("global")
  const [query, setQuery] = useState("")
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loadedUsersCount, setLoadedUsersCount] = useState<number>(0)
  const [audit, setAudit] = useState<RankingAudit | null>(null)

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) router.push("/login")
  }, [isAuthReady, router, user])

  const loadRegisteredUsers = useCallback(async () => {
    if (!user) return

    const mergedUsers: RankingUser[] = []

    for (const base of API_BASE_CANDIDATES) {
      try {
        const res = await fetch(`${base}/api/ranking/users`)
        if (!res.ok) continue

        const payload = await res.json()
        const users: RankingUser[] = Array.isArray(payload?.users) ? payload.users : []
        mergedUsers.push(...users)
      } catch {
        // tenta próximo backend
      }

      try {
        const auditRes = await fetch(`${base}/api/ranking/audit`)
        if (auditRes.ok) {
          const auditPayload: RankingAudit = await auditRes.json()
          setAudit(auditPayload)
        }
      } catch {
        // auditoria é opcional
      }
    }

    const dedupedMap = new Map<string, RankingUser>()
    for (const u of mergedUsers) {
      const dedupeKey =
        (u.email || "").trim().toLowerCase() ||
        (u.unique_key || "").trim().toLowerCase() ||
        `${(u.nome || "").trim().toLowerCase()}-${u.id}`

      if (!dedupeKey) continue
      if (!dedupedMap.has(dedupeKey)) {
        dedupedMap.set(dedupeKey, u)
      }
    }

    const uniqueUsers = Array.from(dedupedMap.values())

    const hasCurrent = uniqueUsers.some((u) => u.id === user.id || (u.nome || "").trim().toLowerCase() === user.nome.trim().toLowerCase())
    const normalizedUsers = hasCurrent
      ? uniqueUsers
      : [
          ...uniqueUsers,
          {
            id: user.id,
            unique_key: `current-${user.id}`,
            nome: user.nome,
            email: "",
            is_pro: Boolean((user as { is_pro?: boolean }).is_pro),
            cidade: "",
            modalidade: "",
            academia: "Sem academia",
            currentXP: Number((user as { currentXP?: number }).currentXP) || 0,
          },
        ]

    if (normalizedUsers.length > 0) {
      const mapped = normalizedUsers.map((u) => buildAthleteFromUser(u, user.id))
      setAthletes(mapped)
      setLoadedUsersCount(normalizedUsers.length)
      localStorage.setItem(RANKING_CACHE_KEY, JSON.stringify(normalizedUsers))
      return
    }

    try {
      const cacheRaw = localStorage.getItem(RANKING_CACHE_KEY)
      if (cacheRaw) {
        const cacheUsers: RankingUser[] = JSON.parse(cacheRaw)
        if (Array.isArray(cacheUsers) && cacheUsers.length > 0) {
          const mapped = cacheUsers.map((u) => buildAthleteFromUser(u, user.id))
          setAthletes(mapped)
          setLoadedUsersCount(cacheUsers.length)
          return
        }
      }
    } catch {
      // fallback final abaixo
    }

    setAthletes([])
    setLoadedUsersCount(0)
    setAudit(null)
  }, [user])

  useEffect(() => {
    if (!user) return

    loadRegisteredUsers()
    const interval = window.setInterval(loadRegisteredUsers, 10000)
    return () => window.clearInterval(interval)
  }, [loadRegisteredUsers, user])

  const seasonEndsAt = "30/04/2026"

  const seasonRewards = [
    "#1 Global: 1 mes de PRO gratis + cupom 30% na loja",
    "Top 3 Modalidade: cupom 20% + badge Elite da temporada",
    "Top 10 Regional: cupom 10% + prioridade em eventos parceiros",
  ]

  const ranked = useMemo(() => {
    const mapped = athletes.map((athlete) => ({
      ...athlete,
      score: athlete.score,
      trust: trustLabel(athlete),
    }))

    const currentUserAthlete = mapped.find((a) => a.id === user.id)

    const byBoard = mapped.filter((a) => {
      if (boardTab === "regional") return currentUserAthlete ? a.region === currentUserAthlete.region : true
      if (boardTab === "academia") return currentUserAthlete ? a.academy === currentUserAthlete.academy : true
      if (boardTab === "amigos") return Boolean(a.friendsWithUser)
      if (boardTab === "revelacoes") return a.verifiedFights <= 8 && a.last30Activity >= 8
      return true
    })

    const byModality = byBoard.filter((a) => {
      if (modalityFilter === "global") return true
      return a.modalidade === modalityFilter
    })

    const bySearch = byModality.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()))

    const sorted = [...bySearch].sort((a, b) => {
      if (boardTab === "consistencia") {
        if (b.last30Activity !== a.last30Activity) return b.last30Activity - a.last30Activity
        return b.streak - a.streak
      }
      return b.score - a.score
    })

    return sorted.map((a, index) => ({ ...a, rank: index + 1 }))
  }, [athletes, boardTab, modalityFilter, query, user.id])

  const podium = ranked.slice(0, 3)
  const myRow = ranked.find((a) => a.id === user.id)
  const safeCurrentXP = myRow?.score ?? 0
  const missions = useMemo(() => {
    const officialWinsProgress = Math.min(2, Math.max(0, Number(myRow?.officialWins) || 0))
    const trainingProgress = Math.min(5, Math.max(0, Number(myRow?.last30Activity) || 0))
    const verifiedFightProgress = Math.min(1, Math.max(0, Number(myRow?.verifiedFights) || 0))

    return [
      { id: 1, title: "Vencer 2 lutas oficiais", progress: officialWinsProgress, target: 2, reward: "+45 pts" },
      { id: 2, title: "Treinar 5x esta semana", progress: trainingProgress, target: 5, reward: "+30 pts" },
      { id: 3, title: "Registrar 1 luta validada", progress: verifiedFightProgress, target: 1, reward: "+25 pts" },
    ]
  }, [myRow?.last30Activity, myRow?.officialWins, myRow?.verifiedFights])

  if (!isAuthReady || !user) {
    return null
  }

  return (
    <main className="min-h-screen bg-background">
      <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isOpen={sidebarOpen} />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="lg:ml-64 pb-20 lg:pb-6">
        <div className="p-4 lg:p-6">
          <div className="max-w-6xl">
            <div className="mb-4 rounded-2xl border border-border bg-gradient-to-r from-[#141414] via-[#1f1a0f] to-[#121212] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-primary/80">Season ranking</p>
              <h1 className="mt-2 font-serif text-3xl font-bold uppercase tracking-wide text-foreground">Ranks competitivo</h1>
              <p className="mt-2 text-sm text-muted-foreground">Global e por modalidade com regras transparentes, anti-abuso e recompensas de temporada.</p>
              <p className="mt-1 text-xs text-primary/80">Usuarios cadastrados carregados: {loadedUsersCount}</p>
              {audit ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Auditoria: total={audit.users_total} | duplicados filtrados={audit.duplicates_filtered} | fontes={Object.entries(audit.source_counts)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(" • ")}
                </p>
              ) : null}
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Seu score atual</p>
                <p className="mt-1 font-serif text-3xl font-bold text-primary">{safeCurrentXP.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">Posicao atual: {myRow ? `#${myRow.rank}` : "fora do top"}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Temporada</p>
                </div>
                <p className="mt-1 font-serif text-2xl font-bold text-foreground">ate {seasonEndsAt}</p>
                <p className="text-xs text-muted-foreground">Reset parcial com historico preservado</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Recompensa topo</p>
                </div>
                <p className="mt-1 font-serif text-xl font-bold text-foreground">PRO 1 mes + cupom 30%</p>
                <p className="text-xs text-muted-foreground">Para #1 global da season</p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="border-border bg-card p-4 lg:col-span-2">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {([
                    ["global", "Global"],
                    ["regional", "Regional"],
                    ["academia", "Academia"],
                    ["amigos", "Amigos"],
                    ["revelacoes", "Revelacoes"],
                    ["consistencia", "Consistencia"],
                  ] as Array<[BoardTab, string]>).map(([value, label]) => (
                    <Button key={value} size="sm" variant={boardTab === value ? "default" : "secondary"} onClick={() => setBoardTab(value)}>
                      {label}
                    </Button>
                  ))}
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {([
                    ["global", "Global"],
                    ["bjj", "BJJ"],
                    ["muay-thai", "Muay Thai"],
                    ["boxe", "Boxe"],
                    ["judo", "Judo"],
                    ["mma", "MMA"],
                  ] as Array<[ModalityFilter, string]>).map(([value, label]) => (
                    <Button key={value} size="sm" variant={modalityFilter === value ? "default" : "outline"} onClick={() => setModalityFilter(value)}>
                      {label}
                    </Button>
                  ))}
                </div>

                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar atleta" className="mb-3" />

                <div className="grid grid-cols-3 gap-2">
                  {podium.map((athlete, i) => (
                    <div key={athlete.id} className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                      <p className="text-xs text-muted-foreground">#{i + 1}</p>
                      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-bold text-foreground">
                        {athlete.avatarUrl ? (
                          <img src={athlete.avatarUrl} alt={athlete.name} className="h-full w-full object-cover" />
                        ) : (
                          athlete.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <p className="truncate font-semibold text-foreground">{athlete.name}</p>
                      <p className="text-xs text-muted-foreground">{athlete.score} pts</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-border">
                  {ranked.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-sm text-foreground">Nenhum usuario cadastrado encontrado no backend.</p>
                      <p className="mt-1 text-xs text-muted-foreground">Assim que novos usuarios criarem conta, eles aparecem aqui automaticamente.</p>
                    </div>
                  ) : (
                    ranked.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => router.push(`/profile?athleteId=${a.id}`)}
                        className="grid w-full grid-cols-[56px_44px_1fr_auto] items-center gap-3 border-b border-border/70 p-3 text-left transition-colors hover:bg-muted/30 last:border-b-0"
                      >
                        <div className="flex items-center gap-1">
                          <span className="font-serif text-lg font-bold text-foreground">#{a.rank}</span>
                          {a.rank <= 3 ? <Crown className="h-3.5 w-3.5 text-[#FFD700]" /> : null}
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-bold text-foreground">
                          {a.avatarUrl ? (
                            <img src={a.avatarUrl} alt={a.name} className="h-full w-full object-cover" />
                          ) : (
                            a.name.slice(0, 2).toUpperCase()
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-foreground">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.academy} • {a.modalidade} • {a.region}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">Confianca: {a.trust} • Repeticao oponente: {(a.repeatedOpponentRate * 100).toFixed(0)}%</p>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-foreground">{a.score}</p>
                          <p className="text-xs text-muted-foreground">{a.wins}V-{a.losses}D</p>
                          {a.isPro ? <p className="text-[10px] text-[#FFD700]">PRO</p> : null}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </Card>

              <div className="space-y-4">
                <Card className="border-border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="font-serif text-lg font-bold uppercase tracking-wide text-foreground">Recompensas</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {seasonRewards.map((reward) => (
                      <li key={reward} className="rounded-md border border-border bg-muted/20 px-2 py-1.5">{reward}</li>
                    ))}
                  </ul>
                </Card>

                <Card className="border-border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Flame className="h-4 w-4 text-primary" />
                    <h3 className="font-serif text-lg font-bold uppercase tracking-wide text-foreground">Missoes</h3>
                  </div>
                  <div className="space-y-3">
                    {missions.map((m) => {
                      const p = Math.min(100, Math.round((m.progress / m.target) * 100))
                      const isDone = m.progress >= m.target
                      return (
                        <div key={m.id}>
                          <p className="text-sm text-foreground">{m.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Recompensa: {m.reward} • {m.progress}/{m.target}
                            {isDone ? " • Concluida" : ""}
                          </p>
                          <div className="mt-1 h-2 rounded-full bg-[#2a2f38]">
                            <div className="h-full rounded-full bg-[#ff5b00]" style={{ width: `${p}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>

                <Card className="border-border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <h3 className="font-serif text-lg font-bold uppercase tracking-wide text-foreground">Regras anti-abuso</h3>
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>Penalidade por repeticao excessiva do mesmo oponente.</li>
                    <li>Peso maior para lutas oficiais validadas.</li>
                    <li>Reducao de score por inatividade prolongada.</li>
                    <li>Selos de confianca para atletas com historico limpo.</li>
                  </ul>
                </Card>
              </div>
            </div>

            <Card className="border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="font-serif text-lg font-bold uppercase tracking-wide text-foreground">Feed de movimentacoes</h3>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/20 p-2 text-sm text-muted-foreground">
                  <Trophy className="mr-1 inline h-4 w-4 text-primary" /> Felipe Rocha +34 pts apos evento oficial.
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-2 text-sm text-muted-foreground">
                  <Medal className="mr-1 inline h-4 w-4 text-primary" /> Rafael Lima +25 pts por missao semanal.
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-2 text-sm text-muted-foreground">
                  <Award className="mr-1 inline h-4 w-4 text-primary" /> Bruno Tavares -20 pts por inatividade.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}

