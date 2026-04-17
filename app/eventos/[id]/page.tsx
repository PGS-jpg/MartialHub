"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Palette,
  Radio,
  Shield,
  Swords,
  Trophy,
  Users,
} from "lucide-react"

import { BottomNav } from "@/components/selestialhub/bottom-nav"
import { LiveScoreboard } from "@/components/selestialhub/live-scoreboard"
import { Sidebar } from "@/components/selestialhub/sidebar"
import { TopBar } from "@/components/selestialhub/top-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUser } from "@/context/user-context"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

interface Tournament {
  id: number
  name: string
  modality: string
  city: string
  date: string
  time: string
  status: string
  level: string
  prize_pool: number
  max_participants: number
  description: string
}

interface Match {
  id: number
  athlete1_name: string
  athlete2_name: string
  modality: string
  round: number
  round_order: number
  status: string
  winner_id: number | null
}

type ThemePresetId = "orange" | "gold" | "crimson" | "ice"

interface ThemePreset {
  accent: string
  accentSoft: string
  accentMuted: string
  accentText: string
  opponent: string
  opponentSoft: string
  highlight: string
}

const THEME_PRESETS: Record<ThemePresetId, ThemePreset> = {
  orange: {
    accent: "#FF5500",
    accentSoft: "rgba(255, 85, 0, 0.18)",
    accentMuted: "rgba(255, 85, 0, 0.38)",
    accentText: "#FFF4ED",
    opponent: "#F59E0B",
    opponentSoft: "rgba(245, 158, 11, 0.16)",
    highlight: "#FFD166",
  },
  gold: {
    accent: "#EAB308",
    accentSoft: "rgba(234, 179, 8, 0.18)",
    accentMuted: "rgba(234, 179, 8, 0.34)",
    accentText: "#FFFBEA",
    opponent: "#F97316",
    opponentSoft: "rgba(249, 115, 22, 0.16)",
    highlight: "#FDE68A",
  },
  crimson: {
    accent: "#EF4444",
    accentSoft: "rgba(239, 68, 68, 0.18)",
    accentMuted: "rgba(239, 68, 68, 0.34)",
    accentText: "#FFF1F2",
    opponent: "#FB7185",
    opponentSoft: "rgba(251, 113, 133, 0.16)",
    highlight: "#FCA5A5",
  },
  ice: {
    accent: "#22C55E",
    accentSoft: "rgba(34, 197, 94, 0.16)",
    accentMuted: "rgba(34, 197, 94, 0.32)",
    accentText: "#F0FDF4",
    opponent: "#06B6D4",
    opponentSoft: "rgba(6, 182, 212, 0.16)",
    highlight: "#67E8F9",
  },
}

const THEME_LABELS: Record<ThemePresetId, string> = {
  orange: "Laranja oficial",
  gold: "Dourado premium",
  crimson: "Vermelho arena",
  ice: "Verde e ciano",
}

const STATUS_LABELS: Record<string, string> = {
  live: "Operação ao vivo",
  upcoming: "Próxima chamada",
  finished: "Encerrado",
}

export default function TournamentDetailPage({
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const routeParams = useParams<{ id: string }>()
  const { user, isAuthReady } = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("eventos")
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [themePreset, setThemePreset] = useState<ThemePresetId>("orange")

  const tournamentId = Number(routeParams?.id)
  const activeTheme = THEME_PRESETS[themePreset]
  const pageThemeStyle = {
    "--panel-accent": activeTheme.accent,
    "--panel-accent-soft": activeTheme.accentSoft,
    "--panel-accent-muted": activeTheme.accentMuted,
    "--panel-opponent": activeTheme.opponent,
    "--panel-opponent-soft": activeTheme.opponentSoft,
    "--panel-highlight": activeTheme.highlight,
    "--panel-accent-text": activeTheme.accentText,
  } as CSSProperties

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) {
      router.push("/login")
      return
    }

    if (!Number.isFinite(tournamentId)) {
      setError("ID de campeonato inválido")
      setIsLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        const tourResponse = await fetch(`${API_BASE}/api/tournaments`)
        if (tourResponse.ok) {
          const data = await tourResponse.json()
          const found = data.tournaments.find(
            (item: Tournament) => item.id === tournamentId
          )
          setTournament(found || null)
        }

        const matchesResponse = await fetch(
          `${API_BASE}/api/tournaments/${tournamentId}/matches`
        )
        if (matchesResponse.ok) {
          const data = await matchesResponse.json()
          const nextMatches = data.matches || []
          setMatches(nextMatches)
          setSelectedMatch((current) => {
            if (!nextMatches.length) return null
            if (current) {
              const stillExists = nextMatches.find(
                (match: Match) => match.id === current.id
              )
              if (stillExists) return stillExists
            }
            return nextMatches[0]
          })
        }
      } catch (fetchError) {
        setError("Erro ao carregar dados do campeonato")
        console.error(fetchError)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [isAuthReady, router, tournamentId, user])

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-background" style={pageThemeStyle}>
      <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
      />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="pb-20 lg:ml-64 lg:pb-6">
        <div className="p-4 lg:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 rounded-[26px] border border-border/80 bg-[radial-gradient(circle_at_top_left,var(--panel-accent-soft),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)] lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-[color:var(--panel-accent-muted)] bg-background/60"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--panel-highlight)]">
                    Sala de arbitragem
                  </p>
                  <h1 className="font-serif text-2xl font-bold uppercase tracking-[0.18em] text-foreground lg:text-3xl">
                    Painel de eventos
                  </h1>
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-background/70 px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  <Palette className="h-3.5 w-3.5" />
                  Cor do painel
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={themePreset}
                    onValueChange={(value) => setThemePreset(value as ThemePresetId)}
                  >
                    <SelectTrigger className="min-w-44 border-[color:var(--panel-accent-muted)] bg-background/70">
                      <SelectValue placeholder="Escolha a cor" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(THEME_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    {Object.entries(THEME_PRESETS).map(([value, preset]) => (
                      <button
                        key={value}
                        type="button"
                        aria-label={THEME_LABELS[value as ThemePresetId]}
                        className={`h-8 w-8 rounded-full border transition-transform hover:scale-105 ${
                          themePreset === value
                            ? "border-white/70 ring-2 ring-white/20"
                            : "border-white/10"
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${preset.accent}, ${preset.opponent})`,
                        }}
                        onClick={() => setThemePreset(value as ThemePresetId)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                Carregando campeonato...
              </div>
            ) : error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                {error}
              </div>
            ) : tournament ? (
              <>
                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.8fr)]">
                  <Card className="overflow-hidden border-border/80 bg-[radial-gradient(circle_at_top_left,var(--panel-accent-soft),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]">
                    <div className="border-b border-border/70 px-6 py-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge className="border border-[color:var(--panel-accent-muted)] bg-[color:var(--panel-accent-soft)] text-[color:var(--panel-highlight)]">
                              <Shield className="mr-1 h-3.5 w-3.5" />
                              central de arbitragem
                            </Badge>
                            <Badge className="bg-white/5 text-foreground/80">
                              {STATUS_LABELS[tournament.status] || tournament.status}
                            </Badge>
                          </div>
                          <div>
                            <h2 className="font-serif text-3xl font-bold uppercase tracking-[0.16em] text-foreground lg:text-4xl">
                              {tournament.name}
                            </h2>
                            <p className="mt-2 max-w-3xl text-sm text-muted-foreground lg:text-base">
                              Ambiente orientado para árbitro central, mesa e controle de rounds. As ações de pontuação são somadas em tempo real e refletidas diretamente no placar oficial.
                            </p>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-[color:var(--panel-accent-muted)] bg-black/30 p-4 text-right">
                          <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                            Cor ativa
                          </div>
                          <div className="mt-2 text-lg font-semibold text-[color:var(--panel-highlight)]">
                            {THEME_LABELS[themePreset]}
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            <span
                              className="h-3 w-10 rounded-full"
                              style={{ backgroundColor: activeTheme.accent }}
                            />
                            <span
                              className="h-3 w-10 rounded-full"
                              style={{ backgroundColor: activeTheme.opponent }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-3xl border border-border/70 bg-background/50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Data e hora
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                          {tournament.date}
                        </p>
                        <p className="text-sm text-muted-foreground">às {tournament.time}</p>
                      </div>

                      <div className="rounded-3xl border border-border/70 bg-background/50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          Praça esportiva
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                          {tournament.city}
                        </p>
                        <p className="text-sm text-muted-foreground">estrutura preparada para mesa</p>
                      </div>

                      <div className="rounded-3xl border border-border/70 bg-background/50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                          <Trophy className="h-4 w-4" />
                          Premiação
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                          R$ {tournament.prize_pool.toLocaleString("pt-BR")}
                        </p>
                        <p className="text-sm text-muted-foreground">{tournament.level}</p>
                      </div>

                      <div className="rounded-3xl border border-border/70 bg-background/50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                          <Users className="h-4 w-4" />
                          Atletas previstos
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                          {tournament.max_participants}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          modalidade {tournament.modality.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {tournament.description && (
                      <div className="border-t border-border/70 px-6 py-5">
                        <p className="text-sm text-muted-foreground">
                          {tournament.description}
                        </p>
                      </div>
                    )}
                  </Card>

                  <Card className="border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                          Mesa lateral
                        </p>
                        <h3 className="mt-1 font-serif text-xl font-bold uppercase tracking-[0.16em] text-foreground">
                          Fila de combates
                        </h3>
                      </div>
                      <div className="rounded-2xl border border-[color:var(--panel-accent-muted)] bg-[color:var(--panel-accent-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--panel-highlight)]">
                        {matches.length} luta{matches.length === 1 ? "" : "s"}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {matches.length > 0 ? (
                        matches.map((match) => {
                          const isSelected = selectedMatch?.id === match.id

                          return (
                            <button
                              key={match.id}
                              type="button"
                              className={`w-full rounded-3xl border p-4 text-left transition ${
                                isSelected
                                  ? "border-[color:var(--panel-accent-muted)] bg-[color:var(--panel-accent-soft)]"
                                  : "border-border/80 bg-background/50 hover:border-[color:var(--panel-accent-muted)] hover:bg-white/5"
                              }`}
                              onClick={() => setSelectedMatch(match)}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                    Round {match.round} • combate {match.round_order}
                                  </p>
                                  <p className="mt-2 font-semibold text-foreground">
                                    {match.athlete1_name}
                                  </p>
                                  <p className="my-1 text-xs uppercase tracking-[0.28em] text-muted-foreground">
                                    versus
                                  </p>
                                  <p className="font-semibold text-foreground">
                                    {match.athlete2_name}
                                  </p>
                                </div>
                                <Badge
                                  className={
                                    match.status === "in_progress"
                                      ? "bg-emerald-500/15 text-emerald-300"
                                      : match.status === "finished"
                                        ? "bg-white/10 text-white/70"
                                        : "bg-[color:var(--panel-opponent-soft)] text-[color:var(--panel-highlight)]"
                                  }
                                >
                                  {match.status === "in_progress"
                                    ? "ao vivo"
                                    : match.status === "finished"
                                      ? "encerrada"
                                      : "na fila"}
                                </Badge>
                              </div>
                            </button>
                          )
                        })
                      ) : (
                        <div className="rounded-3xl border border-dashed border-border/80 bg-background/40 px-4 py-10 text-center text-sm text-muted-foreground">
                          Nenhuma luta cadastrada para este campeonato.
                        </div>
                      )}
                    </div>

                    <div className="mt-5 grid gap-3 rounded-3xl border border-border/70 bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        <Radio className="h-4 w-4 text-[color:var(--panel-highlight)]" />
                        Fluxo sugerido da mesa
                      </div>
                      <div className="grid gap-2 text-sm text-foreground/85">
                        <div className="rounded-2xl border border-white/6 bg-white/4 px-3 py-2">1. Selecionar a luta na fila.</div>
                        <div className="rounded-2xl border border-white/6 bg-white/4 px-3 py-2">2. Iniciar a luta e registrar ações por atleta.</div>
                        <div className="rounded-2xl border border-white/6 bg-white/4 px-3 py-2">3. Finalizar para congelar o placar e chamar a próxima.</div>
                      </div>
                    </div>
                  </Card>
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.8fr)]">
                  <div>
                    {selectedMatch ? (
                      <LiveScoreboard
                        matchId={selectedMatch.id}
                        athlete1Name={selectedMatch.athlete1_name}
                        athlete2Name={selectedMatch.athlete2_name}
                        modality={tournament.modality}
                        showControls
                        theme={activeTheme}
                      />
                    ) : (
                      <Card className="border-border/80 bg-card p-10">
                        <p className="text-center text-muted-foreground">
                          Selecione um combate para abrir a mesa de arbitragem.
                        </p>
                      </Card>
                    )}
                  </div>

                  <Card className="border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] p-5">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">
                      <Swords className="h-4 w-4 text-[color:var(--panel-highlight)]" />
                      Operação da arena
                    </div>
                    <h3 className="mt-3 font-serif text-xl font-bold uppercase tracking-[0.16em] text-foreground">
                      Controle de pontuação
                    </h3>
                    <p className="mt-3 text-sm text-muted-foreground">
                      O painel abaixo foi redesenhado para uso de arbitragem: leitura rápida, contraste alto e botões de ação organizados por atleta.
                    </p>

                    <div className="mt-5 space-y-3">
                      <div className="rounded-3xl border border-[color:var(--panel-accent-muted)] bg-[color:var(--panel-accent-soft)] p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--panel-highlight)]">
                          Lado 1
                        </p>
                        <p className="mt-2 text-sm text-[color:var(--panel-accent-text)]">
                          Usa a cor principal da mesa e concentra as marcações do atleta em destaque.
                        </p>
                      </div>
                      <div className="rounded-3xl border border-white/8 bg-[color:var(--panel-opponent-soft)] p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--panel-highlight)]">
                          Lado 2
                        </p>
                        <p className="mt-2 text-sm text-foreground/85">
                          Mantém contraste forte para leitura imediata do placar adversário.
                        </p>
                      </div>
                      <div className="rounded-3xl border border-border/80 bg-background/50 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                          Troca visual
                        </p>
                        <p className="mt-2 text-sm text-foreground/85">
                          Você pode alternar a paleta acima sem alterar a lógica de pontuação nem a identidade base do SelestialHub.
                        </p>
                      </div>
                    </div>
                  </Card>
                </section>
              </>
            ) : (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                Campeonato não encontrado
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
