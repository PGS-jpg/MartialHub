"use client"

import { MapPin, Users, Star, Trophy, Phone, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import type { ReactNode } from "react"

interface AcademyCardProps {
  id: number
  name: string
  city: string
  modalidade: string
  rating: number
  reviews: number
  instructors: number
  faixaMinima: string
  phone: string
  isSponsored: boolean
  distanceKm?: number
  canDelete?: boolean
  isDeleting?: boolean
  onDelete?: () => void
  image?: ReactNode
}

export function AcademyCard({ 
  name, 
  city, 
  modalidade, 
  rating, 
  reviews,
  instructors,
  faixaMinima,
  phone,
  isSponsored,
  distanceKm,
  canDelete = false,
  isDeleting = false,
  onDelete,
}: AcademyCardProps) {
  const cleanPhone = (phone || "").replace(/\D/g, "")
  const hasContact = cleanPhone.length >= 8
  const contactHref = hasContact ? `https://wa.me/${cleanPhone}` : undefined

  return (
    <Card className="group overflow-hidden rounded-2xl border border-[#232832] bg-[#0f1318] transition-all duration-300 hover:-translate-y-1 hover:border-[#ff5b00]/45 hover:shadow-[0_18px_40px_rgba(0,0,0,0.38)]">
      {/* Header com badge sponsor */}
      <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-[#1d130d] via-[#181b21] to-[#101318]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,91,0,0.16),transparent_42%)]" />
        {isSponsored && (
          <Badge className="absolute top-3 right-3 gap-1 border-0 bg-[#FFD700] text-[#000] hover:bg-[#FFD700]/90">
            <Trophy className="w-3 h-3" />
            Patrocinada
          </Badge>
        )}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-[#ff5b00] shadow-[0_12px_24px_rgba(255,91,0,0.2)] transition-transform duration-300 group-hover:scale-105">
          <span className="font-serif font-bold text-2xl text-primary-foreground">
            {name.charAt(0)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {/* Nome e Avaliação */}
        <div>
          <h3 className="mb-2 font-sans text-base font-black uppercase tracking-[0.04em] text-foreground">
            {name}
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.floor(rating)
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {rating.toFixed(1)} ({reviews} avaliações)
            </span>
          </div>
        </div>

        {/* Localização e Modalidade */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 text-[#ff8a4c]" />
            <span>{city}</span>
            {distanceKm !== undefined && (
              <span className="ml-2 rounded-full bg-[#ff5b00]/10 px-2 py-0.5 text-[11px] text-[#ff8a4c]">{distanceKm.toFixed(1)} km</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="bg-[#1b2027] text-muted-foreground">
              {modalidade}
            </Badge>
            <Badge variant="outline" className="border-[#ff5b00]/35 bg-[#1b2027] text-[#ff8a4c]">
              {faixaMinima}+
            </Badge>
          </div>
        </div>

        {/* Instrutores */}
        <div className="rounded-xl border border-[#232832] bg-[#131820] p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3" />
            <span>{instructors} instrutores</span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Phone className="w-3 h-3" />
            <span>{phone || "Não informado"}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-[#2a3040] bg-[#1b2027] text-foreground hover:bg-[#242b36]"
          >
            Ver Detalhes
          </Button>
          {hasContact ? (
            <Button
              size="sm"
              className="flex-1 bg-[#ff5b00] text-white hover:bg-[#e65200]"
              asChild
            >
              <a href={contactHref} target="_blank" rel="noopener noreferrer">Contatar</a>
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1"
              disabled
            >
              Sem contato
            </Button>
          )}
        </div>

        {canDelete && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-red-500/40 bg-transparent text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? "Excluindo..." : "Excluir academia"}
          </Button>
        )}
      </div>
    </Card>
  )
}
