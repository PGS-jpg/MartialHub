"use client"

import { useState } from "react"
import { Crown, Check, Zap, X, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUser } from "@/context/user-context"

type Step = "plans" | "loading"

const benefits = {
  guerreiro: [
    { text: "3 desafios por dia", included: true },
    { text: "Anúncios laterais", included: true },
    { text: "Ranking básico", included: true },
    { text: "Ver quem te desafiou", included: false },
    { text: "Destaque no ranking", included: false },
    { text: "Suporte prioritário", included: false },
  ],
  mestre: [
    { text: "Desafios ilimitados", included: true },
    { text: "Sem anúncios", included: true },
    { text: "Ranking nacional", included: true },
    { text: "Ver quem te desafiou", included: true },
    { text: "Destaque no ranking", included: true },
    { text: "Suporte prioritário", included: true },
  ],
}

const plans = [
  {
    id: "guerreiro",
    name: "Guerreiro",
    subtitle: "Plano Gratuito",
    price: 0,
    period: "",
    description: "Para quem está começando",
    popular: false,
    features: benefits.guerreiro,
    buttonText: "Plano Atual",
    disabled: true,
  },
  {
    id: "mestre",
    name: "Mestre",
    subtitle: "Plano Premium",
    price: 19.90,
    period: "/mês",
    description: "Para atletas sérios",
    popular: true,
    features: benefits.mestre,
    buttonText: "Assinar Agora",
    disabled: false,
  },
]

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [step, setStep] = useState<Step>("plans")
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const { updateUser, isPremium, user } = useUser()

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

  const handleSubscribe = async (planId: string) => {
    if (planId === "guerreiro" || !user) return

    setSelectedPlan(planId)
    setStep("loading")

    try {
      const res = await fetch(`${API_BASE}/api/plans/athlete/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: Number(user.id) }),
      })

      const data = await res.json()

      if (!res.ok || !data.user) {
        alert(data.error || "Não foi possível ativar o plano")
        setStep("plans")
        return
      }

      updateUser(data.user)
      alert("Plano PRO ativado com sucesso!")
      handleClose()
    } catch {
      alert("Erro de conexão ao ativar plano")
      setStep("plans")
    }
  }

  const handleClose = () => {
    onClose()
    // Reset after animation
    setTimeout(() => {
      setStep("plans")
      setSelectedPlan(null)
    }, 200)
  }

  // If already premium, show success state
  if (isPremium && isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <div className="py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center mx-auto mb-6">
              <Crown className="w-10 h-10 text-[#000]" />
            </div>
            <h3 className="font-serif text-2xl uppercase tracking-wide text-foreground mb-2">
              Você já é PRO!
            </h3>
            <p className="text-muted-foreground mb-6">
              Aproveite todos os benefícios exclusivos do Plano Mestre.
            </p>
            <Button onClick={handleClose} className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#000] font-serif uppercase tracking-wide">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* Plans Step */}
          {step === "plans" && (
            <motion.div
              key="plans"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Header */}
              <div className="relative bg-gradient-to-br from-[#FFD700]/20 via-primary/20 to-[#FFD700]/10 p-6 pb-8">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                  onClick={handleClose}
                >
                  <X className="w-5 h-5" />
                </Button>
                
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-lg">
                    <Crown className="w-6 h-6 text-[#000]" />
                  </div>
                  <div>
                    <DialogHeader>
                      <DialogTitle className="font-serif text-2xl uppercase tracking-wide text-foreground">
                        Escolha seu Plano
                      </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                      Desbloqueie todo o potencial da plataforma
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Plans Comparison */}
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`relative rounded-2xl border-2 p-5 transition-all ${
                        plan.popular
                          ? "border-[#FFD700] bg-[#FFD700]/5"
                          : "border-border bg-muted/20"
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFD700] text-[#000] text-[10px] font-bold uppercase px-3 py-1 rounded-full">
                          Recomendado
                        </div>
                      )}

                      {/* Plan Header */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          {plan.popular ? (
                            <Crown className="w-5 h-5 text-[#FFD700]" />
                          ) : (
                            <Zap className="w-5 h-5 text-muted-foreground" />
                          )}
                          <h3 className="font-serif font-bold text-lg uppercase tracking-wide text-foreground">
                            {plan.name}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                      </div>

                      {/* Price */}
                      <div className="mb-4">
                        {plan.price === 0 ? (
                          <div className="flex items-baseline">
                            <span className="font-serif font-bold text-3xl text-foreground">Grátis</span>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm text-muted-foreground">R$</span>
                            <span className="font-serif font-bold text-3xl text-foreground">
                              {plan.price.toFixed(2).replace(".", ",")}
                            </span>
                            <span className="text-sm text-muted-foreground">{plan.period}</span>
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <ul className="space-y-2 mb-5">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            {feature.included ? (
                              <Check className="w-4 h-4 text-green-500 shrink-0" />
                            ) : (
                              <X className="w-4 h-4 text-red-500/50 shrink-0" />
                            )}
                            <span className={feature.included ? "text-foreground" : "text-muted-foreground line-through"}>
                              {feature.text}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      <Button
                        className={`w-full font-serif uppercase tracking-wide ${
                          plan.popular
                            ? "bg-gradient-to-r from-[#FFD700] to-[#FFA500] hover:from-[#FFD700]/90 hover:to-[#FFA500]/90 text-[#000]"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        }`}
                        disabled={plan.disabled}
                        onClick={() => handleSubscribe(plan.id)}
                      >
                        {plan.buttonText}
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Trust Signals */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Cancele quando quiser
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Pagamento via PIX
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Ativação instantânea
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading Step */}
          {step === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-16 px-6 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <h3 className="font-serif text-xl uppercase tracking-wide text-foreground mb-2">
                Processando...
              </h3>
              <p className="text-sm text-muted-foreground">
                Aguarde enquanto preparamos seu pagamento
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
