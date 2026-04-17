"use client"

import { Crown, Medal, TrendingUp, ChevronRight, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useUser } from "@/context/user-context"

const topFighters = [
  {
    rank: 1,
    name: "Marcos Almeida",
    academy: "Alliance",
    xp: 8500,
    record: { wins: 45, losses: 2 },
    isPremium: true,
    trend: "up",
  },
  {
    rank: 2,
    name: "Felipe Rocha",
    academy: "Checkmat",
    xp: 7200,
    record: { wins: 38, losses: 5 },
    isPremium: true,
    trend: "up",
  },
  {
    rank: 3,
    name: "Bruno Tavares",
    academy: "Gracie Barra",
    xp: 6800,
    record: { wins: 35, losses: 6 },
    isPremium: true,
    trend: "same",
  },
  {
    rank: 4,
    name: "Gabriel Souza",
    academy: "Nova União",
    xp: 6100,
    record: { wins: 30, losses: 4 },
    isPremium: false,
    trend: "up",
  },
  {
    rank: 5,
    name: "Rodrigo Lima",
    academy: "Atos",
    xp: 5900,
    record: { wins: 28, losses: 7 },
    isPremium: true,
    trend: "down",
  },
]

const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return "bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#000]"
    case 2:
      return "bg-gradient-to-r from-[#C0C0C0] to-[#A0A0A0] text-[#000]"
    case 3:
      return "bg-gradient-to-r from-[#CD7F32] to-[#8B4513] text-white"
    default:
      return "bg-muted text-foreground"
  }
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-4 h-4" />
    case 2:
    case 3:
      return <Medal className="w-4 h-4" />
    default:
      return <span className="text-sm font-bold">{rank}</span>
  }
}

export function Leaderboard() {
  const { user, isPremium } = useUser()
  const currentXP = Number.isFinite(Number((user as { currentXP?: number } | null)?.currentXP))
    ? Number((user as { currentXP?: number }).currentXP)
    : 0
  const ranking = Number((user as { ranking?: number } | null)?.ranking)
  const hasRanking = Number.isFinite(ranking)

  // Calculate XP needed for next rank using fields available in User
  const xpForNextRank = user ? Math.max(0, 3000 - currentXP) : 3000

  return (
    <section className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif font-bold text-xl uppercase tracking-wide text-foreground">
            Ranking Nacional
          </h2>
          <p className="text-sm text-muted-foreground">Top 5 • BJJ Faixa Roxa</p>
        </div>
        <Button variant="ghost" className="text-primary hover:text-primary">
          Ver Todos
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {topFighters.map((fighter, index) => (
          <motion.div
            key={fighter.rank}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-4 p-4 ${
              index !== topFighters.length - 1 ? "border-b border-border" : ""
            } ${fighter.isPremium ? "bg-[#FFD700]/5" : ""}`}
          >
            {/* Rank Badge */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getRankStyle(fighter.rank)}`}>
              {getRankIcon(fighter.rank)}
            </div>

            {/* Fighter Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-sm uppercase tracking-wide truncate text-foreground">
                  {fighter.name}
                </h3>
                {fighter.isPremium && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-[#FFD700]" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{fighter.academy}</p>
            </div>

            {/* Stats */}
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 justify-end">
                <span className="font-serif font-bold text-sm text-foreground">
                  {fighter.xp.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">XP</span>
                {fighter.trend === "up" && (
                  <TrendingUp className="w-3 h-3 text-green-500 ml-1" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {fighter.record.wins}V - {fighter.record.losses}D
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Your Position */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={`mt-4 rounded-xl p-4 border ${
          isPremium 
            ? "bg-[#FFD700]/10 border-[#FFD700]/30" 
            : "bg-primary/10 border-primary/20"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
            isPremium 
              ? "bg-[#FFD700]/20 text-[#FFD700]" 
              : "bg-primary/20 text-primary"
          }`}>
            {hasRanking ? ranking : "—"}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">Sua Posicao</p>
              {isPremium && (
                <div className="flex items-center gap-1 bg-[#FFD700]/20 text-[#FFD700] px-1.5 py-0.5 rounded">
                  <Crown className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase">PRO</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              +3 posicoes esta semana
            </p>
          </div>
          <div className="text-right">
            <span className="font-serif font-bold text-sm text-foreground">
              {currentXP.toLocaleString("pt-BR")} XP
            </span>
            <p className="text-xs text-muted-foreground">
              {user && hasRanking && xpForNextRank > 0 ? `${xpForNextRank} XP para #${ranking - 1}` : "Proximo nivel!"}
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
