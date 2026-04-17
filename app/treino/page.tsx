"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Flame,
  HeartPulse,
  Pause,
  Play,
  Route,
  Square,
  Timer,
  Trophy,
} from "lucide-react"
import { TopBar } from "@/components/selestialhub/top-bar"
import { Sidebar } from "@/components/selestialhub/sidebar"
import { BottomNav } from "@/components/selestialhub/bottom-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUser } from "@/context/user-context"

const PRIMARY_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"
const API_BASE_CANDIDATES = Array.from(new Set(["http://127.0.0.1:5001", PRIMARY_API_BASE]))
const WEEKLY_TARGET = 5
const DAILY_CARDIO_TARGET_KM = 3

interface TrainingSession {
  id: number
  title: string
  modality: string
  sessionType: string
  status: "Pendente" | "Validado" | "Ajustar" | "Reprovado"
  durationSeconds: number
  distanceKm: number
  roundsCompleted: number
  notes: string
  evidenceUrl: string
  abandoned: boolean
  xpEstimated: number
  xpAwarded: number
  reviewNotes: string
  startedAt?: string
  endedAt?: string
}

interface TrainingSummary {
  weeklySessions: number
  validatedXP30: number
  cardioKm30: number
  streakDays: number
}

type GpsPermissionState = "prompt" | "granted" | "denied" | "unsupported"

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export default function TreinoPage() {
  const router = useRouter()
  const { user, isAuthReady } = useUser()
  const [activeTab, setActiveTab] = useState("treino")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [apiBase, setApiBase] = useState(PRIMARY_API_BASE)

  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [summary, setSummary] = useState<TrainingSummary>({ weeklySessions: 0, validatedXP30: 0, cardioKm30: 0, streakDays: 0 })

  const [roundMinutes, setRoundMinutes] = useState(5)
  const [restSeconds, setRestSeconds] = useState(60)
  const [roundsPlanned, setRoundsPlanned] = useState(5)
  const [currentRound, setCurrentRound] = useState(1)
  const [roundsCompleted, setRoundsCompleted] = useState(0)
  const [timerPhase, setTimerPhase] = useState<"round" | "rest">("round")
  const [timerSeconds, setTimerSeconds] = useState(5 * 60)
  const [timerRunning, setTimerRunning] = useState(false)

  const [cardioMode, setCardioMode] = useState<"corrida" | "caminhada">("corrida")
  const [cardioTracking, setCardioTracking] = useState(false)
  const [cardioDistanceKm, setCardioDistanceKm] = useState(0)
  const [cardioElapsedSeconds, setCardioElapsedSeconds] = useState(0)
  const [cardioSpeedKmh, setCardioSpeedKmh] = useState(0)
  const [cardioStartedAt, setCardioStartedAt] = useState<string | null>(null)
  const [cardioError, setCardioError] = useState("")
  const [gpsPermission, setGpsPermission] = useState<GpsPermissionState>("prompt")
  const [gpsSignal, setGpsSignal] = useState<"bom" | "fraco" | "buscando">("buscando")
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const elapsedTimerRef = useRef<number | null>(null)
  const lastPositionRef = useRef<{ lat: number; lon: number; ts: number } | null>(null)
  const wakeLockRef = useRef<{ release?: () => Promise<void> } | null>(null)

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) router.replace("/login")
  }, [isAuthReady, router, user])

  const requestWakeLock = useCallback(async () => {
    try {
      if (typeof window === "undefined") return
      if (!("wakeLock" in navigator)) return
      const wakeLockApi = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release?: () => Promise<void> }> } }
      wakeLockRef.current = await wakeLockApi.wakeLock?.request("screen") || null
    } catch {
      // mobile browser may reject wake lock without user interaction
    }
  }, [])

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release?.()
    } catch {
      // ignore
    } finally {
      wakeLockRef.current = null
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsPermission("unsupported")
      return
    }

    const permissionsApi = navigator as Navigator & { permissions?: { query: (descriptor: { name: "geolocation" }) => Promise<{ state: PermissionState; onchange: (() => void) | null }> } }
    if (!permissionsApi.permissions?.query) return

    let cancelled = false
    permissionsApi.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        if (cancelled) return
        const state = result.state
        if (state === "granted" || state === "denied" || state === "prompt") {
          setGpsPermission(state)
        }
        result.onchange = () => {
          const nextState = result.state
          if (nextState === "granted" || nextState === "denied" || nextState === "prompt") {
            setGpsPermission(nextState)
          }
        }
      })
      .catch(() => {
        // unsupported in some iOS versions
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      if (!cardioTracking) return
      if (document.visibilityState === "visible") {
        void requestWakeLock()
      }
    }

    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [cardioTracking, requestWakeLock])

  const requestWithFallback = useCallback(async (path: string, init?: RequestInit) => {
    const orderedBases = [apiBase, ...API_BASE_CANDIDATES.filter((base) => base !== apiBase)]

    for (const base of orderedBases) {
      try {
        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), 3000)
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

  const loadSessions = useCallback(async () => {
    if (!user) return
    const res = await requestWithFallback(`/api/user/training-sessions?user_id=${user.id}`)
    if (!res?.ok) return

    try {
      const payload = await res.json()
      setSessions(Array.isArray(payload?.sessions) ? payload.sessions : [])
      setSummary({
        weeklySessions: Number(payload?.summary?.weeklySessions || 0),
        validatedXP30: Number(payload?.summary?.validatedXP30 || 0),
        cardioKm30: Number(payload?.summary?.cardioKm30 || 0),
        streakDays: Number(payload?.summary?.streakDays || 0),
      })
    } catch {
      // keep current state
    }
  }, [requestWithFallback, user])

  useEffect(() => {
    if (!user) return
    loadSessions()
  }, [loadSessions, user])

  useEffect(() => {
    if (!timerRunning) return

    const interval = window.setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev > 1) return prev - 1

        if (timerPhase === "round") {
          setRoundsCompleted((done) => {
            const nextDone = done + 1
            if (nextDone >= roundsPlanned) {
              setTimerRunning(false)
              return nextDone
            }
            return nextDone
          })

          if (roundsCompleted + 1 >= roundsPlanned) {
            return 0
          }
          setTimerPhase("rest")
          return restSeconds
        }

        setCurrentRound((round) => Math.min(roundsPlanned, round + 1))
        setTimerPhase("round")
        return Math.max(10, roundMinutes * 60)
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [roundMinutes, roundsCompleted, roundsPlanned, restSeconds, timerPhase, timerRunning])

  const resetRoundTimer = () => {
    setTimerRunning(false)
    setCurrentRound(1)
    setRoundsCompleted(0)
    setTimerPhase("round")
    setTimerSeconds(Math.max(10, roundMinutes * 60))
  }

  const saveTrainingSession = useCallback(async (payload: {
    title: string
    modality: string
    sessionType: string
    durationSeconds: number
    distanceKm: number
    roundsCompleted: number
    notes: string
    evidenceUrl: string
    abandoned: boolean
    startedAt?: string
    endedAt?: string
  }) => {
    if (!user) return false

    const res = await requestWithFallback("/api/user/training-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, ...payload }),
    })

    if (!res?.ok) return false
    await loadSessions()
    return true
  }, [loadSessions, requestWithFallback, user])

  const startCardioTracking = () => {
    if (cardioTracking) return
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setCardioError("Geolocalizacao nao suportada neste dispositivo.")
      return
    }

    setCardioError("")
    setCardioTracking(true)
    setCardioDistanceKm(0)
    setCardioElapsedSeconds(0)
    setCardioSpeedKmh(0)
    setCardioStartedAt(new Date().toISOString())
    setGpsSignal("buscando")
    setGpsAccuracyMeters(null)
    setCurrentCoords(null)
    lastPositionRef.current = null

    void requestWakeLock()

    elapsedTimerRef.current = window.setInterval(() => {
      setCardioElapsedSeconds((s) => s + 1)
    }, 1000)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const first = { lat: position.coords.latitude, lon: position.coords.longitude, ts: Date.now() }
        lastPositionRef.current = first
        setCurrentCoords({ lat: first.lat, lon: first.lon })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGpsPermission("denied")
        }
        setCardioError(error.message || "Nao foi possivel obter a localizacao inicial")
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed } = position.coords
        const nowTs = Date.now()
        const current = { lat: latitude, lon: longitude, ts: nowTs }

        setCurrentCoords({ lat: latitude, lon: longitude })
        setGpsAccuracyMeters(Number.isFinite(accuracy || NaN) ? Number(accuracy) : null)

        if (Number.isFinite(speed || NaN) && (speed || 0) > 0) {
          setCardioSpeedKmh((speed || 0) * 3.6)
        }

        if (accuracy && accuracy > 65) {
          setGpsSignal("fraco")
          lastPositionRef.current = current
          return
        }

        setGpsSignal("bom")

        const previous = lastPositionRef.current
        if (previous) {
          const delta = haversineKm(previous.lat, previous.lon, current.lat, current.lon)
          const deltaSeconds = Math.max(1, Math.round((current.ts - previous.ts) / 1000))
          const calculatedSpeedKmh = (delta / (deltaSeconds / 3600))
          if (Number.isFinite(calculatedSpeedKmh) && calculatedSpeedKmh > 0) {
            setCardioSpeedKmh((prev) => {
              if (prev <= 0.1) return calculatedSpeedKmh
              return (prev * 0.7) + (calculatedSpeedKmh * 0.3)
            })
          }
          if (delta > 0.003 && delta < 0.5) {
            setCardioDistanceKm((d) => d + delta)
          }
        }

        lastPositionRef.current = current
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGpsPermission("denied")
        }
        setGpsSignal("fraco")
        setCardioError(error.message || "Falha ao acessar GPS")
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    )
  }

  const stopCardioTracking = async (abandoned: boolean) => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (elapsedTimerRef.current !== null) {
      window.clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }

    const endedAt = new Date().toISOString()
    setCardioTracking(false)
    void releaseWakeLock()

    await saveTrainingSession({
      title: cardioMode === "corrida" ? "Cardio - Corrida" : "Cardio - Caminhada",
      modality: "Cardio",
      sessionType: cardioMode,
      durationSeconds: cardioElapsedSeconds,
      distanceKm: cardioDistanceKm,
      roundsCompleted: 0,
      notes: "",
      evidenceUrl: "",
      abandoned,
      startedAt: cardioStartedAt || undefined,
      endedAt,
    })
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (elapsedTimerRef.current !== null) {
        window.clearInterval(elapsedTimerRef.current)
      }
      void releaseWakeLock()
    }
  }, [releaseWakeLock])

  const registerTechnicalSession = async () => {
    const estimatedDuration = Math.max(1, roundsCompleted || roundsPlanned) * Math.max(1, roundMinutes) * 60

    await saveTrainingSession({
      title: "Treino tecnico guiado",
      modality: "Luta",
      sessionType: "tecnico",
      durationSeconds: estimatedDuration,
      distanceKm: 0,
      roundsCompleted,
      notes: "Sessao por rounds registrada no painel de treino.",
      evidenceUrl: "",
      abandoned: false,
      startedAt: new Date(Date.now() - estimatedDuration * 1000).toISOString(),
      endedAt: new Date().toISOString(),
    })

    resetRoundTimer()
  }

  const cardioPace = useMemo(() => {
    if (cardioDistanceKm <= 0) return "--"
    const minPerKm = (cardioElapsedSeconds / 60) / cardioDistanceKm
    const m = Math.floor(minPerKm)
    const s = Math.round((minPerKm - m) * 60)
    return `${m}:${String(s).padStart(2, "0")} /km`
  }, [cardioDistanceKm, cardioElapsedSeconds])

  const recoveryMessage = useMemo(() => {
    const latest = sessions[0]
    if (!latest?.endedAt) return "Sem treino recente. Priorize consistencia hoje."

    const ended = new Date(latest.endedAt).getTime()
    const hoursAgo = (Date.now() - ended) / (1000 * 60 * 60)
    if (latest.durationSeconds >= 3600 && hoursAgo <= 24) {
      return "Ontem foi intenso. Hoje mantenha carga moderada e foco tecnico."
    }
    return "Janela de recuperacao boa. Hoje pode manter ritmo normal."
  }, [sessions])

  const weeklyProgress = Math.min(100, Math.round((summary.weeklySessions / WEEKLY_TARGET) * 100))
  const cardioMissionProgress = Math.min(100, Math.round((cardioDistanceKm / DAILY_CARDIO_TARGET_KM) * 100))

  const gpsPermissionColor =
    gpsPermission === "granted" ? "text-emerald-400" :
    gpsPermission === "denied" ? "text-red-400" : "text-yellow-400"

  const gpsSignalColor =
    gpsSignal === "bom" ? "text-emerald-400" :
    gpsSignal === "fraco" ? "text-yellow-400" : "text-muted-foreground"

  const sessionStatusStyle = (status: string) => {
    if (status === "Validado") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    if (status === "Reprovado") return "bg-red-500/15 text-red-400 border-red-500/30"
    if (status === "Ajustar") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
    return "bg-[#1b2027] text-muted-foreground border-transparent"
  }

  if (!isAuthReady || !user) return null

  return (
    <main className="min-h-screen bg-background pb-24">
      <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isOpen={sidebarOpen} />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="lg:ml-64 p-4 lg:p-6 space-y-5 max-w-[1360px]">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#17181b] via-[#111216] to-[#0f1013] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.4)] lg:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#ff5b00]/8 blur-3xl" />
          <p className="inline-flex rounded-full bg-primary/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/90">
            Missao do dia
          </p>
          <h1 className="mt-3 font-sans text-4xl font-black tracking-tight text-foreground lg:text-5xl">
            Treino inteligente
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Complete a sessao por rounds e finalize um cardio monitorado por GPS para evoluir com dados reais e validacao tecnica.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => setTimerRunning(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff5b00] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#e65200]"
            >
              <Play className="h-4 w-4" /> Iniciar rounds
            </button>
            <button
              onClick={startCardioTracking}
              disabled={cardioTracking}
              className="inline-flex items-center gap-2 rounded-xl bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              <Route className="h-4 w-4" /> Iniciar cardio
            </button>
          </div>
        </section>

        {/* ── Métricas ── */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Meta semanal</p>
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 font-serif text-3xl font-bold text-foreground">{summary.weeklySessions}<span className="text-lg text-muted-foreground">/{WEEKLY_TARGET}</span></p>
            <div className="mt-3 h-1.5 rounded-full bg-[#2a2f38]">
              <div className="h-1.5 rounded-full bg-[#ff5b00] transition-all" style={{ width: `${weeklyProgress}%` }} />
            </div>
          </div>

          <div className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Sequencia</p>
              <Flame className="h-4 w-4 text-orange-400" />
            </div>
            <p className="mt-2 font-serif text-3xl font-bold text-foreground">{summary.streakDays}</p>
            <p className="text-xs text-muted-foreground">dias consecutivos</p>
          </div>

          <div className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cardio 30 dias</p>
              <Route className="h-4 w-4 text-sky-400" />
            </div>
            <p className="mt-2 font-serif text-3xl font-bold text-foreground">{summary.cardioKm30.toLocaleString("pt-BR")} <span className="text-lg text-muted-foreground">km</span></p>
          </div>

          <div className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">XP validado</p>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 font-serif text-3xl font-bold text-foreground">{summary.validatedXP30.toLocaleString("pt-BR")}</p>
          </div>
        </section>

        {/* ── Timer + GPS ── */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">

          {/* Timer de rounds */}
          <div className="rounded-2xl border border-[#232832] bg-[#131820] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <Timer className="h-4 w-4 text-primary" />
              </span>
              <h2 className="font-sans text-base font-bold uppercase tracking-[0.06em] text-foreground">Sessao guiada por rounds</h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Round (min)</Label>
                <Input type="number" min={1} max={10} value={roundMinutes} onChange={(e) => setRoundMinutes(Math.max(1, Number(e.target.value) || 1))} className="mt-1 bg-[#1b2027] border-[#2a3040]" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Descanso (s)</Label>
                <Input type="number" min={10} max={300} value={restSeconds} onChange={(e) => setRestSeconds(Math.max(10, Number(e.target.value) || 10))} className="mt-1 bg-[#1b2027] border-[#2a3040]" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Rounds</Label>
                <Input type="number" min={1} max={12} value={roundsPlanned} onChange={(e) => setRoundsPlanned(Math.max(1, Number(e.target.value) || 1))} className="mt-1 bg-[#1b2027] border-[#2a3040]" />
              </div>
            </div>

            {/* Cronômetro */}
            <div className="mt-4 rounded-2xl border border-[#ff5b00]/25 bg-gradient-to-b from-[#1a0e05] to-[#110d09] p-5 text-center">
              <span className={`inline-flex rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${timerPhase === "round" ? "bg-[#ff5b00]/20 text-[#ff5b00]" : "bg-sky-500/15 text-sky-400"}`}>
                {timerPhase === "round" ? "Round ativo" : "Descanso"} · Round {currentRound}/{roundsPlanned}
              </span>
              <p className="mt-3 font-serif text-6xl font-black tracking-tight text-foreground">
                {formatDuration(timerSeconds)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {roundsCompleted > 0 ? `${roundsCompleted} round${roundsCompleted > 1 ? "s" : ""} concluido${roundsCompleted > 1 ? "s" : ""}` : "Pronto para comecar"}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setTimerRunning((r) => !r)} className="gap-2 bg-[#ff5b00] hover:bg-[#e65200] text-white border-0">
                {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {timerRunning ? "Pausar" : "Iniciar"}
              </Button>
              <Button variant="secondary" onClick={resetRoundTimer} className="gap-2 bg-[#1b2027] hover:bg-[#242b36] border-0">
                <Square className="h-4 w-4" /> Resetar
              </Button>
              <Button variant="outline" onClick={registerTechnicalSession} className="gap-2 border-[#2a3040]">
                <CheckCircle2 className="h-4 w-4" /> Registrar sessao
              </Button>
            </div>
          </div>

          {/* Cardio GPS */}
          <div className="rounded-2xl border border-[#232832] bg-[#131820] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15">
                  <Activity className="h-4 w-4 text-sky-400" />
                </span>
                <h2 className="font-sans text-base font-bold uppercase tracking-[0.06em] text-foreground">Cardio GPS</h2>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setCardioMode("corrida")}
                  disabled={cardioTracking}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${cardioMode === "corrida" ? "bg-[#ff5b00] text-white" : "bg-[#1b2027] text-muted-foreground hover:bg-[#242b36]"} disabled:opacity-50`}
                >
                  Corrida
                </button>
                <button
                  onClick={() => setCardioMode("caminhada")}
                  disabled={cardioTracking}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${cardioMode === "caminhada" ? "bg-[#ff5b00] text-white" : "bg-[#1b2027] text-muted-foreground hover:bg-[#242b36]"} disabled:opacity-50`}
                >
                  Caminhada
                </button>
              </div>
            </div>

            {/* Métricas principais */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Distancia", value: `${cardioDistanceKm.toFixed(2)} km` },
                { label: "Pace", value: cardioPace },
                { label: "Tempo", value: formatDuration(cardioElapsedSeconds) },
                { label: "Velocidade", value: `${cardioSpeedKmh.toFixed(1)} km/h` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-[#2a3040] bg-[#1b2027] p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-1 font-serif text-2xl font-bold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Status GPS */}
            <div className="mt-3 rounded-xl border border-[#2a3040] bg-[#1b2027] p-3">
              <div className="grid grid-cols-3 gap-2 divide-x divide-[#2a3040]">
                <div className="px-2 first:pl-0 last:pr-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Permissao</p>
                  <p className={`mt-0.5 text-sm font-semibold ${gpsPermissionColor}`}>{gpsPermission}</p>
                </div>
                <div className="px-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sinal</p>
                  <p className={`mt-0.5 text-sm font-semibold ${gpsSignalColor}`}>{gpsSignal}</p>
                </div>
                <div className="px-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Precisao</p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{gpsAccuracyMeters ? `${Math.round(gpsAccuracyMeters)} m` : "--"}</p>
                </div>
              </div>
              <div className="mt-2 border-t border-[#2a3040] pt-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Coordenadas</p>
                <p className="mt-0.5 text-xs font-medium text-foreground">
                  {currentCoords ? `${currentCoords.lat.toFixed(6)}, ${currentCoords.lon.toFixed(6)}` : "Aguardando sinal GPS..."}
                </p>
              </div>
            </div>

            {/* Progresso meta diária */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Meta diaria: {DAILY_CARDIO_TARGET_KM} km</p>
                <p className="text-xs font-semibold text-primary">{cardioMissionProgress}%</p>
              </div>
              <div className="h-1.5 rounded-full bg-[#2a2f38]">
                <div className="h-1.5 rounded-full bg-[#ff5b00] transition-all" style={{ width: `${cardioMissionProgress}%` }} />
              </div>
            </div>

            {cardioError ? (
              <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{cardioError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={startCardioTracking} disabled={cardioTracking} className="gap-2 bg-[#ff5b00] hover:bg-[#e65200] text-white border-0">
                <Play className="h-4 w-4" /> Iniciar
              </Button>
              <Button variant="secondary" onClick={() => stopCardioTracking(false)} disabled={!cardioTracking} className="gap-2 bg-[#1b2027] border-0">
                <CheckCircle2 className="h-4 w-4" /> Finalizar
              </Button>
              <Button variant="outline" onClick={() => stopCardioTracking(true)} disabled={!cardioTracking} className="gap-2 border-[#2a3040] text-muted-foreground">
                <AlertTriangle className="h-4 w-4" /> Abandonei
              </Button>
            </div>
          </div>
        </section>

        {/* ── Painel + Sessões ── */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">

          {/* Painel de hoje */}
          <div className="rounded-2xl border border-[#232832] bg-[#131820] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
                <HeartPulse className="h-4 w-4 text-rose-400" />
              </span>
              <h2 className="font-sans text-base font-bold uppercase tracking-[0.06em] text-foreground">Painel de hoje</h2>
            </div>

            <div className="rounded-xl border border-[#2a3040] bg-[#1b2027] px-4 py-3 text-sm text-muted-foreground">
              {recoveryMessage}
            </div>

            <ol className="mt-4 space-y-2">
              {[
                "Sessao tecnica por rounds para hoje.",
                `Cardio com meta de ${DAILY_CARDIO_TARGET_KM} km (corrida ou caminhada).`,
                "Finalize a sessao para entrar no fluxo de validacao tecnica.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff5b00]/15 text-[10px] font-bold text-[#ff5b00]">{i + 1}</span>
                  <p className="text-sm text-muted-foreground">{step}</p>
                </li>
              ))}
            </ol>

            <div className="mt-5 rounded-xl border border-[#FFD700]/20 bg-[#FFD700]/8 px-4 py-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 shrink-0 text-[#FFD700]" />
                <p className="text-xs text-foreground">Treino validado conta para XP e nivel real do atleta.</p>
              </div>
            </div>
          </div>

          {/* Sessões e XP */}
          <div className="rounded-2xl border border-[#232832] bg-[#131820] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <Trophy className="h-4 w-4 text-primary" />
              </span>
              <h2 className="font-sans text-base font-bold uppercase tracking-[0.06em] text-foreground">Validacao e XP</h2>
            </div>

            <div className="space-y-2 max-h-80 overflow-auto pr-1 scrollbar-thin">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Timer className="h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Sem sessoes registradas ainda.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Inicie um treino acima para comecar.</p>
                </div>
              ) : (
                sessions.slice(0, 10).map((session) => (
                  <div key={session.id} className="rounded-xl border border-[#2a3040] bg-[#1b2027] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{session.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDuration(session.durationSeconds)} · {session.distanceKm.toFixed(2)} km · {session.sessionType}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${sessionStatusStyle(session.status)}`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Estimado: <span className="text-foreground font-medium">{session.xpEstimated} XP</span></span>
                      <span>Validado: <span className="text-emerald-400 font-medium">{session.xpAwarded} XP</span></span>
                    </div>
                    {session.reviewNotes ? (
                      <p className="mt-1.5 text-xs text-primary/80 bg-primary/8 rounded px-2 py-1">{session.reviewNotes}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

      </div>
    </main>
  )
}
