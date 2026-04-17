"use client"

import { useUser } from "@/context/user-context"
import { X, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"

interface AdBannerProps {
  position?: "sidebar" | "inline" | "bottom"
  className?: string
}

const mockAds = [
  {
    id: 1,
    brand: "WHEY GOLD",
    title: "Whey Protein Isolado",
    description: "30% OFF para atletas SelestialHub",
    image: "/api/placeholder/300/200",
    bgGradient: "from-amber-900/30 to-amber-950/50",
    accentColor: "#FFD700",
    cta: "Ver Oferta",
    category: "Suplementos",
  },
  {
    id: 2,
    brand: "FIGHT GEAR",
    title: "Kimonos Profissionais",
    description: "Aprovado pela IBJJF",
    image: "/api/placeholder/300/200",
    bgGradient: "from-blue-900/30 to-blue-950/50",
    accentColor: "#3B82F6",
    cta: "Comprar",
    category: "Equipamentos",
  },
  {
    id: 3,
    brand: "NUTRI FIGHTER",
    title: "Creatina Pura 300g",
    description: "Frete grátis acima de R$150",
    image: "/api/placeholder/300/200",
    bgGradient: "from-green-900/30 to-green-950/50",
    accentColor: "#22C55E",
    cta: "Aproveitar",
    category: "Suplementos",
  },
]

export function AdBanner({ position = "inline", className = "" }: AdBannerProps) {
  const { isPremium } = useUser()
  const [dismissed, setDismissed] = useState(false)
  const [currentAd, setCurrentAd] = useState<typeof mockAds[0] | null>(null)
  useEffect(() => {
    setCurrentAd(mockAds[Math.floor(Math.random() * mockAds.length)])
  }, [])

  // Don't show ads for premium users
  if (isPremium || dismissed || !currentAd) return null

  if (position === "sidebar") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className={`relative bg-gradient-to-br ${currentAd.bgGradient} rounded-xl border border-border overflow-hidden ${className}`}
        >
          {/* Ad Label */}
          <div className="absolute top-2 left-2 z-10">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
              Patrocinado
            </span>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-background/80 hover:bg-background transition-colors"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>

          <div className="p-4 pt-8">
            {/* Brand */}
            <div 
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: currentAd.accentColor }}
            >
              {currentAd.brand}
            </div>

            {/* Title */}
            <h4 className="font-serif font-bold text-base uppercase tracking-wide text-foreground mb-1">
              {currentAd.title}
            </h4>

            {/* Description */}
            <p className="text-xs text-muted-foreground mb-4">
              {currentAd.description}
            </p>

            {/* CTA */}
            <button
              className="w-full py-2.5 rounded-lg font-serif font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              style={{ 
                backgroundColor: currentAd.accentColor,
                color: "#000"
              }}
            >
              {currentAd.cta}
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Decorative Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTIwIDIwaDIwdjIwSDIweiIvPjwvZz48L2c+PC9zdmc+')] opacity-50 pointer-events-none" />
        </motion.div>
      </AnimatePresence>
    )
  }

  if (position === "bottom") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`relative bg-gradient-to-r ${currentAd.bgGradient} rounded-xl border border-border overflow-hidden ${className}`}
        >
          {/* Close Button */}
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-background/80 hover:bg-background transition-colors"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>

          <div className="flex items-center gap-4 p-4">
            {/* Ad Label */}
            <span className="absolute top-3 left-3 text-[9px] uppercase tracking-wider text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
              Patrocinado
            </span>

            <div className="flex-1 pt-4">
              <div className="flex items-center gap-3">
                <div 
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: currentAd.accentColor }}
                >
                  {currentAd.brand}
                </div>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {currentAd.category}
                </span>
              </div>
              <h4 className="font-serif font-bold text-lg uppercase tracking-wide text-foreground mt-1">
                {currentAd.title}
              </h4>
              <p className="text-sm text-muted-foreground">
                {currentAd.description}
              </p>
            </div>

            <button
              className="shrink-0 px-6 py-3 rounded-xl font-serif font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2"
              style={{ 
                backgroundColor: currentAd.accentColor,
                color: "#000"
              }}
            >
              {currentAd.cta}
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Inline (default)
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={`relative bg-gradient-to-r ${currentAd.bgGradient} rounded-xl border border-border overflow-hidden ${className}`}
      >
        {/* Ad Label */}
        <div className="absolute top-2 left-2 z-10">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
            Patrocinado
          </span>
        </div>

        {/* Close Button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-background/80 hover:bg-background transition-colors"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-3 p-3 pt-6">
          <div className="flex-1 min-w-0">
            <div 
              className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
              style={{ color: currentAd.accentColor }}
            >
              {currentAd.brand}
            </div>
            <h4 className="font-serif font-bold text-sm uppercase tracking-wide text-foreground truncate">
              {currentAd.title}
            </h4>
            <p className="text-[11px] text-muted-foreground truncate">
              {currentAd.description}
            </p>
          </div>

          <button
            className="shrink-0 px-4 py-2 rounded-lg font-serif font-bold text-xs uppercase tracking-wider transition-all"
            style={{ 
              backgroundColor: currentAd.accentColor,
              color: "#000"
            }}
          >
            {currentAd.cta}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Sidebar Ad Space Component (for desktop layout)
export function SidebarAdSpace() {
  const { isPremium } = useUser()

  if (isPremium) return null

  return (
    <div className="hidden xl:block fixed right-4 top-24 w-64 space-y-4 z-40">
      <AdBanner position="sidebar" />
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground">
          Remova anúncios com o <span className="text-[#FFD700]">Plano Mestre</span>
        </p>
      </div>
    </div>
  )
}
