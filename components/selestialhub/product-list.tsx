"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpDown,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
} from "lucide-react"
import { ShoppingCart as ShoppingCartComponent, type CartItem } from "./shopping-cart"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const products = [
  { id: 1, name: "Kimono BJJ Premium", category: "uniformes", price: 189.9, originalPrice: 249.9, rating: 4.8, reviews: 234, inStock: true },
  { id: 2, name: "Luvas de Boxe 12oz", category: "luvas", price: 129.9, originalPrice: 159.9, rating: 4.6, reviews: 156, inStock: true },
  { id: 3, name: "Protetor Bucal", category: "protetor", price: 39.9, rating: 4.5, reviews: 89, inStock: true },
  { id: 4, name: "Corda de Pular Premium", category: "cordas", price: 49.9, originalPrice: 69.9, rating: 4.7, reviews: 123, inStock: true },
  { id: 5, name: "Bolsa de Equipamentos", category: "bolsas", price: 99.9, originalPrice: 129.9, rating: 4.4, reviews: 76, inStock: true },
  { id: 6, name: "Faixa BJJ Branca", category: "acessorios", price: 29.9, rating: 4.8, reviews: 312, inStock: true },
  { id: 7, name: "Shorts de Muay Thai", category: "uniformes", price: 79.9, originalPrice: 99.9, rating: 4.5, reviews: 145, inStock: false },
  { id: 8, name: "Protetor de Canela", category: "protetor", price: 59.9, rating: 4.6, reviews: 98, inStock: true },
  { id: 9, name: "Luvas de Muay Thai 16oz", category: "luvas", price: 149.9, originalPrice: 189.9, rating: 4.9, reviews: 178, inStock: true },
  { id: 10, name: "Mochila de Atleta", category: "bolsas", price: 139.9, rating: 4.7, reviews: 134, inStock: true },
  { id: 11, name: "Fita de Pulso", category: "acessorios", price: 19.9, rating: 4.4, reviews: 67, inStock: true },
  { id: 12, name: "Knee Pad Premium", category: "protetor", price: 79.9, originalPrice: 99.9, rating: 4.6, reviews: 112, inStock: true },
]

type ProductCategory = "all" | "uniformes" | "luvas" | "protetor" | "cordas" | "bolsas" | "acessorios"
type ProductSort = "relevance" | "price_asc" | "price_desc" | "rating_desc"

interface ProductFilterState {
  search: string
  category: ProductCategory
  inStock: boolean
  maxPrice: number
  sortBy: ProductSort
}

const categoryLabel: Record<ProductCategory, string> = {
  all: "Todas",
  uniformes: "Uniformes",
  luvas: "Luvas",
  protetor: "Proteção",
  cordas: "Condicionamento",
  bolsas: "Bolsas",
  acessorios: "Acessórios",
}

const categoryAccent: Record<string, string> = {
  uniformes: "bg-[#7f1d1d]/20 text-[#fca5a5] border-[#7f1d1d]/40",
  luvas: "bg-[#1e3a8a]/20 text-[#93c5fd] border-[#1e3a8a]/40",
  protetor: "bg-[#155e75]/20 text-[#67e8f9] border-[#155e75]/40",
  cordas: "bg-[#365314]/20 text-[#bef264] border-[#365314]/40",
  bolsas: "bg-[#581c87]/20 text-[#d8b4fe] border-[#581c87]/40",
  acessorios: "bg-[#78350f]/20 text-[#fdba74] border-[#78350f]/40",
}

export function ProductList() {
  const [filters, setFilters] = useState<ProductFilterState>({
    search: "",
    category: "all",
    inStock: false,
    maxPrice: 500,
    sortBy: "relevance",
  })
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartStorageError, setCartStorageError] = useState<string | null>(null)
  const [showCart, setShowCart] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("selestialhub_cart")
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setCartItems(parsed)
      }
    } catch {
      setCartStorageError("Não foi possível recuperar o carrinho salvo")
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("selestialhub_cart", JSON.stringify(cartItems))
      setCartStorageError(null)
    } catch {
      setCartStorageError("Não foi possível salvar o carrinho neste navegador")
    }
  }, [cartItems])

  const bestSeller = useMemo(() => [...products].sort((a, b) => b.reviews - a.reviews)[0], [])
  const featuredDeals = useMemo(() => {
    return [...products]
      .filter((product) => product.originalPrice && product.originalPrice > product.price)
      .sort((a, b) => {
        const saveA = (a.originalPrice ?? a.price) - a.price
        const saveB = (b.originalPrice ?? b.price) - b.price
        return saveB - saveA
      })
      .slice(0, 2)
  }, [])

  const filteredProducts = useMemo(() => {
    const base = products.filter((product) => {
      if (filters.search && !product.name.toLowerCase().includes(filters.search.toLowerCase())) return false
      if (filters.category !== "all" && product.category !== filters.category) return false
      if (product.price > filters.maxPrice) return false
      if (filters.inStock && !product.inStock) return false
      return true
    })

    if (filters.sortBy === "price_asc") return [...base].sort((a, b) => a.price - b.price)
    if (filters.sortBy === "price_desc") return [...base].sort((a, b) => b.price - a.price)
    if (filters.sortBy === "rating_desc") return [...base].sort((a, b) => b.rating - a.rating)
    return base
  }, [filters])

  const cartCount = useMemo(() => cartItems.reduce((total, item) => total + item.quantity, 0), [cartItems])

  const handleAddToCart = (productId: number) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === productId)
      if (existing) {
        return prev.map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          quantity: 1,
          category: product.category,
        },
      ]
    })
  }

  const handleUpdateQuantity = (productId: number, quantity: number) => {
    setCartItems((prev) => prev.map((item) => (item.id === productId ? { ...item, quantity } : item)))
  }

  const handleRemoveItem = (productId: number) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId))
  }

  const handleCheckout = () => {
    alert("Redirecionando para checkout...")
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      category: "all",
      inStock: false,
      maxPrice: 500,
      sortBy: "relevance",
    })
  }

  const activeFilters = Number(filters.category !== "all") + Number(filters.inStock) + Number(filters.maxPrice < 500)
  const topDeal = featuredDeals[0]
  const topDealSavings = topDeal && topDeal.originalPrice
    ? (topDeal.originalPrice - topDeal.price)
    : null

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
      <div className="space-y-5 lg:col-span-3">
        {cartStorageError && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
            {cartStorageError}
          </div>
        )}

        {/* Destaques rápidos */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Mais vendido</p>
              <Star className="h-4 w-4 text-yellow-400" />
            </div>
            <p className="mt-2 line-clamp-1 font-serif text-sm font-bold text-foreground">{bestSeller?.name}</p>
            <p className="text-xs text-muted-foreground">{bestSeller?.reviews} avaliações</p>
          </div>
          <div className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Melhor oferta</p>
              <Sparkles className="h-4 w-4 text-orange-400" />
            </div>
            <p className="mt-2 line-clamp-1 font-serif text-sm font-bold text-foreground">{topDeal?.name ?? "--"}</p>
            {topDealSavings !== null && (
              <p className="text-xs text-emerald-400">-R$ {topDealSavings.toFixed(2).replace(".", ",")}</p>
            )}
          </div>
          <div className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Produtos</p>
              <PackageCheck className="h-4 w-4 text-sky-400" />
            </div>
            <p className="mt-2 font-serif text-3xl font-bold text-foreground">{products.length}</p>
            <p className="text-xs text-muted-foreground">no catálogo</p>
          </div>
          <div className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Frete grátis</p>
              <Truck className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 font-serif text-xl font-bold text-foreground">R$ 100+</p>
            <p className="text-xs text-muted-foreground">entrega garantida</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-9 bg-[#1b2027] border-[#2a3040]"
              />
            </div>

            <Select value={filters.sortBy} onValueChange={(value) => setFilters((prev) => ({ ...prev, sortBy: value as ProductSort }))}>
              <SelectTrigger className="w-full bg-[#1b2027] border-[#2a3040]">
                <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevância</SelectItem>
                <SelectItem value="price_asc">Menor preço</SelectItem>
                <SelectItem value="price_desc">Maior preço</SelectItem>
                <SelectItem value="rating_desc">Melhor avaliação</SelectItem>
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, inStock: !prev.inStock }))}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filters.inStock
                  ? "bg-[#ff5b00] text-white"
                  : "bg-[#1b2027] text-muted-foreground hover:bg-[#242b36]"
              }`}
            >
              {filters.inStock ? "Somente em estoque" : "Mostrar todos"}
            </button>
          </div>

          {/* Categorias */}
          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(categoryLabel) as ProductCategory[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, category: key }))}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filters.category === key
                    ? "bg-[#ff5b00] text-white"
                    : "bg-[#1b2027] text-muted-foreground hover:bg-[#242b36]"
                }`}
              >
                {categoryLabel[key]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preço até <span className="text-foreground">R$ {filters.maxPrice}</span>
              </label>
              <input
                type="range"
                min={20}
                max={500}
                step={10}
                value={filters.maxPrice}
                onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: Number(e.target.value) }))}
                className="w-full accent-[#ff5b00]"
              />
            </div>
            {activeFilters > 0 && (
              <button type="button" onClick={clearFilters} className="shrink-0 rounded-lg bg-[#1b2027] px-3 py-2 text-xs text-muted-foreground hover:bg-[#242b36]">
                Limpar ({activeFilters})
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filteredProducts.length}</span> produto{filteredProducts.length !== 1 ? "s" : ""}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Compra segura
          </p>
        </div>

        {/* Grid de produtos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const discount = product.originalPrice
              ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
              : 0

            return (
              <article
                key={product.id}
                className="group overflow-hidden rounded-2xl border border-[#232832] bg-[#131820] shadow-[0_12px_30px_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:border-[#ff5b00]/40"
              >
                {/* Imagem / placeholder */}
                <div className="relative h-44 bg-gradient-to-br from-[#1a1f28] via-[#151a22] to-[#0f1318]">
                  {discount > 0 && (
                    <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">-{discount}%</span>
                  )}
                  <span className={`absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${categoryAccent[product.category] ?? "bg-[#1b2027] text-muted-foreground border-transparent"}`}>
                    {categoryLabel[product.category as ProductCategory] ?? product.category}
                  </span>
                  <div className="flex h-full items-center justify-center">
                    <span className="font-serif text-5xl font-bold text-[#ff5b00]/60">{product.name.charAt(0)}</span>
                  </div>
                  {!product.inStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                      <span className="rounded-lg bg-[#1b2027] px-3 py-1.5 text-xs font-bold text-muted-foreground">Fora de estoque</span>
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="p-4 space-y-3">
                  <h3 className="line-clamp-2 font-sans text-sm font-bold uppercase tracking-wide text-foreground">{product.name}</h3>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-semibold text-foreground">{product.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">({product.reviews})</span>
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="font-serif text-2xl font-bold text-[#ff5b00]">R$ {product.price.toFixed(2).replace(".", ",")}</p>
                      {product.originalPrice && (
                        <p className="text-xs text-muted-foreground line-through">R$ {product.originalPrice.toFixed(2).replace(".", ",")}</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleAddToCart(product.id)}
                      disabled={!product.inStock}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff5b00] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#e65200] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Comprar
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Tente ajustar os filtros de busca</p>
          </div>
        )}

        {/* Garantias */}
        <div className="rounded-2xl border border-[#232832] bg-[#131820] p-4">
          <div className="flex flex-wrap items-center gap-5">
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Truck className="h-4 w-4 text-emerald-400" />
              Frete grátis acima de R$ 100
            </span>
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-sky-400" />
              Checkout protegido
            </span>
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <PackageCheck className="h-4 w-4 text-orange-400" />
              Produtos selecionados semanalmente
            </span>
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-20 space-y-3">
          {/* Toggle carrinho mobile */}
          <div className="flex items-center justify-between lg:hidden">
            <h3 className="font-sans text-base font-bold uppercase tracking-wide text-foreground">Carrinho</h3>
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#1b2027] text-muted-foreground hover:bg-[#242b36]"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center gap-0.5 rounded-full border border-[#2b3038] bg-[#ff5b00] px-1 py-0.5 text-[10px] font-bold leading-none text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          {showCart && (
            <ShoppingCartComponent
              items={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onCheckout={handleCheckout}
            />
          )}

          {!showCart && cartCount > 0 && (
            <button
              onClick={() => setShowCart(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5b00] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e65200]"
            >
              <ShoppingCart className="h-4 w-4" />
              Ver carrinho ({cartCount})
            </button>
          )}

          <div className="hidden lg:block">
            <ShoppingCartComponent
              items={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
