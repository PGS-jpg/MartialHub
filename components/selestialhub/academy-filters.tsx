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

interface AcademyFiltersProps {
  onFilterChange: (filters: AcademyFilterState) => void
  onLocationRequest?: () => void
}

export interface AcademyFilterState {
  search: string
  modalidade: string
  city: string
  estado: string
  minRating: string
  faixa: string
}

export function AcademyFilters({ onFilterChange, onLocationRequest }: AcademyFiltersProps) {
  const [filters, setFilters] = useState<AcademyFilterState>({
    search: "",
    modalidade: "",
    city: "",
    estado: "",
    minRating: "",
    faixa: "",
  })

  const [showFilters, setShowFilters] = useState(false)

  const handleChange = (key: keyof AcademyFilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleReset = () => {
    const emptyFilters = {
      search: "",
      modalidade: "",
      city: "",
      estado: "",
      minRating: "",
      faixa: "",
    }
    setFilters(emptyFilters)
    onFilterChange(emptyFilters)
  }

  const activeFiltersCount = Object.values(filters).filter(v => v).length

  return (
    <div className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
      {/* Search Bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar academia..."
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            className="pl-10 border-[#2a3040] bg-[#1b2027] text-foreground placeholder:text-muted-foreground/55"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className={showFilters
            ? "gap-2 border-[#ff5b00] bg-[#ff5b00] text-white hover:bg-[#e65200]"
            : "gap-2 border-[#2a3040] bg-[#1b2027] text-foreground hover:bg-[#252b36]"
          }
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
        {onLocationRequest && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-[#ff8a4c] hover:bg-[#1b2027] hover:text-[#ff8a4c]"
            onClick={onLocationRequest}
          >
            <span className="text-xs">Perto de mim</span>
          </Button>
        )}
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
              <Select value={filters.modalidade} onValueChange={(v) => handleChange("modalidade", v)}>
                <SelectTrigger className="border-[#2a3040] bg-[#1b2027] text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="border-[#232832] bg-[#131820]">
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

            {/* Cidade */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
                Cidade
              </label>
              <Select value={filters.city} onValueChange={(v) => handleChange("city", v)}>
                <SelectTrigger className="border-[#2a3040] bg-[#1b2027] text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="border-[#232832] bg-[#131820]">
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="sao-paulo">São Paulo</SelectItem>
                  <SelectItem value="rio-de-janeiro">Rio de Janeiro</SelectItem>
                  <SelectItem value="belo-horizonte">Belo Horizonte</SelectItem>
                  <SelectItem value="brasilia">Brasília</SelectItem>
                  <SelectItem value="curitiba">Curitiba</SelectItem>
                  <SelectItem value="salvador">Salvador</SelectItem>
                  <SelectItem value="porto-alegre">Porto Alegre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estado */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Estado</label>
              <Select value={filters.estado} onValueChange={(v) => handleChange("estado", v)}>
                <SelectTrigger className="border-[#2a3040] bg-[#1b2027] text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="border-[#232832] bg-[#131820]">
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="mg">MG</SelectItem>
                  <SelectItem value="sp">SP</SelectItem>
                  <SelectItem value="rj">RJ</SelectItem>
                  <SelectItem value="ba">BA</SelectItem>
                  <SelectItem value="rs">RS</SelectItem>
                  <SelectItem value="pr">PR</SelectItem>
                  <SelectItem value="sc">SC</SelectItem>
                  <SelectItem value="df">DF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Avaliação Mínima */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
                Avaliação Mínima
              </label>
              <Select value={filters.minRating} onValueChange={(v) => handleChange("minRating", v)}>
                <SelectTrigger className="border-[#2a3040] bg-[#1b2027] text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="border-[#232832] bg-[#131820]">
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="3">⭐ 3+</SelectItem>
                  <SelectItem value="4">⭐ 4+</SelectItem>
                  <SelectItem value="5">⭐ 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Faixa */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
                Nível Mínimo
              </label>
              <Select value={filters.faixa} onValueChange={(v) => handleChange("faixa", v)}>
                <SelectTrigger className="border-[#2a3040] bg-[#1b2027] text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="border-[#232832] bg-[#131820]">
                  <SelectItem value="">Todos</SelectItem>
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
              className="gap-1 text-muted-foreground hover:bg-[#1b2027] hover:text-foreground"
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
