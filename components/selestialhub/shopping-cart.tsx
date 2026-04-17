"use client"

import { useState, useMemo } from "react"
import { Trash2, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface CartItem {
  id: number
  name: string
  price: number
  originalPrice?: number
  quantity: number
  category: string
}

interface ShoppingCartProps {
  items: CartItem[]
  onUpdateQuantity: (productId: number, quantity: number) => void
  onRemoveItem: (productId: number) => void
  onCheckout: () => void
}

export function ShoppingCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: ShoppingCartProps) {
  if (items.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground mb-4">Seu carrinho está vazio</p>
        <p className="text-sm text-muted-foreground">
          Adicione produtos para começar suas compras!
        </p>
      </div>
    )
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discount = items.reduce(
    (sum, item) => {
      if (item.originalPrice) {
        return sum + (item.originalPrice - item.price) * item.quantity
      }
      return sum
    },
    0
  )
  const shipping = subtotal > 100 ? 0 : 15
  const total = subtotal + shipping

  return (
    <div className="space-y-6">
      {/* Cart Items */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 border-b border-border last:border-b-0"
            >
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground mb-1">{item.name}</h4>
                <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">
                  {item.category}
                </Badge>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Price */}
              <div className="text-right w-24">
                <p className="font-semibold text-sm text-foreground">
                  R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                </p>
                {item.originalPrice && (
                  <p className="text-xs text-muted-foreground line-through">
                    R$ {(item.originalPrice * item.quantity).toFixed(2).replace(".", ",")}
                  </p>
                )}
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => onRemoveItem(item.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal:</span>
          <span className="text-foreground">
            R$ {subtotal.toFixed(2).replace(".", ",")}
          </span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-green-500">Desconto:</span>
            <span className="text-green-500">
              -R$ {discount.toFixed(2).replace(".", ",")}
            </span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Frete:</span>
          <span className="text-foreground">
            {shipping === 0 ? (
              <span className="text-green-500 font-semibold">Grátis</span>
            ) : (
              `R$ ${shipping.toFixed(2).replace(".", ",")}`
            )}
          </span>
        </div>

        <div className="border-t border-border pt-3 flex justify-between">
          <span className="font-semibold text-foreground">Total:</span>
          <span className="font-serif font-bold text-lg text-primary">
            R$ {total.toFixed(2).replace(".", ",")}
          </span>
        </div>

        {shipping === 0 && (
          <p className="text-xs text-green-500 text-center">
            ✓ Frete grátis para compras acima de R$ 100
          </p>
        )}

        <Button
          onClick={onCheckout}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-serif uppercase tracking-wide"
        >
          Ir para Checkout
        </Button>
      </div>
    </div>
  )
}
