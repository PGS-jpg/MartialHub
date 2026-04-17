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

interface EventFiltersProps {
  onFilterChange: (filters: EventFilterState) => void
}

export interface EventFilterState {
  search: string
  modalidade: string
  status: string
  level: string
}

export function EventFilters({ onFilterChange }: EventFiltersProps) {
  const [filters, setFilters] = useState<EventFilterState>({
    search: "",
    modalidade: "",
    status: "",
    level: "",
  })

  const [showFilters, setShowFilters] = useState(false)

  const handleChange = (key: keyof EventFilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleReset = () => {
    const emptyFilters = {
      search: "",
      modalidade: "",
      status: "",
      level: "",
    }
    setFilters(emptyFilters)
    onFilterChange(emptyFilters)
  }

  const activeFiltersCount = Object.values(filters).filter((v) => v).length

  return (
    <div className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
      {/* Search Bar */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar evento..."
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            className="border-[#2a3040] bg-[#1b2027] pl-10 text-foreground placeholder:text-muted-foreground/55"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-[#2a3040] bg-[#1b2027] text-foreground hover:bg-[#242b36]"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="ml-1 rounded-full bg-[#ff5b00] px-1.5 py-0.5 text-xs text-white">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-3 border-t border-[#232832] pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Modalidade */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
                Modalidade
              </label>
              <Select
                value={filters.modalidade}
                onValueChange={(v) => handleChange("modalidade", v)}
              >
                <SelectTrigger className="border-[#2a3040] bg-[#1b2027] text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="border-[#232832] bg-[#131820] text-foreground">
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

            {/* Status */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
                Status
              </label>
              <Select value={filters.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger className="border-[#2a3040] bg-[#1b2027] text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="border-[#232832] bg-[#131820] text-foreground">
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="open">Inscrições Abertas</SelectItem>
                  <SelectItem value="live">Ao Vivo</SelectItem>
                  <SelectItem value="closed">Inscrições Fechadas</SelectItem>
                  <SelectItem value="finished">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Nível */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
                Nível
              </label>
              <Select value={filters.level} onValueChange={(v) => handleChange("level", v)}>
                <SelectTrigger className="border-[#2a3040] bg-[#1b2027] text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="border-[#232832] bg-[#131820] text-foreground">
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="iniciante">Iniciante</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                  <SelectItem value="profissional">Profissional</SelectItem>
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
              className="gap-1 text-muted-foreground hover:bg-[#1b2027] hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Limpar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
