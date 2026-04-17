"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Building2, Check, Crown, ShieldCheck, Sparkles, Target } from "lucide-react"
import { TopBar } from "@/components/selestialhub/top-bar"
import { Sidebar } from "@/components/selestialhub/sidebar"
import { BottomNav } from "@/components/selestialhub/bottom-nav"
import { useUser } from "@/context/user-context"

const athleteFeatures = [
  "Desafios ilimitados",
  "Sem anúncios",
  "Destaque no ranking",
  "Prioridade em novos recursos",
]

const academyFeatures = [
  "Cadastro de academias",
  "Selo de academia premium",
  "Prioridade na busca",
  "Gestão de visibilidade para captação",
]

export default function PlansPage() {
  const router = useRouter()
  const { user, isPremium, isAcademyPremium, isAuthReady } = useUser()
  const [activeTab, setActiveTab] = useState("perfil")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) {
      router.push("/login")
    }
  }, [isAuthReady, router, user])

  if (!isAuthReady || !user) return null

    const planCards = [
      {
        code: "athlete_pro" as const,
        title: "Atleta PRO",
        subtitle: "Para atletas que querem acelerar evolução e visibilidade",
        price: "R$ 19,90",
        period: "/mês",
        icon: Crown,
        features: athleteFeatures,
        highlighted: false,
        active: isPremium,
        buttonText: "Assinar Atleta PRO",
        accent: "text-primary",
        container: "bg-[#131820] border-[#232832]",
        button: "bg-[#ff5b00] text-white hover:bg-[#e65200]",
        iconTone: "bg-[#ff5b00]/10 text-[#ff8a4c]",
      },
      {
        code: "academy_premium" as const,
        title: "Academia Premium",
        subtitle: "Para quem quer captar alunos e destacar a academia",
        price: "R$ 49,90",
        period: "/mês",
        icon: Building2,
        features: academyFeatures,
        highlighted: true,
        active: isAcademyPremium,
        buttonText: "Assinar Academia Premium",
        accent: "text-yellow-300",
        container: "bg-gradient-to-br from-[#2a230f] via-[#151820] to-[#131820] border-[#6b560f]",
        button: "bg-[#FFD700] text-black hover:bg-[#ffd429]",
        iconTone: "bg-[#FFD700]/15 text-[#FFD700]",
      },
    ]

    return (
      <main className="min-h-screen bg-background">
        <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isOpen={sidebarOpen} />
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="lg:ml-64 pb-20 lg:pb-6">
          <div className="mx-auto max-w-[1360px] space-y-5 p-4 lg:p-6">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#17181b] via-[#111216] to-[#0f1013] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.4)] lg:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#ff5b00]/8 blur-3xl" />
              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#ff5b00]">Planos de crescimento</p>
                  <h1 className="mt-3 font-sans text-3xl font-black uppercase tracking-tight text-white lg:text-5xl">
                    Assine para escalar resultado
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm text-white/65 lg:text-base">
                    Escolha o plano certo para atleta ou academia e transforme o uso da plataforma em resultado competitivo e comercial.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[560px]">
                  {[
                    { label: "Checkout imediato", value: "Pagamento direto sem etapas extras", icon: Target, tone: "bg-[#ff5b00]/10 text-[#ff8a4c]" },
                    { label: "Confiabilidade", value: "Ambiente seguro e ativação automática", icon: ShieldCheck, tone: "bg-emerald-500/10 text-emerald-400" },
                    { label: "Retorno prático", value: "Mais visibilidade, prioridade e presença", icon: Sparkles, tone: "bg-yellow-500/10 text-yellow-300" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
                      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/85">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {planCards.map((plan) => (
                <div key={plan.code} className={`relative rounded-3xl border p-6 shadow-[0_12px_30px_rgba(0,0,0,0.32)] ${plan.container}`}>
                  {plan.highlighted && (
                    <span className="absolute right-4 top-4 rounded-full border border-[#6b560f] bg-[#FFD700]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#FFD700]">
                      Melhor para negócios
                    </span>
                  )}

                  <div className="mb-4 flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${plan.iconTone}`}>
                      <plan.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-sans text-2xl font-black uppercase tracking-[0.04em] text-foreground">{plan.title}</h2>
                      <p className="text-xs text-muted-foreground">{plan.subtitle}</p>
                    </div>
                  </div>

                  <p className="font-serif text-5xl font-bold text-foreground">
                    {plan.price}
                    <span className="ml-1 text-xl text-muted-foreground">{plan.period}</span>
                  </p>

                  <ul className="mt-5 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    {plan.active ? (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        Plano ativo na sua conta.
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => router.push(`/pagamento?plan=${plan.code}`)}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${plan.button}`}
                      >
                        {plan.buttonText}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-3xl border border-[#232832] bg-[#131820] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
              <h3 className="font-sans text-lg font-black uppercase tracking-[0.06em] text-foreground">Comparativo rápido</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="border-b border-[#232832] text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3">Recurso</th>
                      <th className="py-2 pr-3">Atleta PRO</th>
                      <th className="py-2">Academia Premium</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232832]">
                    {[
                      ["Sem anúncios", "Sim", "Sim"],
                      ["Destaque de perfil", "Sim", "Sim"],
                      ["Cadastro de academias", "Não", "Sim"],
                      ["Prioridade na busca", "Parcial", "Sim"],
                      ["Foco principal", "Performance atleta", "Captação da academia"],
                    ].map((row) => (
                      <tr key={row[0]}>
                        <td className="py-2.5 pr-3 text-foreground">{row[0]}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{row[1]}</td>
                        <td className="py-2.5 text-muted-foreground">{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>
    )
}
