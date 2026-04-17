"use client"

import { useState } from "react"
import { Edit2, Crown, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/context/user-context"

interface ProfileHeaderProps {
  onEditClick: () => void
}

export function ProfileHeader({ onEditClick }: ProfileHeaderProps) {
  const { user, isPremium } = useUser()

  if (!user) return null

  const displayName = user.nome || "Atleta"
  const currentXP = Number.isFinite(Number((user as { currentXP?: number }).currentXP))
    ? Number((user as { currentXP?: number }).currentXP)
    : 0
  const ranking = (user as { ranking?: number | string }).ranking ?? "---"
  const level = Math.max(1, Math.floor(currentXP / 200))
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-6">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={`w-24 h-24 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center font-serif font-bold text-4xl text-primary-foreground ${
            isPremium ? "border-4 border-[#FFD700]" : "border-2 border-border"
          }`}>
            {initials || "MH"}
          </div>
          {isPremium && (
            <div className="flex items-center justify-center mt-2">
              <Badge className="bg-[#FFD700] text-[#000] hover:bg-[#FFD700]/90 gap-1">
                <Crown className="w-3 h-3" />
                PRO
              </Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
            <h1 className="font-serif font-bold text-2xl uppercase tracking-wide text-foreground">
              {displayName}
            </h1>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          
          <div className="space-y-1 mb-4">
            <p className="text-sm text-muted-foreground">Academia • Modalidade</p>
            <p className="text-xs text-muted-foreground">Nível {level} • Ranking #{ranking}</p>
          </div>

          <div className="flex items-center gap-2 justify-center md:justify-start mb-4 flex-wrap">
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              Faixa Roxa
            </Badge>
            <Badge variant="outline" className="border-green-500 text-green-500">
              Ativo agora
            </Badge>
          </div>
        </div>

        {/* Edit Button */}
        <Button
          onClick={onEditClick}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-serif uppercase tracking-wide"
        >
          <Edit2 className="w-4 h-4" />
          <span className="hidden sm:inline">Editar Perfil</span>
          <span className="sm:hidden">Editar</span>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
        <div className="text-center">
          <p className="text-xl font-serif font-bold text-primary">{currentXP.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-muted-foreground">XP Total</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-serif font-bold text-green-500">25:3</p>
          <p className="text-xs text-muted-foreground">Recorde</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-serif font-bold text-blue-500">#{ranking}</p>
          <p className="text-xs text-muted-foreground">Ranking</p>
        </div>
      </div>
    </div>
  )
}
