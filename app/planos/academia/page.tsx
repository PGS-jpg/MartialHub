"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Crown, ShieldCheck, Building2, Check } from "lucide-react"
import { TopBar } from "@/components/selestialhub/top-bar"
import { Sidebar } from "@/components/selestialhub/sidebar"
import { BottomNav } from "@/components/selestialhub/bottom-nav"
import { Button } from "@/components/ui/button"
import { useUser } from "@/context/user-context"

const planFeatures = [
  "Cadastro ilimitado de academias",
  "Destaque premium no mapa",
  "Selo oficial de academia verificada",
  "Prioridade na vitrine de busca",
  "Suporte dedicado para negócios",
]

export default function AcademyPlanPage() {
  const router = useRouter()
  const { user, isAcademyPremium, isAuthReady } = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("academias")

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) {
      router.push("/login")
    }
  }, [isAuthReady, router, user])

  if (!isAuthReady || !user) return null

  const handleSubscribe = () => {
    router.push("/pagamento?plan=academy_premium")
  }

  return (
    <main className="min-h-screen bg-background">
      <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isOpen={sidebarOpen} />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="lg:ml-64 pb-20 lg:pb-6 p-4 lg:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-[#FFD700]/35 bg-gradient-to-br from-[#FFD700]/15 via-card to-primary/10 p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#FFD700] text-[#000] flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-serif text-2xl lg:text-3xl font-bold uppercase tracking-wide text-foreground">
                  Plano Premium Academia
                </h1>
                <p className="text-sm text-muted-foreground">Plano focado em negócios e captação de alunos</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-4xl font-serif font-bold text-foreground">R$ 49,90<span className="text-base text-muted-foreground">/mês</span></p>
              <p className="text-xs text-muted-foreground mt-1">Ativação imediata para publicar academias</p>
            </div>

            <ul className="space-y-2 mb-6">
              {planFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>

            {isAcademyPremium ? (
              <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <p className="text-sm text-green-300">Seu plano de academia já está ativo.</p>
              </div>
            ) : (
              <Button
                onClick={handleSubscribe}
                className="w-full h-12 bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#000] font-serif uppercase tracking-wide"
              >
                <><Crown className="w-4 h-4 mr-2" />Ativar Plano Academia</>
              </Button>
            )}

          </div>
        </div>
      </div>
    </main>
  )
}
