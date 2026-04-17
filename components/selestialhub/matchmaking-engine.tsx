"use client"

import { useState, useEffect, useMemo } from "react"
import { Crown, CheckCircle, Swords, MapPin, Scale, Filter, X, Zap, Lock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useUser } from "@/context/user-context"
import { useRouter } from "next/navigation"

const weightClasses = [
  { id: "mosca", label: "Mosca", weight: "56kg" },
  { id: "pena", label: "Pena", weight: "66kg" },
  { id: "leve", label: "Leve", weight: "70kg" },
  { id: "medio", label: "Medio", weight: "84kg" },
  { id: "meio-pesado", label: "Meio-Pesado", weight: "93kg" },
  { id: "pesado", label: "Pesado", weight: "120kg" },
]

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

type Fighter = {
  id: number
  name: string
  academy: string
  city: string
  level: number
  record: { wins: number; losses: number }
  weightClass: string
  isPremium: boolean
  isVerified: boolean
  xp: number
}

const FREE_FIGHTERS_PER_DAY = 3
const STORAGE_KEY = "selestialhub_fighters_day"

interface MatchmakingEngineProps {
  onUpgradeClick: () => void
}

export function MatchmakingEngine({ onUpgradeClick }: MatchmakingEngineProps) {
  const router = useRouter()
  const [selectedWeight, setSelectedWeight] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [challengeModal, setChallengeModal] = useState<Fighter | null>(null)
  const [challengeSent, setChallengeSent] = useState(false)
  const [xpGained, setXpGained] = useState(0)
  const [fighters, setFighters] = useState<Fighter[]>([])
  const [fightersLoading, setFightersLoading] = useState(true)
  const [usedChallengesToday, setUsedChallengesToday] = useState(0)

  const { user, isPremium } = useUser()

  const todayKey = useMemo(() => {
    const day = new Date().toISOString().slice(0, 10)
    return `${STORAGE_KEY}_${user?.id ?? "guest"}_${day}`
  }, [user?.id])

  const remainingChallenges = isPremium
    ? FREE_FIGHTERS_PER_DAY
    : Math.max(0, FREE_FIGHTERS_PER_DAY - usedChallengesToday)

  const canChallenge = Boolean(user) && (isPremium || remainingChallenges > 0)

  const challengeXpGain = useMemo(() => {
    if (!user?.nome) return 20
    return Math.max(10, Math.min(40, user.nome.length * 2))
  }, [user?.nome])

  useEffect(() => {
    if (typeof window === "undefined" || isPremium || !user) {
      setUsedChallengesToday(0)
      return
    }

    const stored = window.localStorage.getItem(todayKey)
    const parsed = Number(stored)
    setUsedChallengesToday(Number.isFinite(parsed) ? parsed : 0)
  }, [todayKey, user, isPremium])

  const useChallenge = () => {
    if (!user) return false
    if (isPremium) return true
    if (remainingChallenges <= 0) return false

    const nextUsed = usedChallengesToday + 1
    setUsedChallengesToday(nextUsed)
    window.localStorage.setItem(todayKey, String(nextUsed))
    return true
  }

  useEffect(() => {
    if (!user) {
      setFighters([])
      setFightersLoading(false)
      return
    }

    setFightersLoading(true)
    const userId = user.id
    fetch(`${API_BASE}/api/fighters?user_id=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.fighters) {
          const mapped: Fighter[] = data.fighters.map(
            (f: {
              id: number
              nome: string
              peso: string
              xp: number
              vitorias: number
              derrotas: number
              is_premium: boolean
              modalidade?: string
              academia_nome?: string
              cidade?: string
            }) => ({
              id: f.id,
              name: f.nome,
              academy: f.academia_nome || f.modalidade || "—",
              city: f.cidade || "—",
              level: Math.max(1, Math.floor(f.xp / 200)),
              record: { wins: f.vitorias, losses: f.derrotas },
              weightClass: f.peso,
              isPremium: f.is_premium,
              isVerified: f.is_premium,
              xp: f.xp,
            })
          )
          setFighters(mapped)
        }
      })
      .catch(() => setFighters([]))
      .finally(() => setFightersLoading(false))
  }, [user?.id])

  const filteredFighters = useMemo(() => {
    const list = selectedWeight
      ? fighters.filter((f) => f.weightClass === selectedWeight)
      : fighters
    return [...list].sort((a, b) => {
      if (a.isPremium && !b.isPremium) return -1
      if (!a.isPremium && b.isPremium) return 1
      return b.xp - a.xp
    })
  }, [fighters, selectedWeight])

  // Backend already limits non-premium to 3 and hides contact; list is as returned
  const sortedFighters = useMemo(() => filteredFighters, [filteredFighters])

  const handleChallenge = (fighter: Fighter) => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!canChallenge) {
      onUpgradeClick()
      return
    }
    setChallengeModal(fighter)
  }

  const confirmChallenge = () => {
    if (!user) {
      setChallengeModal(null)
      return
    }

    const success = useChallenge()
    if (success) {
      const gained = challengeXpGain
      setXpGained(gained)
      setChallengeSent(true)
      setTimeout(() => {
        setChallengeModal(null)
        setChallengeSent(false)
        setXpGained(0)
      }, 2500)
    }
  }

  return (
    <section className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif font-bold text-xl uppercase tracking-wide text-foreground">
            Encontrar Oponente
          </h2>
          {!isPremium && (
            <p className="text-xs text-muted-foreground mt-1">
              {remainingChallenges} desafios restantes hoje
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-card border-border hover:bg-muted text-foreground"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filtros</span>
        </Button>
      </div>

      {/* Weight Class Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-xl p-4 mb-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Categoria de Peso</span>
                {selectedWeight && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedWeight(null)}
                  >
                    Limpar
                    <X className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {weightClasses.map((wc) => (
                  <Button
                    key={wc.id}
                    variant="outline"
                    size="sm"
                    className={`transition-all ${
                      selectedWeight === wc.id
                        ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                        : "bg-muted/50 border-border hover:bg-muted text-foreground"
                    }`}
                    onClick={() => setSelectedWeight(selectedWeight === wc.id ? null : wc.id)}
                  >
                    {wc.label}
                    <span className="ml-1 text-xs opacity-70">{wc.weight}</span>
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fighters List */}
      <div className="space-y-3">
        {fightersLoading && (
          <p className="text-sm text-muted-foreground py-4 text-center">Carregando lutadores...</p>
        )}
        {!fightersLoading && !isPremium && sortedFighters.length < filteredFighters.length && (
          <p className="text-xs text-muted-foreground mb-2">
            Plano gratuito: você vê até {FREE_FIGHTERS_PER_DAY} lutadores por dia.{" "}
            <button type="button" onClick={onUpgradeClick} className="text-[#FFD700] hover:underline font-medium">
              Assine PRO para ver todos
            </button>
          </p>
        )}
        {!fightersLoading && sortedFighters.map((fighter, index) => (
          <motion.div
            key={fighter.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-card rounded-xl p-4 border transition-all hover:border-primary/30 ${
              fighter.isPremium ? "border-[#FFD700]/30 glow-gold" : "border-border"
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center font-serif font-bold text-lg text-foreground ${
                  fighter.isPremium ? "border-2 border-[#FFD700]" : ""
                }`}>
                  {fighter.name.split(" ").map(n => n[0]).join("")}
                </div>
                {fighter.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#FFD700] flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-[#000]" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-serif font-bold text-base uppercase tracking-wide truncate text-foreground">
                    {fighter.name}
                  </h3>
                  {fighter.isPremium && (
                    <Crown className="w-4 h-4 text-[#FFD700] shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{fighter.academy}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {fighter.city}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">
                    Nivel {fighter.level}
                  </Badge>
                  <span className="text-xs">
                    <span className="text-green-500 font-semibold">{fighter.record.wins}V</span>
                    <span className="text-muted-foreground mx-1">-</span>
                    <span className="text-red-500 font-semibold">{fighter.record.losses}D</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                    {weightClasses.find(wc => wc.id === fighter.weightClass)?.label}
                  </Badge>
                </div>
              </div>

              {/* Challenge Button */}
              <Button
                size="sm"
                className={`shrink-0 font-serif uppercase tracking-wide ${
                  canChallenge
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "bg-muted hover:bg-muted text-muted-foreground"
                }`}
                onClick={() => handleChallenge(fighter)}
              >
                {canChallenge ? (
                  <>
                    <Swords className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Desafiar</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Bloqueado</span>
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Challenge Confirmation Modal */}
      <Dialog open={!!challengeModal} onOpenChange={() => setChallengeModal(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl uppercase tracking-wide text-foreground">
              Confirmar Desafio
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Voce esta prestes a desafiar um oponente para uma luta.
            </DialogDescription>
          </DialogHeader>

          {challengeModal && !challengeSent && (
            <div className="py-4">
              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mx-auto mb-2 ${isPremium ? 'border-2 border-[#FFD700]' : ''}`}>
                    <span className="font-serif font-bold text-xl text-primary-foreground">
                      {user?.nome
                        ?.split(" ")
                        .filter(Boolean)
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "MH"}
                    </span>
                  </div>
                  <p className="font-serif text-sm uppercase text-foreground">Voce</p>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
                  <Swords className="w-5 h-5 text-primary" />
                </div>
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto mb-2 ${
                    challengeModal.isPremium ? "border-2 border-[#FFD700]" : ""
                  }`}>
                    <span className="font-serif font-bold text-xl text-foreground">
                      {challengeModal.name.split(" ").map(n => n[0]).join("")}
                    </span>
                  </div>
                  <p className="font-serif text-sm uppercase text-foreground">{challengeModal.name.split(" ")[0]}</p>
                </div>
              </div>

              {/* XP Preview */}
              <div className="bg-primary/10 rounded-lg p-3 mb-4 flex items-center justify-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">
                  +{challengeXpGain} XP ao desafiar
                </span>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                O oponente recebera uma notificacao e podera aceitar ou recusar seu desafio.
              </p>
            </div>
          )}

          {challengeSent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="font-serif text-lg uppercase tracking-wide text-foreground mb-2">
                Desafio Enviado!
              </p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full"
              >
                <Zap className="w-4 h-4" />
                <span className="font-bold">+{xpGained} XP</span>
              </motion.div>
            </motion.div>
          )}

          {!challengeSent && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setChallengeModal(null)}
                className="border-border text-foreground hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmChallenge}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-serif uppercase tracking-wide"
              >
                <Swords className="w-4 h-4 mr-2" />
                Confirmar Desafio
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
