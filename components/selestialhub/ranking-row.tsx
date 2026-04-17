"use client"

import { Crown, Medal, TrendingUp, TrendingDown, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface RankingRowProps {
  rank: number
  name: string
  academy: string
  xp: number
  record: { wins: number; losses: number }
  trend: "up" | "down" | "stable"
  isCurrentUser?: boolean
  isPremium?: boolean
}

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
      return <span className="text-sm font-bold">#{rank}</span>
  }
}

export function RankingRow({
  rank,
  name,
  academy,
  xp,
  record,
  trend,
  isCurrentUser = false,
  isPremium = false,
}: RankingRowProps) {
  return (
    <div
      className={`flex items-center gap-4 p-4 border-b border-border transition-colors ${
        isCurrentUser ? "bg-primary/10 border-primary/50" : ""
      }`}
    >
      {/* Rank Badge */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${getRankStyle(rank)}`}>
        {getRankIcon(rank)}
      </div>

      {/* Position Indicator */}
      <div className="flex items-center justify-center shrink-0">
        {trend === "up" && <TrendingUp className="w-4 h-4 text-green-500" />}
        {trend === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
        {trend === "stable" && <ArrowRight className="w-4 h-4 text-yellow-500" />}
      </div>

      {/* Fighter Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-serif font-bold text-sm uppercase tracking-wide truncate text-foreground">
            {name}
            {isCurrentUser && (
              <Badge className="ml-2 bg-primary text-primary-foreground text-[10px]">
                Você
              </Badge>
            )}
          </h3>
          {isPremium && (
            <Crown className="w-3 h-3 text-[#FFD700] shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{academy}</p>
      </div>

      {/* Stats */}
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 justify-end mb-1">
          <span className="font-serif font-bold text-sm text-foreground">
            {xp.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">XP</span>
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="text-green-500 font-semibold">{record.wins}V</span>
          {" - "}
          <span className="text-red-500 font-semibold">{record.losses}D</span>
        </p>
      </div>
    </div>
  )
}
