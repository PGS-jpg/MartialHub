"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Crown,
  MapPin,
  ShieldAlert,
  Target,
  Trophy,
  User,
  Zap,
} from "lucide-react"
import { TopBar } from "@/components/selestialhub/top-bar"
import { Sidebar } from "@/components/selestialhub/sidebar"
import { BottomNav } from "@/components/selestialhub/bottom-nav"
import { useUser } from "@/context/user-context"

const PRIMARY_API_BASE = typeof window !== "undefined" ? (localStorage.getItem("selestialhub_api_base") ?? "http://127.0.0.1:5001") : "http://127.0.0.1:5001"
const API_BASE_CANDIDATES = Array.from(new Set(["http://127.0.0.1:5001", PRIMARY_API_BASE]))

function deriveLevel(currentXP: number, fallbackLevel?: number) {
  if (typeof fallbackLevel === "number" && Number.isFinite(fallbackLevel) && fallbackLevel > 0) {
    return fallbackLevel
  }

  const safeXP = Math.max(0, Math.floor(currentXP))
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

function DashboardContent() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, isPremium, isAcademyPremium, isCoach, isAuthReady } = useUser()
  const [rankPosition, setRankPosition] = useState<number | null>(null)
  const [xpToNextRank, setXpToNextRank] = useState<number | null>(null)

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) {
      router.replace("/login")
    }
  }, [isAuthReady, router, user])

  useEffect(() => {
    if (!isAuthReady || !user) return

    const fetchRanking = async () => {
      for (const base of API_BASE_CANDIDATES) {
        try {
          const controller = new AbortController()
          const timeoutId = window.setTimeout(() => controller.abort(), 3000)
          const response = await fetch(`${base}/api/ranking/users`, { signal: controller.signal })
          window.clearTimeout(timeoutId)
          if (!response.ok) continue

          const payload = await response.json()
          const users: Array<{ id: number; currentXP?: number }> = Array.isArray(payload?.users) ? payload.users : []

          const scoredUsers = users
            .map((rankedUser) => ({ id: rankedUser.id, score: Math.max(0, Number(rankedUser.currentXP) || 0) }))
            .sort((left, right) => right.score - left.score)

          const myIndex = scoredUsers.findIndex((rankedUser) => rankedUser.id === user.id)
          if (myIndex === -1) return

          setRankPosition(myIndex + 1)

          if (myIndex === 0) {
            setXpToNextRank(0)
            return
          }

          const previousAthlete = scoredUsers[myIndex - 1]
          const myScore = scoredUsers[myIndex].score
          setXpToNextRank(Math.max(1, previousAthlete.score - myScore + 1))
          return
        } catch {
          // tenta o próximo backend
        }
      }
    }

    void fetchRanking()
  }, [isAuthReady, user])

  const safeCurrentXP = Number.isFinite(Number(user?.currentXP)) ? Number(user?.currentXP) : 0
  const safeLevel = deriveLevel(safeCurrentXP, user?.level)
  const safeRanking = rankPosition ?? null
  const cityLabel = user?.cidade?.trim() || "Cidade não informada"
  const bioFilled = Boolean(user?.bio?.trim())

  const quickStats = useMemo(() => {
    return [
      {
        label: "XP total",
        value: safeCurrentXP.toLocaleString("pt-BR"),
        helper: `Nível ${safeLevel}`,
        icon: Zap,
        tone: "bg-[#ff5b00]/10 text-[#ff8a4c]",
      },
      {
        label: "Posição atual",
        value: safeRanking ? `#${safeRanking}` : "--",
        helper:
          xpToNextRank === null
            ? "Ranking em atualização"
            : xpToNextRank === 0
              ? "Você está no topo"
              : `${xpToNextRank.toLocaleString("pt-BR")} XP para subir`,
        icon: Trophy,
        tone: "bg-yellow-500/10 text-yellow-400",
      },
      {
        label: "Plano ativo",
        value: isPremium ? "PRO" : "FREE",
        helper: isAcademyPremium ? "Academia PRO habilitada" : isCoach ? "Conta com acesso técnico" : "Conta atleta padrão",
        icon: Crown,
        tone: isPremium ? "bg-yellow-500/10 text-yellow-400" : "bg-sky-500/10 text-sky-400",
      },
    ]
  }, [isAcademyPremium, isCoach, isPremium, safeCurrentXP, safeLevel, safeRanking, xpToNextRank])

  const actionCards = useMemo(() => {
    const items = [
      {
        href: "/treino",
        title: "Treino",
        description: "Registrar sessão, cardio e progresso diário.",
        icon: Target,
      },
      {
        href: "/eventos",
        title: "Eventos",
        description: "Buscar campeonatos, vagas abertas e cards ao vivo.",
        icon: Calendar,
      },
      {
        href: "/ranking",
        title: "Ranking",
        description: "Ver a classificação atual e quem está acima de você.",
        icon: Trophy,
      },
      {
        href: "/profile",
        title: "Perfil",
        description: "Ajustar bio, academia, cidade e apresentação pública.",
        icon: User,
      },
    ]

    if (isCoach) {
      items.push({
        href: "/tecnicos",
        title: "Técnicos",
        description: "Gerenciar atletas e acompanhamento técnico.",
        icon: ClipboardList,
      })
    }

    if (isAcademyPremium) {
      items.push({
        href: "/academias",
        title: "Academias",
        description: "Publicar, revisar e fortalecer a vitrine da sua equipe.",
        icon: MapPin,
      })
    }

    return items
  }, [isAcademyPremium, isCoach])

  const priorities = useMemo(() => {
    const items = [] as Array<{ title: string; description: string; href: string; icon: typeof ShieldAlert }>

    if (!bioFilled) {
      items.push({
        title: "Completar bio do perfil",
        description: "Seu perfil ainda não explica quem você é e como treina.",
        href: "/profile",
        icon: ShieldAlert,
      })
    }

    if (!user?.cidade?.trim()) {
      items.push({
        title: "Adicionar cidade",
        description: "Isso melhora descoberta em academias, ranking e eventos locais.",
        href: "/profile",
        icon: MapPin as typeof ShieldAlert,
      })
    }

    if (!isPremium) {
      items.push({
        title: "Avaliar upgrade de plano",
        description: "Plano PRO libera mais recursos competitivos e visibilidade.",
        href: "/planos",
        icon: Crown as typeof ShieldAlert,
      })
    }

    if (xpToNextRank !== null && xpToNextRank > 0) {
      items.push({
        title: "Subir no ranking",
        description: `${xpToNextRank.toLocaleString("pt-BR")} XP separam você da próxima posição.`,
        href: "/ranking",
        icon: Trophy as typeof ShieldAlert,
      })
    }

    if (items.length === 0) {
      items.push({
        title: "Conta bem configurada",
        description: "Seu perfil já cobre o essencial. O próximo passo é manter constância de treino.",
        href: "/treino",
        icon: CheckCircle2 as typeof ShieldAlert,
      })
    }

    return items.slice(0, 4)
  }, [bioFilled, isPremium, user?.cidade, xpToNextRank])

  if (!isAuthReady || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isOpen={sidebarOpen} />

      <main className="relative pb-24 lg:ml-64 lg:pb-8">
        <div className="mx-auto w-full max-w-[1360px] space-y-5 px-4 pt-6 lg:px-6">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#17181b] via-[#111216] to-[#0f1013] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.4)] lg:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#ff5b00]/8 blur-3xl" />

            <div className="relative grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
              <div>
                <p className="inline-flex rounded-full bg-primary/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/90">Painel central</p>
                <h1 className="mt-3 font-sans text-3xl font-black tracking-tight text-foreground lg:text-5xl">Menos ruído, mais direção</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground lg:text-base">
                  Veja onde você está, o que está faltando ajustar e quais ações realmente ajudam sua evolução dentro da plataforma.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#1b2027] px-3 py-1 text-xs font-semibold text-foreground">{user.nome}</span>
                  <span className="rounded-full bg-[#1b2027] px-3 py-1 text-xs font-semibold text-foreground">{cityLabel}</span>
                  <span className="rounded-full bg-[#1b2027] px-3 py-1 text-xs font-semibold text-foreground">Nível {safeLevel}</span>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/treino" className="inline-flex items-center gap-2 rounded-xl bg-[#ff5b00] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e65200]">
                    <Target className="h-4 w-4" /> Abrir treino
                  </Link>
                  <Link href="/profile" className="inline-flex items-center gap-2 rounded-xl bg-[#1b2027] px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-[#242b36]">
                    <User className="h-4 w-4" /> Ajustar perfil
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
                    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${stat.tone}`}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 font-serif text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{stat.helper}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.8fr_1fr]">
            <div className="rounded-3xl border border-[#232832] bg-[#131820] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-sans text-xl font-black uppercase tracking-[0.06em] text-foreground">Ações úteis</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Atalhos que levam para áreas com impacto real no seu uso.</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {actionCards.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-2xl border border-[#232832] bg-[#0f1318] p-4 transition hover:border-[#ff5b00]/35 hover:bg-[#161b22]">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5b00]/10 text-[#ff8a4c]">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-bold uppercase tracking-[0.05em] text-foreground">{item.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      Abrir <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-[#232832] bg-[#131820] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
                <h2 className="font-sans text-xl font-black uppercase tracking-[0.06em] text-foreground">Prioridades</h2>
                <div className="mt-4 space-y-3">
                  {priorities.map((item) => (
                    <Link key={item.title} href={item.href} className="block rounded-2xl border border-[#232832] bg-[#0f1318] p-4 transition hover:bg-[#161b22]">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ff5b00]/10 text-[#ff8a4c]">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default function DashboardPage() {
  return <DashboardContent />
}