"use client"

import { useState, useEffect } from "react"
import { MapPin, Star, Users, ChevronRight, Award } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001"

type AcademyApi = {
  id: number
  nome: string
  endereco: string
  lat: number | null
  lng: number | null
  is_sponsored: boolean
}

export function SponsoredAcademies() {
  const [academies, setAcademies] = useState<
    { id: number; name: string; address: string; city: string; isSponsored: boolean; image: string }[]
  >([])

  useEffect(() => {
    fetch(`${API_BASE}/api/sponsored-academies`)
      .then((res) => res.json())
      .then((data) => {
        if (data.academies) {
          setAcademies(
            data.academies.map((a: AcademyApi) => ({
              id: a.id,
              name: a.nome,
              address: a.endereco,
              city: a.endereco.split(",").slice(-2).join(",").trim() || a.endereco,
              isSponsored: a.is_sponsored,
              image: a.nome.slice(0, 2).toUpperCase(),
            }))
          )
        }
      })
      .catch(() => setAcademies([]))
  }, [])

  if (academies.length === 0) {
    return (
      <section className="p-4 lg:p-6">
        <h2 className="font-serif font-bold text-xl uppercase tracking-wide text-foreground">
          Academias Parceiras
        </h2>
        <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
      </section>
    )
  }

  return (
    <section className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif font-bold text-xl uppercase tracking-wide text-foreground">
            Academias Parceiras
          </h2>
          <p className="text-sm text-muted-foreground">Academias verificadas perto de você</p>
        </div>
        <Button variant="ghost" className="text-primary hover:text-primary">
          Ver Mapa
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {academies.map((academy, index) => (
          <motion.div
            key={academy.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative bg-card rounded-xl overflow-hidden border transition-all hover:border-primary/30 ${
              academy.isSponsored 
                ? "border-glow-orange" 
                : "border-border"
            }`}
          >
            {/* Sponsored Badge */}
            {academy.isSponsored && (
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/80 px-3 py-1.5 flex items-center justify-center gap-2">
                <Award className="w-3.5 h-3.5 text-primary-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  Parceira SelestialHub
                </span>
              </div>
            )}

            <div className={`p-4 ${academy.isSponsored ? "pt-10" : ""}`}>
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-serif font-bold text-lg ${
                  academy.isSponsored 
                    ? "bg-gradient-to-br from-primary to-primary/50 text-primary-foreground" 
                    : "bg-muted text-foreground"
                }`}>
                  {academy.image}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif font-bold text-sm uppercase tracking-wide truncate text-foreground">
                    {academy.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{academy.city}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mb-3 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-[#FFD700] fill-[#FFD700]" />
                  <span className="font-semibold text-foreground">{academy.rating}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{academy.members} membros</span>
                </div>
              </div>

              {/* Modalities */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {academy.modalities.map((mod) => (
                  <Badge 
                    key={mod} 
                    variant="secondary" 
                    className="text-[10px] bg-muted text-muted-foreground"
                  >
                    {mod}
                  </Badge>
                ))}
              </div>

              {/* CTA */}
              <Button 
                className={`w-full font-serif uppercase tracking-wide text-xs ${
                  academy.isSponsored 
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
                size="sm"
              >
                Ver Academia
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
