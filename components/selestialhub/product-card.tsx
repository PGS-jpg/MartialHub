"use client"

import { ShoppingCart, Star, Heart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ProductCardProps {
  id: number
  name: string
  category: string
  price: number
  originalPrice?: number
  image: string
  rating: number
  reviews: number
  inStock: boolean
  discount?: number
  onAddToCart: (productId: number) => void
}

export function ProductCard({
  id,
  name,
  category,
  price,
  originalPrice,
  image,
  rating,
  reviews,
  inStock,
  discount,
  onAddToCart,
}: ProductCardProps) {
  const discountPercentage = discount || (originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0)

  return (
    <Card className="bg-card border-border overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg flex flex-col">
      {/* Image Container */}
      <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center overflow-hidden">
        {/* Badge desconto */}
        {discountPercentage > 0 && (
          <Badge className="absolute top-2 left-2 bg-red-500 text-white hover:bg-red-600 gap-1">
            -{discountPercentage}%
          </Badge>
        )}

        {/* Wishlist Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/10 hover:bg-white/20"
        >
          <Heart className="w-4 h-4 text-white" />
        </Button>

        {/* Product Image Placeholder */}
        <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-4xl font-serif font-bold text-primary-foreground">
          {name.charAt(0)}
        </div>

        {/* Stock Badge */}
        {!inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold">Fora de Estoque</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Category */}
        <Badge variant="secondary" className="w-fit mb-2 bg-muted text-muted-foreground text-[10px]">
          {category}
        </Badge>

        {/* Name */}
        <h3 className="font-serif font-bold text-sm uppercase tracking-wide text-foreground mb-2 flex-1">
          {name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-0.5">
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
          <span className="text-xs text-muted-foreground">({reviews})</span>
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="font-serif font-bold text-lg text-foreground">
              R$ {price.toFixed(2).replace(".", ",")}
            </span>
            {originalPrice && (
              <span className="text-xs text-muted-foreground line-through">
                R$ {originalPrice.toFixed(2).replace(".", ",")}
              </span>
            )}
          </div>
        </div>

        {/* Add to Cart Button */}
        <Button
          onClick={() => onAddToCart(id)}
          disabled={!inStock}
          className={`w-full gap-2 ${
            inStock
              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
          size="sm"
        >
          <ShoppingCart className="w-4 h-4" />
          {inStock ? "Adicionar ao Carrinho" : "Indisponível"}
        </Button>
      </div>
    </Card>
  )
}
