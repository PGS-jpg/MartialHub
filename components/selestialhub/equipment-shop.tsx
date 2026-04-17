"use client"

import { useState, useRef } from "react"
import { ShoppingBag, ExternalLink, ChevronLeft, ChevronRight, Tag, Star } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const products = [
  {
    id: 1,
    name: "Kimono Premium A4",
    brand: "Keiko",
    price: 499.90,
    originalPrice: 649.90,
    rating: 4.8,
    reviews: 234,
    image: "🥋",
    category: "BJJ",
    discount: 23,
    affiliateUrl: "#",
  },
  {
    id: 2,
    name: "Luvas Muay Thai 14oz",
    brand: "Pretorian",
    price: 289.90,
    originalPrice: null,
    rating: 4.6,
    reviews: 156,
    image: "🥊",
    category: "Muay Thai",
    discount: null,
    affiliateUrl: "#",
  },
  {
    id: 3,
    name: "Protetor Bucal Pro",
    brand: "Shock Doctor",
    price: 149.90,
    originalPrice: 189.90,
    rating: 4.9,
    reviews: 412,
    image: "🦷",
    category: "Proteção",
    discount: 21,
    affiliateUrl: "#",
  },
  {
    id: 4,
    name: "Caneleira MMA Elite",
    brand: "Venum",
    price: 379.90,
    originalPrice: 449.90,
    rating: 4.7,
    reviews: 89,
    image: "🦵",
    category: "MMA",
    discount: 15,
    affiliateUrl: "#",
  },
  {
    id: 5,
    name: "Rashguard Comp.",
    brand: "Bad Boy",
    price: 179.90,
    originalPrice: null,
    rating: 4.5,
    reviews: 178,
    image: "👕",
    category: "BJJ",
    discount: null,
    affiliateUrl: "#",
  },
  {
    id: 6,
    name: "Bandagem Elástica 4m",
    brand: "Everlast",
    price: 39.90,
    originalPrice: 59.90,
    rating: 4.4,
    reviews: 523,
    image: "🩹",
    category: "Boxe",
    discount: 33,
    affiliateUrl: "#",
  },
]

export function EquipmentShop() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
      setTimeout(checkScroll, 300)
    }
  }

  return (
    <section className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif font-bold text-xl uppercase tracking-wide flex items-center gap-2 text-foreground">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Loja de Equipamentos
          </h2>
          <p className="text-sm text-muted-foreground">Ofertas exclusivas para membros</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-border hover:bg-muted disabled:opacity-30 text-foreground"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-border hover:bg-muted disabled:opacity-30 text-foreground"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Products Carousel */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 lg:mx-0 lg:px-0"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="flex-shrink-0 w-[200px] sm:w-[220px] bg-card rounded-xl border border-border overflow-hidden hover:border-primary/30 transition-all group"
            style={{ scrollSnapAlign: "start" }}
          >
            {/* Product Image */}
            <div className="relative h-32 bg-muted/50 flex items-center justify-center">
              <span className="text-5xl">{product.image}</span>
              {product.discount && (
                <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px]">
                  <Tag className="w-3 h-3 mr-1" />
                  -{product.discount}%
                </Badge>
              )}
            </div>

            {/* Product Info */}
            <div className="p-3">
              <Badge variant="secondary" className="text-[9px] mb-2 bg-muted text-muted-foreground">
                {product.category}
              </Badge>
              <h3 className="font-semibold text-sm mb-1 line-clamp-1 text-foreground">{product.name}</h3>
              <p className="text-xs text-muted-foreground mb-2">{product.brand}</p>
              
              {/* Rating */}
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-3 h-3 text-[#FFD700] fill-[#FFD700]" />
                <span className="text-xs font-medium text-foreground">{product.rating}</span>
                <span className="text-xs text-muted-foreground">({product.reviews})</span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="font-serif font-bold text-lg text-primary">
                  R$ {product.price.toFixed(2).replace(".", ",")}
                </span>
                {product.originalPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    R$ {product.originalPrice.toFixed(2).replace(".", ",")}
                  </span>
                )}
              </div>

              {/* CTA */}
              <Button
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium"
                asChild
              >
                <a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer">
                  Comprar
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Affiliate Disclosure */}
      <p className="text-[10px] text-muted-foreground mt-4 text-center">
        * Links de afiliados. SelestialHub pode receber comissão por compras realizadas.
      </p>
    </section>
  )
}
