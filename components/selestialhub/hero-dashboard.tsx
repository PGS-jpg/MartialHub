"use client"

import { useState } from "react"
import { Swords, Trophy, TrendingUp, Zap, Crown, CheckCircle, Lock } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useUser } from "@/context/user-context"

interface HeroDashboardProps {
  onFindFight: () => void
  onUpgradeClick: () => void
}

export function HeroDashboard({ onFindFight, onUpgradeClick }: HeroDashboardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const userContext = useUser()
  const { user, isPremium } = userContext

  // Merge com defaults para evitar campos ausentes quando o user vem parcial do localStorage/API
  const userData = {
    nome: "Atleta",
    currentXP: 0,
    nextLevelXP: 1000,
    level: 1,
    wins: 0,
    losses: 0,
    ranking: "---",
    academy: "Academia",
    city: "Brasil",
    isVerified: false,
    ...(user ?? {}),
  }

  const toSafeNumber = (value: unknown, fallback = 0) => {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : fallback
  }

  const currentXP = toSafeNumber(userData.currentXP)
  const nextLevelXP = toSafeNumber(userData.nextLevelXP, 1000)
  const wins = toSafeNumber(userData.wins)
  const losses = toSafeNumber(userData.losses)
  const level = Math.max(1, toSafeNumber(userData.level, 1))

  const canChallenge =
    typeof (userContext as { canChallenge?: boolean }).canChallenge === "boolean"
      ? (userContext as { canChallenge?: boolean }).canChallenge!
      : Boolean(user)

  const remainingChallengesRaw = toSafeNumber(
    (userContext as { remainingChallenges?: number }).remainingChallenges,
    0
  )
  const remainingChallenges = Math.max(0, remainingChallengesRaw)
  const formatInt = (value: unknown) => toSafeNumber(value).toLocaleString("pt-BR")

  // Cálculo de XP com proteção contra divisão por zero
  const xpProgress = nextLevelXP > 0 
    ? (currentXP / nextLevelXP) * 100 
    : 0

  // Pega iniciais ou apenas "A"
  const initials = userData.nome ? userData.nome.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "A"

  return (
    <section className="relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-[#FFD700]/5" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzB2MkgyVjRoMzR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />

      <div className="relative p-4 lg:p-6">
        {/* User Welcome Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 lg:p-6 border border-border mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center ${isPremium ? 'border-glow-gold' : ''}`}>
                  <span className="font-serif font-bold text-3xl lg:text-4xl text-primary-foreground">
                    {initials}
                  </span>
                </div>
                {isPremium && userData.isVerified && (
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#FFD700] flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-5 h-5 text-[#000]" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-serif font-bold text-xl lg:text-2xl uppercase tracking-wide text-foreground">
                    {userData.nome}
                  </h2>
                  {isPremium && (
                    <div className="flex items-center gap-1 bg-[#FFD700]/20 text-[#FFD700] px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase">PRO</span>
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">
                  {userData.academy} | {userData.city}
                </p>
                
                {/* Challenge Counter for Free Users */}
                {!isPremium && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-muted/80 px-2.5 py-1 rounded-full">
                      <Swords className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-medium text-foreground">
                        {remainingChallenges || 0} desafios restantes hoje
                      </span>
                    </div>
                    {!canChallenge && (
                      <button
                        onClick={onUpgradeClick}
                        className="flex items-center gap-1 text-[#FFD700] text-xs font-medium hover:underline"
                      >
                        <Lock className="w-3 h-3" />
                        Desbloquear
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="flex-1 grid grid-cols-3 gap-3 lg:gap-4">
              <div className="bg-muted/50 rounded-xl p-3 lg:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Nivel</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-serif font-bold text-2xl lg:text-3xl text-foreground">{level}</span>
                </div>
                <div className="mt-2">
                  <Progress value={xpProgress} className="h-1.5 bg-muted" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatInt(currentXP)}/{formatInt(nextLevelXP)} XP
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-3 lg:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Cartel</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-serif font-bold text-2xl lg:text-3xl text-green-500">{wins}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="font-serif font-bold text-2xl lg:text-3xl text-red-500">{losses}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {wins + losses > 0 
                    ? ((wins / (wins + losses)) * 100).toFixed(0) 
                    : 0}% vitorias
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-3 lg:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Ranking</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-muted-foreground">#</span>
                  <span className="font-serif font-bold text-2xl lg:text-3xl text-foreground">{userData.ranking}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Nacional BJJ
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Find Fight Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={onFindFight}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative w-full h-16 lg:h-20 text-lg lg:text-xl font-serif font-bold uppercase tracking-widest overflow-hidden group ${
              canChallenge 
                ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            }`}
            disabled={!canChallenge}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: "-100%" }}
              animate={isHovered && canChallenge ? { x: "100%" } : { x: "-100%" }}
              transition={{ duration: 0.5 }}
            />
            <span className="relative flex items-center gap-3">
              {canChallenge ? (
                <>
                  <Swords className="w-6 h-6 lg:w-7 lg:h-7" />
                  BUSCAR LUTA AGORA
                </>
              ) : (
                <>
                  <Lock className="w-6 h-6 lg:w-7 lg:h-7" />
                  LIMITE DIARIO ATINGIDO
                </>
              )}
            </span>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}