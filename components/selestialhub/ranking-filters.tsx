"use client"

import { useState } from "react"
import { Search, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface RankingFiltersProps {
  onFilterChange: (filters: RankingFilterState) => void
}

export interface RankingFilterState {
  search: string
  modalidade: string
  faixa: string
}

export function RankingFilters({ onFilterChange }: RankingFiltersProps) {
  const [filters, setFilters] = useState<RankingFilterState>({
    search: "",
    modalidade: "",
    faixa: "",
  })

  const [showFilters, setShowFilters] = useState(false)

  const handleChange = (key: keyof RankingFilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleReset = () => {
    const emptyFilters = {
      search: "",
      modalidade: "",
      faixa: "",
    }
    setFilters(emptyFilters)
    onFilterChange(emptyFilters)
  }

  const activeFiltersCount = Object.values(filters).filter((v) => v).length

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-6">
      {/* Search Bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar atleta..."
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            className="pl-10 bg-muted border-border text-foreground"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-border text-foreground hover:bg-muted"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="ml-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Modalidade */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
                Modalidade
              </label>
              <Select
                value={filters.modalidade}
                onValueChange={(v) => handleChange("modalidade", v)}
              >
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="bjj">BJJ</SelectItem>
                  <SelectItem value="muay-thai">Muay Thai</SelectItem>
                  <SelectItem value="boxe">Boxe</SelectItem>
                  <SelectItem value="judo">Judô</SelectItem>
                  <SelectItem value="mma">MMA</SelectItem>
                  <SelectItem value="taikendo">Taikendo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Faixa */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
                Faixa
              </label>
              <Select value={filters.faixa} onValueChange={(v) => handleChange("faixa", v)}>
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="branca">Faixa Branca</SelectItem>
                  <SelectItem value="azul">Faixa Azul</SelectItem>
                  <SelectItem value="roxa">Faixa Roxa</SelectItem>
                  <SelectItem value="marrom">Faixa Marrom</SelectItem>
                  <SelectItem value="preta">Faixa Preta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="w-3 h-3" />
              Limpar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
