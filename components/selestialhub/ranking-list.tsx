"use client"

import { useState, useMemo } from "react"
import { RankingRow } from "./ranking-row"
import { RankingFilters, type RankingFilterState } from "./ranking-filters"
import { useUser } from "@/context/user-context"

const fighters = [
  {
    rank: 1,
    name: "Marcos Almeida",
    academy: "Alliance",
    modalidade: "bjj",
    faixa: "preta",
    xp: 8500,
    record: { wins: 45, losses: 2 },
    isPremium: true,
    trend: "up" as const,
  },
  {
    rank: 2,
    name: "Felipe Rocha",
    academy: "Checkmat",
    modalidade: "bjj",
    faixa: "preta",
    xp: 7200,
    record: { wins: 38, losses: 5 },
    isPremium: true,
    trend: "up" as const,
  },
  {
    rank: 3,
    name: "Bruno Tavares",
    academy: "Gracie Barra",
    modalidade: "bjj",
    faixa: "marrom",
    xp: 6800,
    record: { wins: 35, losses: 6 },
    isPremium: true,
    trend: "stable" as const,
  },
  {
    rank: 4,
    name: "Gabriel Souza",
    academy: "Nova União",
    modalidade: "bjj",
    faixa: "roxa",
    xp: 6100,
    record: { wins: 30, losses: 4 },
    isPremium: false,
    trend: "up" as const,
  },
  {
    rank: 5,
    name: "Rodrigo Lima",
    academy: "Atos",
    modalidade: "bjj",
    faixa: "marrom",
    xp: 5900,
    record: { wins: 28, losses: 7 },
    isPremium: true,
    trend: "down" as const,
  },
  {
    rank: 6,
    name: "João Santos",
    academy: "Alliance",
    modalidade: "muay-thai",
    faixa: "roxa",
    xp: 5400,
    record: { wins: 24, losses: 8 },
    isPremium: false,
    trend: "up" as const,
  },
  {
    rank: 7,
    name: "Pedro Silva",
    academy: "Boxe Campeões",
    modalidade: "boxe",
    faixa: "azul",
    xp: 4900,
    record: { wins: 20, losses: 10 },
    isPremium: false,
    trend: "stable" as const,
  },
  {
    rank: 8,
    name: "Lucas Costa",
    academy: "MMA Elite",
    modalidade: "mma",
    faixa: "roxa",
    xp: 4600,
    record: { wins: 18, losses: 12 },
    isPremium: true,
    trend: "down" as const,
  },
  {
    rank: 9,
    name: "André Ferreira",
    academy: "Nova União",
    modalidade: "judo",
    faixa: "preta",
    xp: 4200,
    record: { wins: 16, losses: 14 },
    isPremium: false,
    trend: "up" as const,
  },
  {
    rank: 10,
    name: "Mateus Oliveira",
    academy: "Checkmat",
    modalidade: "bjj",
    faixa: "azul",
    xp: 3800,
    record: { wins: 14, losses: 16 },
    isPremium: false,
    trend: "stable" as const,
  },
]

import { useEffect } from 'react'

// Gerar mais 90 atletas para ter 100 no total (base determinística)
const baseAdditionalFighters = Array.from({ length: 90 }, (_, i) => {
  const rank = i + 11
  const names = [
    "Rafael Mendes", "Demian Maia", "Charles do Bronx", "Oleksiy Petrovich", "Alex Pereira",
    "Kamaru Usman", "Colby Covington", "Jorge Masvidal", "Nate Diaz", "Conor McGregor",
    "Anderson Silva", "Georges St-Pierre", "Jose Aldo", "Demetrious Johnson", "Tyron Woodley",
  ]
  const academies = ["Alliance", "Checkmat", "Nova União", "Gracie Barra", "MMA Elite", "Box Campeões"]
  const modalidades = ["bjj", "muay-thai", "boxe", "judo", "mma", "taikendo"]
  const faixas = ["branca", "azul", "roxa", "marrom", "preta"]
  
  // Use rank to seed deterministic values instead of Math.random()
  const seed = rank * 12345 % 1000
  return {
    rank,
    name: `${names[rank % names.length]} ${rank}`,
    academy: academies[rank % academies.length],
    modalidade: modalidades[rank % modalidades.length],
    faixa: faixas[rank % faixas.length],
    xp: Math.floor(3500 - rank * 30),
    record: {
      wins: (seed * 7) % 30,
      losses: (seed * 13) % 20,
    },
    isPremium: (seed * 17) % 10 > 7,
    trend: (["up", "down", "stable"] as const)[seed % 3],
  }
})

export function RankingList() {
  const { user } = useUser()
  const [filters, setFilters] = useState<RankingFilterState>({
    search: "",
    modalidade: "",
    faixa: "",
  })

  const allFighters = useMemo(() => {
    return [...fighters, ...baseAdditionalFighters]
  }, [])

  const filteredFighters = useMemo(() => {
    return allFighters.filter((fighter) => {
      // Search by name
      if (
        filters.search &&
        !fighter.name.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false
      }

      // Filter by modalidade
      if (filters.modalidade && fighter.modalidade !== filters.modalidade) {
        return false
      }

      // Filter by faixa
      if (filters.faixa && fighter.faixa !== filters.faixa) {
        return false
      }

      return true
    })
  }, [filters, allFighters])

  return (
    <div>
      <RankingFilters onFilterChange={setFilters} />

      {/* Results Header */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {filteredFighters.length} atleta{filteredFighters.length !== 1 ? "s" : ""} encontrado
          {filteredFighters.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Ranking Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {filteredFighters.map((fighter) => (
          <RankingRow
            key={fighter.rank}
            {...fighter}
            isCurrentUser={fighter.name === user?.nome}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredFighters.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">Nenhum atleta encontrado</p>
          <p className="text-xs text-muted-foreground">
            Tente ajustar seus filtros de busca
          </p>
        </div>
      )}
    </div>
  )
}
