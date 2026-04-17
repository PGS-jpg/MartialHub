"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Crown, Loader2, ShieldCheck, Wallet } from "lucide-react"
import { TopBar } from "@/components/selestialhub/top-bar"
import { Sidebar } from "@/components/selestialhub/sidebar"
import { BottomNav } from "@/components/selestialhub/bottom-nav"
import { useUser } from "@/context/user-context"

type PlanCode = "athlete_pro" | "academy_premium"

const planCatalog: Record<PlanCode, { title: string; subtitle: string; price: string; period: string; icon: typeof Crown }> = {
  athlete_pro: {
    title: "Atleta PRO",
    subtitle: "Mais performance e visibilidade no ranking",
    price: "R$ 19,90",
    period: "/mês",
    icon: Crown,
  },
  academy_premium: {
    title: "Academia Premium",
    subtitle: "Captação, selo premium e prioridade de exposição",
    price: "R$ 49,90",
    period: "/mês",
    icon: Building2,
  },
}

export default function PaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isPremium, isAcademyPremium, isAuthReady } = useUser()

  const [activeTab, setActiveTab] = useState("perfil")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API_BASE_CANDIDATES = Array.from(
    new Set(
      [
        process.env.NEXT_PUBLIC_API_URL,
        "http://127.0.0.1:5001",
        "http://localhost:5001",
      ].filter((base): base is string => Boolean(base))
    )
  )

  const selectedPlanCode = useMemo<PlanCode>(() => {
    const plan = searchParams.get("plan")
    if (plan === "academy_premium") return "academy_premium"
    return "athlete_pro"
  }, [searchParams])

  const selectedPlan = planCatalog[selectedPlanCode]
  const isSelectedPlanActive = selectedPlanCode === "athlete_pro" ? isPremium : isAcademyPremium

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) {
      router.push("/login")
    }
  }, [isAuthReady, router, user])

  if (!isAuthReady || !user) return null

  const startCheckout = async () => {
    if (!user?.id || isSelectedPlanActive) return

    setError(null)
    setLoading(true)

    try {
      for (const base of API_BASE_CANDIDATES) {
        try {
          const res = await fetch(`${base}/api/payments/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, plan_code: selectedPlanCode }),
          })

          const data = await res.json()
          if (!res.ok || !data.checkout_url) {
            setError(data.error || "Não foi possível iniciar checkout")
            return
          }

          window.location.href = data.checkout_url
          return
        } catch {
          // tenta o próximo backend
        }
      }

      setError("Erro de conexão ao iniciar pagamento")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isOpen={sidebarOpen} />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="lg:ml-64 pb-20 lg:pb-6">
        <div className="mx-auto max-w-4xl space-y-5 p-4 lg:p-6">
          <section className="relative overflow-hidden rounded-3xl border border-[#232832] bg-gradient-to-br from-[#17181b] via-[#111216] to-[#0f1013] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.4)] lg:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#ff5b00]/8 blur-3xl" />

            <button
              type="button"
              onClick={() => router.push("/planos")}
              className="mb-4 inline-flex items-center gap-2 rounded-lg border border-[#2b313b] bg-[#161b23] px-3 py-2 text-sm text-white/85 transition hover:bg-[#1b212b]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para planos
            </button>

            <div className="relative grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-[#232832] bg-[#131820] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff5b00]/10 text-[#ff8a4c]">
                    <selectedPlan.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#ff5b00]">Pagamento seguro</p>
                    <h1 className="font-sans text-2xl font-black uppercase tracking-[0.04em] text-foreground">{selectedPlan.title}</h1>
                    <p className="text-xs text-muted-foreground">{selectedPlan.subtitle}</p>
                  </div>
                </div>

                <p className="font-serif text-5xl font-bold text-foreground">
                  {selectedPlan.price}
                  <span className="ml-1 text-xl text-muted-foreground">{selectedPlan.period}</span>
                </p>

                <div className="mt-5 space-y-2 text-sm text-foreground/85">
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Ativação automática após confirmação do provedor
                  </p>
                  <p className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Ambiente de checkout externo protegido
                  </p>
                  <p className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-400" />
                    Você pode acompanhar o status no retorno do pagamento
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#232832] bg-[#131820] p-5">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Resumo da cobrança</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between text-foreground/90">
                    <span>Plano</span>
                    <span className="font-semibold">{selectedPlan.title}</span>
                  </div>
                  <div className="flex items-center justify-between text-foreground/90">
                    <span>Valor mensal</span>
                    <span className="font-semibold">{selectedPlan.price}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#232832] pt-3 text-foreground">
                    <span>Total agora</span>
                    <span className="text-lg font-bold">{selectedPlan.price}</span>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-xl border border-red-500/25 bg-[#2a1418] px-3 py-2 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div className="mt-5">
                  {isSelectedPlanActive ? (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                      Esse plano já está ativo na sua conta.
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void startCheckout()}
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5b00] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#e65200] disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Iniciando checkout...
                        </>
                      ) : (
                        <>
                          Ir para pagamento
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
