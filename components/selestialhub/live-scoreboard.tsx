"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Clock,
  Expand,
  Keyboard,
  Minimize2,
  Minus,
  Play,
  SquareTerminal,
  TimerReset,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

interface LiveScoreboardProps {
  matchId: number
  athlete1Name: string
  athlete2Name: string
  athlete1Team?: string
  athlete2Team?: string
  athlete1State?: string
  athlete2State?: string
  modality: string
  onClose?: () => void
  showControls?: boolean
  theme?: {
    accent: string
    accentSoft: string
    accentMuted: string
    accentText: string
    opponent: string
    opponentSoft: string
    highlight: string
  }
}

interface Scoreboard {
  athlete1_score: number
  athlete2_score: number
  athlete1_advantages: number
  athlete2_advantages: number
  athlete1_penalties: number
  athlete2_penalties: number
  current_round: number
  status: string
  disqualified_athlete?: "athlete1" | "athlete2" | "draw" | null
  remaining_seconds?: number | null
  clock_started_at?: number | null
}

interface ModalityRules {
  point_types: string
  point_map?: Record<string, number>
  max_rounds: number
  round_duration_seconds: number
  description: string
}

const DEFAULT_ACTIONS_BY_MODALITY: Record<string, Record<string, number>> = {
  bjj: { takedown: 2, knee_on_belly: 2, guard_pass: 3, mount: 4, back_control: 4 },
  judo: { waza_ari: 1, ippon: 2 },
  muay_thai: { punch: 1, kick: 1, knee: 2, elbow: 1 },
  boxe: { judge_point: 1, knock_down: 1 },
  taekwondo: { punch: 1, kick: 1, kick_head: 2 },
  mma: { strike: 1, takedown: 2, ground_control: 1 },
}

const DEFAULT_THEME = {
  accent: "#FF5500",
  accentSoft: "rgba(255, 85, 0, 0.18)",
  accentMuted: "rgba(255, 85, 0, 0.38)",
  accentText: "#FFF4ED",
  opponent: "#F59E0B",
  opponentSoft: "rgba(245, 158, 11, 0.16)",
  highlight: "#FFD166",
}

export function LiveScoreboard({
  matchId,
  athlete1Name,
  athlete2Name,
  athlete1Team = "Equipe não informada",
  athlete2Team = "Equipe não informada",
  athlete1State = "Estado não informado",
  athlete2State = "Estado não informado",
  modality,
  showControls = true,
  theme = DEFAULT_THEME,
}: LiveScoreboardProps) {
  const [scoreboard, setScoreboard] = useState<Scoreboard>({
    athlete1_score: 0,
    athlete2_score: 0,
    athlete1_advantages: 0,
    athlete2_advantages: 0,
    athlete1_penalties: 0,
    athlete2_penalties: 0,
    current_round: 1,
    status: "not_started",
  })

  const [rules, setRules] = useState<ModalityRules | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isApplyingAction, setIsApplyingAction] = useState(false)
  const [isUpdatingState, setIsUpdatingState] = useState(false)
  const [clockBaseRemaining, setClockBaseRemaining] = useState<number | null>(null)
  const [clockStartedAt, setClockStartedAt] = useState<number | null>(null)
  const [timerEditorOpen, setTimerEditorOpen] = useState(false)
  const [timerDraftMin, setTimerDraftMin] = useState(0)
  const [timerDraftSec, setTimerDraftSec] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [winner, setWinner] = useState<"athlete1" | "athlete2" | "draw" | null>(null)
  const [showWinnerIntro, setShowWinnerIntro] = useState(false)
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false)
  const scoreboardRef = useRef<HTMLDivElement | null>(null)
  const winnerOverlayTimeoutRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<number | null>(null)

  const isBusy = isApplyingAction || isUpdatingState

  const clearWinnerAnnouncement = () => {
    if (winnerOverlayTimeoutRef.current) {
      window.clearTimeout(winnerOverlayTimeoutRef.current)
      winnerOverlayTimeoutRef.current = null
    }
    setShowWinnerIntro(false)
    setShowWinnerOverlay(false)
  }

  const athlete1ActionKeys = ["1", "2", "3", "4", "5", "6", "7", "8"]
  const athlete2ActionKeys = ["Q", "W", "E", "R", "T", "Y", "U", "I"]

  const syncClockFromScoreboard = (next: Scoreboard) => {
    const nowEpoch = Math.floor(Date.now() / 1000)

    if (next.status !== "in_progress") {
      if (typeof next.remaining_seconds === "number") {
        const synced = Math.max(0, next.remaining_seconds)
        setClockBaseRemaining(synced)
        setTimeLeft(synced)
      }
      setClockStartedAt(null)
      return
    }

    if (typeof next.remaining_seconds === "number") {
      const serverRemaining = Math.max(0, next.remaining_seconds)

      // Enquanto a luta está ativa, só resincroniza quando o desvio é relevante
      // para evitar o efeito visual de "pular" segundos por causa do polling.
      const localRemaining = getDerivedTimeLeft(
        "in_progress",
        clockBaseRemaining,
        clockStartedAt
      )

      if (
        clockBaseRemaining === null ||
        clockStartedAt === null ||
        Math.abs(localRemaining - serverRemaining) >= 2
      ) {
        setClockBaseRemaining(serverRemaining)
        setClockStartedAt(nowEpoch)
        setTimeLeft(serverRemaining)
      }
      return
    }

    if (typeof next.clock_started_at === "number") {
      setClockStartedAt(next.clock_started_at)
    }
  }

  const getDerivedTimeLeft = (
    status: string,
    baseRemaining: number | null,
    startedAt: number | null
  ) => {
    const fallback = rules?.round_duration_seconds || 0
    const hasValidBase = typeof baseRemaining === "number" && baseRemaining > 0
    const base = hasValidBase ? baseRemaining : fallback

    if (status === "in_progress" && startedAt) {
      const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - startedAt)
      return Math.max(0, base - elapsed)
    }

    return Math.max(0, base)
  }

  const fetchScoreboard = async () => {
    const scoreResponse = await fetch(`${API_BASE}/api/matches/${matchId}/live`)
    if (scoreResponse.ok) {
      const data = await scoreResponse.json()
      setScoreboard((prev) => ({ ...prev, ...data.scoreboard }))
      syncClockFromScoreboard(data.scoreboard)
    }
  }

  // Buscar dados iniciais
  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchScoreboard()

        // Buscar regras da modalidade
        const rulesResponse = await fetch(`${API_BASE}/api/modality-rules?modality=${modality}`)
        if (rulesResponse.ok) {
          const data = await rulesResponse.json()
          setRules(data)
          setClockBaseRemaining((prev) => {
            if (typeof prev === "number" && prev > 0) return prev
            return data.round_duration_seconds
          })
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [matchId, modality])

  // Polling para manter placar sincronizado em tempo real.
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        await fetchScoreboard()
      } catch {
        // Silencia erros intermitentes de rede durante polling.
      }
    }, 3000)

    return () => clearInterval(poll)
  }, [matchId])

  // Timer da UI em passos estáveis de 1 segundo para evitar pular números.
  useEffect(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }

    if (scoreboard.status !== "in_progress") {
      const derived = getDerivedTimeLeft(
        scoreboard.status,
        clockBaseRemaining,
        clockStartedAt
      )
      setTimeLeft(derived)
      return
    }

    timerIntervalRef.current = window.setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [scoreboard.status, clockBaseRemaining, clockStartedAt, rules?.round_duration_seconds])

  useEffect(() => {
    if (scoreboard.status === "in_progress" && timeLeft <= 0 && !isUpdatingState) {
      setMatchState("finished")
    }
  }, [scoreboard.status, timeLeft, isUpdatingState])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === scoreboardRef.current)
    }
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  useEffect(() => {
    return () => {
      if (winnerOverlayTimeoutRef.current) {
        window.clearTimeout(winnerOverlayTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!showWinnerOverlay) return

    const dismissOverlay = () => {
      setShowWinnerOverlay(false)
      setShowWinnerIntro(false)
      if (document.fullscreenElement === scoreboardRef.current) {
        document.exitFullscreen().catch(() => {
          // Ignora falha ao sair do fullscreen.
        })
      }
    }

    window.addEventListener("mousedown", dismissOverlay, { once: true })
    return () => window.removeEventListener("mousedown", dismissOverlay)
  }, [showWinnerOverlay])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  const getScoreboardLayout = () => {
    switch (modality.toLowerCase()) {
      case "bjj":
        return {
          scoreLabel: "Pontos",
          advantageLabel: "Vantagens",
          showAdvantages: true,
          maxRounds: rules?.max_rounds || 3,
        }
      case "judo":
        return {
          scoreLabel: "Pontos (Waza-ari/Ippon)",
          advantageLabel: "Shidos",
          showAdvantages: true,
          maxRounds: 1,
        }
      case "muay_thai":
        return {
          scoreLabel: "Pontos",
          advantageLabel: "Knockdowns",
          showAdvantages: true,
          maxRounds: 5,
        }
      case "boxe":
        return {
          scoreLabel: "Pontos",
          advantageLabel: "Knockdowns",
          showAdvantages: true,
          maxRounds: 12,
        }
      case "taekwondo":
        return {
          scoreLabel: "Pontos (PSS)",
          advantageLabel: "Penalidades",
          showAdvantages: true,
          maxRounds: 3,
        }
      case "mma":
        return {
          scoreLabel: "Pontos",
          advantageLabel: "Significância",
          showAdvantages: true,
          maxRounds: 5,
        }
      default:
        return {
          scoreLabel: "Pontos",
          advantageLabel: "Vantagens",
          showAdvantages: true,
          maxRounds: 3,
        }
    }
  }

  const parsePointActions = () => {
    if (rules?.point_map && Object.keys(rules.point_map).length > 0) {
      return rules.point_map
    }

    const fallback: Record<string, number> = {}
    const raw = rules?.point_types || ""
    raw.split(",").forEach((entry) => {
      const [name, value] = entry.split(":")
      if (!name || !value) return
      const points = Number(value)
      if (!Number.isNaN(points)) {
        fallback[name.trim()] = points
      }
    })
    if (Object.keys(fallback).length > 0) {
      return fallback
    }

    return DEFAULT_ACTIONS_BY_MODALITY[modality.toLowerCase()] || { point: 1 }
  }

  const actionMap = parsePointActions()
  const actionEntries = Object.entries(actionMap)

  const actionHotkeys = useMemo(() => {
    const map = new Map<string, { athlete: "athlete1" | "athlete2"; action: string }>()

    actionEntries.forEach(([action], idx) => {
      if (idx < athlete1ActionKeys.length) {
        map.set(athlete1ActionKeys[idx], { athlete: "athlete1", action })
      }
      if (idx < athlete2ActionKeys.length) {
        map.set(athlete2ActionKeys[idx], { athlete: "athlete2", action })
      }
    })

    map.set("9", { athlete: "athlete1", action: "advantage" })
    map.set("0", { athlete: "athlete1", action: "penalty" })
    map.set("O", { athlete: "athlete2", action: "advantage" })
    map.set("P", { athlete: "athlete2", action: "penalty" })

    return map
  }, [actionEntries])

  const applyAction = async (athlete: "athlete1" | "athlete2", action: string) => {
    try {
      setIsApplyingAction(true)
      const response = await fetch(`${API_BASE}/api/matches/${matchId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athlete, action }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || "Falha ao aplicar pontuação")
      }

      const payload = await response.json()
      setScoreboard((prev) => ({ ...prev, ...payload.scoreboard }))
      syncClockFromScoreboard(payload.scoreboard)
    } catch (error) {
      console.error("Erro ao aplicar ação:", error)
    } finally {
      setIsApplyingAction(false)
    }
  }

  const saveScoreboard = async (next: Scoreboard) => {
    const response = await fetch(`${API_BASE}/api/matches/${matchId}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error || "Falha ao atualizar placar")
    }

    setScoreboard(next)
    syncClockFromScoreboard(next)
  }

  const adjustScoreboard = async (
    athlete: "athlete1" | "athlete2",
    scoreDelta: number,
    advantageDelta: number,
    penaltyDelta: number
  ) => {
    try {
      setIsApplyingAction(true)

      const next: Scoreboard = { ...scoreboard }

      if (athlete === "athlete1") {
        next.athlete1_score = Math.max(0, next.athlete1_score + scoreDelta)
        next.athlete1_advantages = Math.max(
          0,
          next.athlete1_advantages + advantageDelta
        )
        next.athlete1_penalties = Math.max(0, next.athlete1_penalties + penaltyDelta)
      } else {
        next.athlete2_score = Math.max(0, next.athlete2_score + scoreDelta)
        next.athlete2_advantages = Math.max(
          0,
          next.athlete2_advantages + advantageDelta
        )
        next.athlete2_penalties = Math.max(0, next.athlete2_penalties + penaltyDelta)
      }

      next.disqualified_athlete = getDisqualifiedAthlete(next)
      if (next.disqualified_athlete) {
        next.status = "finished"
        next.clock_started_at = null
      }

      await saveScoreboard(next)
    } catch (error) {
      console.error("Erro ao ajustar placar:", error)
    } finally {
      setIsApplyingAction(false)
    }
  }

  const handleAction = async (
    athlete: "athlete1" | "athlete2",
    action: string,
    direction: "plus" | "minus"
  ) => {
    if (direction === "plus") {
      await applyAction(athlete, action)
      return
    }

    if (action === "advantage") {
      await adjustScoreboard(athlete, 0, -1, 0)
      return
    }

    if (action === "penalty") {
      await adjustScoreboard(athlete, 0, 0, -1)
      return
    }

    const points = actionMap[action] || 0
    if (points <= 0) return
    await adjustScoreboard(athlete, -points, 0, 0)
  }

  const actionGuideAthlete1 = actionEntries.slice(0, athlete1ActionKeys.length).map(([action, points], idx) => ({
    key: athlete1ActionKeys[idx],
    action: formatActionLabel(action),
    points,
  }))

  const actionGuideAthlete2 = actionEntries.slice(0, athlete2ActionKeys.length).map(([action, points], idx) => ({
    key: athlete2ActionKeys[idx],
    action: formatActionLabel(action),
    points,
  }))

  const handleTimerAdjust = async () => {
    const sanitizedMin = Math.max(0, Math.floor(timerDraftMin || 0))
    const sanitizedSec = Math.max(0, Math.min(59, Math.floor(timerDraftSec || 0)))
    const total = sanitizedMin * 60 + sanitizedSec

    try {
      setIsUpdatingState(true)
      const response = await fetch(`${API_BASE}/api/matches/${matchId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athlete1_score: scoreboard.athlete1_score,
          athlete2_score: scoreboard.athlete2_score,
          athlete1_advantages: scoreboard.athlete1_advantages,
          athlete2_advantages: scoreboard.athlete2_advantages,
          athlete1_penalties: scoreboard.athlete1_penalties,
          athlete2_penalties: scoreboard.athlete2_penalties,
          current_round: scoreboard.current_round,
          status: "not_started",
          remaining_seconds: total,
          clock_started_at: null,
        }),
      })

      if (!response.ok) {
        throw new Error("Falha ao ajustar cronômetro")
      }

      const payload = await response.json().catch(() => null)
      if (payload?.scoreboard) {
        setScoreboard((prev) => ({ ...prev, ...payload.scoreboard }))
        syncClockFromScoreboard(payload.scoreboard)
      } else {
        setScoreboard((prev) => ({ ...prev, status: "not_started" }))
        setClockBaseRemaining(total)
        setClockStartedAt(null)
      }

      setTimeLeft(total)
      setTimerEditorOpen(false)
    } catch (error) {
      console.error("Erro ao ajustar cronômetro:", error)
    } finally {
      setIsUpdatingState(false)
    }
  }

  const getDisqualifiedAthlete = (board: Scoreboard = scoreboard) => {
    if (board.athlete1_penalties >= 3 && board.athlete2_penalties >= 3) return "draw"
    if (board.athlete1_penalties >= 3) return "athlete1"
    if (board.athlete2_penalties >= 3) return "athlete2"
    return null
  }

  const getWinnerFromScore = (board: Scoreboard = scoreboard) => {
    const disqualifiedAthlete = getDisqualifiedAthlete(board)
    if (disqualifiedAthlete === "athlete1") return "athlete2"
    if (disqualifiedAthlete === "athlete2") return "athlete1"
    if (disqualifiedAthlete === "draw") return "draw"
    if (board.athlete1_score > board.athlete2_score) return "athlete1"
    if (board.athlete2_score > board.athlete1_score) return "athlete2"
    if (board.athlete1_advantages > board.athlete2_advantages) return "athlete1"
    if (board.athlete2_advantages > board.athlete1_advantages) return "athlete2"
    return "draw"
  }

  const resetScoreboard = async () => {
    const defaultSeconds = rules?.round_duration_seconds || 300
    const next: Scoreboard = {
      athlete1_score: 0,
      athlete2_score: 0,
      athlete1_advantages: 0,
      athlete2_advantages: 0,
      athlete1_penalties: 0,
      athlete2_penalties: 0,
      current_round: 1,
      status: "not_started",
      disqualified_athlete: null,
      remaining_seconds: defaultSeconds,
      clock_started_at: null,
    }

    try {
      setIsUpdatingState(true)
      clearWinnerAnnouncement()
      await saveScoreboard(next)
      setTimeLeft(defaultSeconds)
      setWinner(null)
    } catch (error) {
      console.error("Erro ao reiniciar placar:", error)
    } finally {
      setIsUpdatingState(false)
    }
  }

  const handleFinalizeOrReset = async () => {
    if (scoreboard.status === "finished") {
      await resetScoreboard()
      return
    }

    clearWinnerAnnouncement()
    const resolvedWinner = getWinnerFromScore()

    if (scoreboardRef.current && document.fullscreenElement !== scoreboardRef.current) {
      try {
        await scoreboardRef.current.requestFullscreen()
      } catch (error) {
        console.error("Erro ao abrir tela cheia no anúncio:", error)
      }
    }

    await setMatchState("finished")
    setWinner(resolvedWinner)
    setShowWinnerIntro(true)
    winnerOverlayTimeoutRef.current = window.setTimeout(() => {
      setShowWinnerIntro(false)
      setShowWinnerOverlay(true)
    }, 2000)
  }

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await scoreboardRef.current?.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error("Erro no modo tela cheia:", error)
    }
  }

  const setMatchState = async (status: "in_progress" | "finished" | "not_started") => {
    try {
      setIsUpdatingState(true)
      const nowEpoch = Math.floor(Date.now() / 1000)
      const computedRemaining = getDerivedTimeLeft(
        scoreboard.status,
        clockBaseRemaining,
        clockStartedAt
      )
      const derivedRemaining =
        computedRemaining > 0
          ? computedRemaining
          : (rules?.round_duration_seconds || 0)

      const outgoingClockStartedAt = status === "in_progress" ? nowEpoch : null

      const response = await fetch(`${API_BASE}/api/matches/${matchId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athlete1_score: scoreboard.athlete1_score,
          athlete2_score: scoreboard.athlete2_score,
          athlete1_advantages: scoreboard.athlete1_advantages,
          athlete2_advantages: scoreboard.athlete2_advantages,
          athlete1_penalties: scoreboard.athlete1_penalties,
          athlete2_penalties: scoreboard.athlete2_penalties,
          current_round: scoreboard.current_round,
          status,
          remaining_seconds: derivedRemaining,
          clock_started_at: outgoingClockStartedAt,
        }),
      })

      if (response.ok) {
        const payload = await response.json().catch(() => null)
        if (payload?.scoreboard) {
          setScoreboard((prev) => ({ ...prev, ...payload.scoreboard }))
          syncClockFromScoreboard(payload.scoreboard)
        } else {
          setScoreboard((prev) => ({
            ...prev,
            status,
            remaining_seconds: derivedRemaining,
            clock_started_at: outgoingClockStartedAt,
          }))
          setClockBaseRemaining(derivedRemaining)
          setClockStartedAt(outgoingClockStartedAt)
        }

        if (status !== "finished") {
          setWinner(null)
          clearWinnerAnnouncement()
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar estado da luta:", error)
    } finally {
      setIsUpdatingState(false)
    }
  }

  const layout = getScoreboardLayout()

  function formatActionLabel(action: string) {
    const label = action.replace(/_/g, " ")
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  const getStatusLabel = () => {
    if (scoreboard.status === "in_progress") return "Arbitragem ativa"
    if (scoreboard.status === "finished") return "Combate encerrado"
    return "Aguardando início"
  }

  const getStatusBadgeClass = () => {
    if (scoreboard.status === "in_progress") {
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
    }
    if (scoreboard.status === "finished") {
      return "bg-white/10 text-white/70 border border-white/10"
    }
    return "bg-sky-500/15 text-sky-300 border border-sky-500/25"
  }

  useEffect(() => {
    const disqualifiedAthlete = getDisqualifiedAthlete(scoreboard)
    if (scoreboard.status !== "finished" || !disqualifiedAthlete) return

    const resolvedWinner = getWinnerFromScore(scoreboard)
    if (winner !== resolvedWinner) {
      setWinner(resolvedWinner)
    }

    if (!isFullscreen || showWinnerIntro || showWinnerOverlay) return

    setShowWinnerIntro(true)
    winnerOverlayTimeoutRef.current = window.setTimeout(() => {
      setShowWinnerIntro(false)
      setShowWinnerOverlay(true)
    }, 2000)
  }, [scoreboard, winner, isFullscreen, showWinnerIntro, showWinnerOverlay])

  useEffect(() => {
    if (!showControls) return

    const onKeyDown = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return
      }

      const key = event.key.toUpperCase()

      if (key === "F") {
        event.preventDefault()
        await toggleFullscreen()
        return
      }

      if (event.code === "Space") {
        event.preventDefault()
        if (scoreboard.status === "in_progress") {
          await setMatchState("not_started")
        } else {
          await setMatchState("in_progress")
        }
        return
      }

      const mapped = actionHotkeys.get(key)
      if (!mapped) return

      event.preventDefault()
      await handleAction(mapped.athlete, mapped.action, event.shiftKey ? "minus" : "plus")
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [showControls, actionHotkeys, scoreboard.status, isBusy])

  const renderAthletePanel = (
    athlete: "athlete1" | "athlete2",
    name: string,
    team: string,
    state: string,
    score: number,
    advantages: number,
    penalties: number,
    isPrimary: boolean
  ) => {
    const panelStyle = isPrimary
      ? {
          background: `linear-gradient(180deg, ${theme.accent}, #183684)`,
          borderColor: "rgba(255,255,255,0.25)",
          color: theme.accentText,
        }
      : {
          background: "linear-gradient(180deg, #F8FAFC, #E2E8F0)",
          borderColor: "rgba(30,41,59,0.2)",
          color: "#0F172A",
        }

    const subTextClass = isPrimary ? "text-white/70" : "text-slate-500"
    const scoreText = isPrimary ? "text-white" : "text-slate-900"
    const isWinner =
      (winner === "athlete1" && athlete === "athlete1") ||
      (winner === "athlete2" && athlete === "athlete2")

    return (
      <div
        className={`rounded-2xl border p-3 transition-all duration-500 md:p-4 ${
          isWinner ? "ring-2 ring-emerald-400/70 shadow-[0_0_40px_rgba(52,211,153,0.28)]" : ""
        } ${showWinnerIntro && isWinner ? "scale-[1.015]" : ""} ${isFullscreen ? "flex-1" : ""}`}
        style={panelStyle}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className={`text-xs uppercase tracking-[0.2em] ${subTextClass}`}>
              Competidor
            </p>
            <h3 className="font-serif text-2xl font-bold uppercase leading-tight md:text-4xl">
              {name}
            </h3>
            {isWinner && (
              <p className="mt-1 text-sm font-bold uppercase tracking-[0.16em] text-emerald-300">
                Vencedor
              </p>
            )}
          </div>
          <div className="text-right">
            <p className={`text-xs uppercase tracking-[0.2em] ${subTextClass}`}>
              Pontuação total
            </p>
            <div className={`font-mono text-5xl font-black leading-none md:text-7xl ${scoreText}`}>
              {String(score).padStart(2, "0")}
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <div className="rounded-xl border border-current/30 bg-black/20 p-2">
            <p className="text-[11px] uppercase tracking-[0.14em] opacity-80">Equipe</p>
            <p className="text-sm font-semibold">{team}</p>
          </div>
          <div className="rounded-xl border border-current/30 bg-black/20 p-2">
            <p className="text-[11px] uppercase tracking-[0.14em] opacity-80">Estado</p>
            <p className="text-sm font-semibold">{state}</p>
          </div>
          <div className="rounded-xl border border-current/30 bg-black/20 p-2">
            <p className="text-[11px] uppercase tracking-[0.14em] opacity-80">Vantagens</p>
            <p className="text-2xl font-black">{advantages}</p>
          </div>
          <div className="rounded-xl border border-red-400/35 bg-red-950/35 p-2">
            <p className="text-[11px] uppercase tracking-[0.14em] opacity-80">Punições</p>
            <p className={`text-2xl font-black ${penalties >= 3 ? "text-red-300" : ""}`}>{penalties}/3</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card className="bg-card border-border p-6">
        <div className="text-center text-muted-foreground">Carregando placar...</div>
      </Card>
    )
  }

  const winnerName =
    winner === "athlete1"
      ? athlete1Name
      : winner === "athlete2"
        ? athlete2Name
        : "Empate técnico"

  const winnerTeam =
    winner === "athlete1"
      ? athlete1Team
      : winner === "athlete2"
        ? athlete2Team
        : "Sem definição"

  const winnerState =
    winner === "athlete1"
      ? athlete1State
      : winner === "athlete2"
        ? athlete2State
        : "Sem definição"

  const disqualifiedAthlete = getDisqualifiedAthlete()

  const winnerOverlayTheme =
    winner === "athlete1"
      ? {
          bg: `radial-gradient(circle at center, ${theme.accentSoft}, rgba(0, 0, 0, 0.98) 62%)`,
          halo: `${theme.accent}55`,
          accent: theme.accentText,
          sub: theme.highlight,
        }
      : winner === "athlete2"
        ? {
            bg: `radial-gradient(circle at center, ${theme.opponentSoft}, rgba(0, 0, 0, 0.98) 62%)`,
            halo: `${theme.opponent}55`,
            accent: "#F8FAFC",
            sub: theme.opponent,
          }
        : {
            bg: "radial-gradient(circle at center, rgba(255,255,255,0.10), rgba(0, 0, 0, 0.98) 62%)",
            halo: "rgba(255,255,255,0.20)",
            accent: "#FFFFFF",
            sub: "#D1D5DB",
          }

  return (
    <>
      <Card
        ref={scoreboardRef}
        className={`overflow-hidden bg-[linear-gradient(180deg,#050505,#111111)] ${
          isFullscreen
            ? "h-screen w-screen rounded-none border-0 shadow-none"
            : "border-border/80 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        }`}
      >
        <div className="border-b border-border/60 px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getStatusBadgeClass()}>{getStatusLabel()}</Badge>
            <Badge className="border border-white/10 bg-white/5 text-foreground/80">
              {modality.toUpperCase()}
            </Badge>
            <Badge className="border border-white/10 bg-white/5 text-foreground/80">
              Round {scoreboard.current_round}/{layout.maxRounds}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {showControls && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-white/15 bg-white/5 px-2"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                {isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              </Button>
            )}
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Placar de arbitragem
            </p>
          </div>
        </div>
      </div>

        <div
          className={`grid gap-3 ${
            isFullscreen
              ? "min-h-[calc(100vh-73px)] grid-rows-[1fr] p-4 xl:grid-cols-[minmax(0,1fr)_260px]"
              : "p-3 xl:grid-cols-[minmax(0,1fr)_230px]"
          }`}
        >
          <div className={`space-y-3 ${isFullscreen ? "flex min-h-0 flex-col" : ""}`}>
            {renderAthletePanel(
              "athlete1",
              athlete1Name,
              athlete1Team,
              athlete1State,
              scoreboard.athlete1_score,
              scoreboard.athlete1_advantages,
              scoreboard.athlete1_penalties,
              true
            )}

            {renderAthletePanel(
              "athlete2",
              athlete2Name,
              athlete2Team,
              athlete2State,
              scoreboard.athlete2_score,
              scoreboard.athlete2_advantages,
              scoreboard.athlete2_penalties,
              false
            )}
          </div>

          <div className={`space-y-3 ${isFullscreen ? "flex min-h-0 flex-col" : "xl:sticky xl:top-4 xl:self-start"}`}>
          <div className="rounded-2xl border border-emerald-500/30 bg-black p-4 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Tempo restante</p>
            <div className="mt-2 font-mono text-5xl font-black text-emerald-400 md:text-6xl">
              {formatTime(timeLeft)}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-emerald-300" />
              <span className="text-xs uppercase tracking-[0.16em] text-emerald-300/80">
                cronômetro oficial
              </span>
            </div>

            {showControls && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 h-8 w-full border-emerald-500/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                onClick={() => {
                  const mins = Math.floor(timeLeft / 60)
                  const secs = timeLeft % 60
                  setTimerDraftMin(mins)
                  setTimerDraftSec(secs)
                  setTimerEditorOpen((prev) => !prev)
                }}
                disabled={isBusy}
              >
                <TimerReset className="h-4 w-4" />
                Ajustar cronômetro
              </Button>
            )}

            {timerEditorOpen && showControls && (
              <div className="mt-3 rounded-xl border border-emerald-500/30 bg-black/65 p-3 text-left">
                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-emerald-300/90">
                  Ajuste pré-luta
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-emerald-300/80">
                    Minutos
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded-md border border-emerald-500/30 bg-black/70 px-2 py-1 text-sm text-emerald-200"
                      value={timerDraftMin}
                      onChange={(event) => setTimerDraftMin(Number(event.target.value))}
                    />
                  </label>
                  <label className="text-xs text-emerald-300/80">
                    Segundos
                    <input
                      type="number"
                      min={0}
                      max={59}
                      className="mt-1 w-full rounded-md border border-emerald-500/30 bg-black/70 px-2 py-1 text-sm text-emerald-200"
                      value={timerDraftSec}
                      onChange={(event) => setTimerDraftSec(Number(event.target.value))}
                    />
                  </label>
                </div>
                <Button
                  size="sm"
                  className="mt-2 h-8 w-full bg-emerald-600 hover:bg-emerald-500"
                  onClick={handleTimerAdjust}
                  disabled={isBusy}
                >
                  Aplicar tempo
                </Button>
              </div>
            )}
          </div>

          {showControls && (
            <div className="rounded-2xl border border-border/70 bg-black/60 p-3">
              <p className="mb-2 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Controle da luta
              </p>
              <div className="grid gap-2">
                <Button
                  size="sm"
                  className="justify-center bg-emerald-600 hover:bg-emerald-500"
                  onClick={() => setMatchState("in_progress")}
                  disabled={isBusy}
                >
                  <Play className="h-4 w-4" />
                  Iniciar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="justify-center border-white/15 bg-white/5"
                  onClick={() => setMatchState("not_started")}
                  disabled={isBusy}
                >
                  <Minus className="h-4 w-4" />
                  Pausar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="justify-center border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                  onClick={handleFinalizeOrReset}
                  disabled={isBusy}
                >
                  <SquareTerminal className="h-4 w-4" />
                  {scoreboard.status === "finished" ? "Reiniciar placar" : "Finalizar e anunciar"}
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border/70 bg-black/60 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Atalhos de teclado
            </p>
            <div className="mt-2 space-y-3 text-xs text-foreground/80">
              <div>
                <p className="mb-1 font-semibold uppercase tracking-[0.16em] text-foreground/90">Atleta 1</p>
                <div className="space-y-1">
                  {actionGuideAthlete1.map((item) => (
                    <p key={`guide-a1-${item.key}-${item.action}`}>
                      <Keyboard className="mr-1 inline h-3.5 w-3.5" />
                      {item.key}: {item.action} (+{item.points})
                    </p>
                  ))}
                  <p><Keyboard className="mr-1 inline h-3.5 w-3.5" />9: Vantagem</p>
                  <p><Keyboard className="mr-1 inline h-3.5 w-3.5" />0: Punição</p>
                </div>
              </div>

              <div>
                <p className="mb-1 font-semibold uppercase tracking-[0.16em] text-foreground/90">Atleta 2</p>
                <div className="space-y-1">
                  {actionGuideAthlete2.map((item) => (
                    <p key={`guide-a2-${item.key}-${item.action}`}>
                      <Keyboard className="mr-1 inline h-3.5 w-3.5" />
                      {item.key}: {item.action} (+{item.points})
                    </p>
                  ))}
                  <p><Keyboard className="mr-1 inline h-3.5 w-3.5" />O: Vantagem</p>
                  <p><Keyboard className="mr-1 inline h-3.5 w-3.5" />P: Punição</p>
                </div>
              </div>

              <div className="space-y-1 border-t border-white/10 pt-2">
                <p>Shift + tecla: desfaz a mesma ação</p>
                <p>Espaço: iniciar/pausar luta</p>
                <p>F: entrar/sair de tela cheia</p>
                <p>3 punições: desclassificação automática</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Regras da modalidade
            </p>
            <p className="mt-2 text-xs text-foreground/80">{rules?.description}</p>
          </div>
          </div>
        </div>

        {scoreboard.status === "finished" && (
          <div className="border-t border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center">
            <Zap className="mr-2 inline h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-300">
              {disqualifiedAthlete === "athlete1"
                ? `${athlete1Name} desclassificado. Vencedor: ${athlete2Name}`
                : disqualifiedAthlete === "athlete2"
                  ? `${athlete2Name} desclassificado. Vencedor: ${athlete1Name}`
                  : winner === "athlete1"
                    ? `Vencedor: ${athlete1Name}`
                    : winner === "athlete2"
                      ? `Vencedor: ${athlete2Name}`
                      : "Empate técnico. Pressione novamente para reiniciar o placar."}
            </span>
          </div>
        )}
      </Card>

      {showWinnerIntro && winner && isFullscreen && (
        <div
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden"
          style={{ background: winnerOverlayTheme.bg }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)] animate-pulse" />
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at center, ${winnerOverlayTheme.halo}, transparent 55%)` }}
          />
          <div
            className="relative rounded-[40px] border px-12 py-10 text-center shadow-[0_0_120px_rgba(0,0,0,0.35)] animate-pulse"
            style={{
              borderColor: winnerOverlayTheme.halo,
              background: `radial-gradient(circle at top, ${winnerOverlayTheme.halo}, rgba(0,0,0,0.96) 60%)`,
            }}
          >
            <p className="text-sm uppercase tracking-[0.45em] md:text-base" style={{ color: winnerOverlayTheme.sub }}>
              vencedor anunciado
            </p>
            <h2 className="mt-4 font-serif text-6xl font-black uppercase tracking-[0.12em] md:text-8xl" style={{ color: winnerOverlayTheme.accent }}>
              {winnerName}
            </h2>
            <p className="mt-4 text-lg uppercase tracking-[0.35em] text-white/70">
              preparando telão oficial
            </p>
          </div>
        </div>
      )}

      {showWinnerOverlay && winner && isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-hidden text-center"
          style={{ background: winnerOverlayTheme.bg }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_18%,transparent_82%,rgba(255,255,255,0.05))]" />
          <div
            className="absolute -left-1/4 top-1/2 h-[60vw] w-[60vw] -translate-y-1/2 rounded-full blur-3xl"
            style={{ backgroundColor: winnerOverlayTheme.halo }}
          />
          <div
            className="absolute -right-1/4 top-1/2 h-[60vw] w-[60vw] -translate-y-1/2 rounded-full blur-3xl"
            style={{ backgroundColor: winnerOverlayTheme.halo }}
          />
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:120px_120px]" />
          <div className="relative flex h-full w-full flex-col items-center justify-center px-8 py-16">
            <p className="text-base uppercase tracking-[0.9em] md:text-xl" style={{ color: winnerOverlayTheme.sub }}>
              vencedor oficial
            </p>
            <h2
              className="mt-8 font-serif text-7xl font-black uppercase leading-none tracking-[0.06em] drop-shadow-[0_0_28px_rgba(255,255,255,0.24)] md:text-9xl lg:text-[13rem] xl:text-[16rem]"
              style={{ color: winnerOverlayTheme.accent }}
            >
              {winnerName}
            </h2>
            <p className="mt-8 text-2xl font-semibold uppercase tracking-[0.24em] md:text-4xl" style={{ color: winnerOverlayTheme.sub }}>
              {winnerTeam}
            </p>
            <p className="mt-3 text-xl uppercase tracking-[0.5em] text-white/70 md:text-3xl">
              {winnerState}
            </p>
            <div className="mt-10 h-px w-40 bg-gradient-to-r from-transparent via-white/50 to-transparent md:w-72" />
            <p className="mt-10 text-sm uppercase tracking-[0.42em] text-white/55 md:text-lg">
              clique em qualquer lugar para fechar
            </p>
          </div>
        </div>
      )}
    </>
  )
}
