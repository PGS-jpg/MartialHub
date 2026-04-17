"use client"

import { useState } from "react"
import { Search, Filter, X, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

interface ProductFiltersProps {
  onFilterChange: (filters: ProductFilterState) => void
}

export interface ProductFilterState {
  search: string
  category: string
  priceRange: [number, number]
  inStock: boolean
}

export function ProductFilters({ onFilterChange }: ProductFiltersProps) {
  const [filters, setFilters] = useState<ProductFilterState>({
    search: "",
    category: "",
    priceRange: [0, 500],
    inStock: false,
  })

  const [showFilters, setShowFilters] = useState(false)

  const handleChange = <K extends keyof ProductFilterState>(
    key: K,
    value: ProductFilterState[K]
  ) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleReset = () => {
    const emptyFilters = {
      search: "",
      category: "",
      priceRange: [0, 500] as [number, number],
      inStock: false,
    }
    setFilters(emptyFilters)
    onFilterChange(emptyFilters)
  }

  const activeFiltersCount = [
    filters.search,
    filters.category,
    filters.inStock,
    filters.priceRange[0] > 0 || filters.priceRange[1] < 500,
  ].filter((v) => v).length

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-6">
      {/* Search Bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
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
          <SlidersHorizontal className="w-4 h-4" />
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
        <div className="space-y-4 pt-4 border-t border-border">
          {/* Category */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block font-semibold">
              Categoria
            </label>
            <Select value={filters.category} onValueChange={(v) => handleChange("category", v)}>
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="">Todas</SelectItem>
                <SelectItem value="uniformes">Uniformes</SelectItem>
                <SelectItem value="luvas">Luvas</SelectItem>
                <SelectItem value="protetor">Protetor</SelectItem>
                <SelectItem value="cordas">Cordas</SelectItem>
                <SelectItem value="bolsas">Bolsas</SelectItem>
                <SelectItem value="acessorios">Acessórios</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div>
            <label className="text-xs text-muted-foreground mb-3 block font-semibold">
              Preço: R$ 0 - R$ {filters.priceRange[1]}
            </label>
            <Slider
              value={filters.priceRange}
              onValueChange={(value) => handleChange("priceRange", [value[0], value[1]])}
              min={0}
              max={500}
              step={10}
              className="w-full"
            />
          </div>

          {/* In Stock Filter */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(e) => handleChange("inStock", e.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-xs text-muted-foreground">Apenas em estoque</span>
            </label>
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
