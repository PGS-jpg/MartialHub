"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, Radio, Ticket } from "lucide-react"
import { useUser } from "@/context/user-context"
import { TopBar } from "@/components/selestialhub/top-bar"
import { Sidebar } from "@/components/selestialhub/sidebar"
import { BottomNav } from "@/components/selestialhub/bottom-nav"
import { EventList } from "@/components/selestialhub/event-list"

export default function EventosPage() {
  const router = useRouter()
  const { user, isAuthReady } = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("eventos")

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) {
      router.push("/login")
    }
  }, [isAuthReady, router, user])

  if (!isAuthReady || !user) return null

  return (
    <main className="min-h-screen bg-background">
      {/* Top Bar */}
      <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Desktop Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
      />

      {/* Mobile Bottom Nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className="lg:ml-64 pb-20 lg:pb-6">
        <div className="mx-auto max-w-[1360px] space-y-5 p-4 lg:p-6">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#17181b] via-[#111216] to-[#0f1013] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.4)] lg:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#ff5b00]/8 blur-3xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#ff5b00]">Calendario competitivo</p>
                <h1 className="mt-3 font-sans text-3xl font-black uppercase tracking-tight text-white lg:text-5xl">
                  Eventos & Torneios
                </h1>
                <p className="mt-3 max-w-xl text-sm text-white/65 lg:text-base">
                  Descubra competições em destaque, acompanhe eventos ao vivo e encontre o próximo tatame para subir de nível.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[540px]">
                {[
                  {
                    label: "Cobertura ao vivo",
                    value: "Acompanhe lutas em andamento e os cards do dia.",
                    icon: Radio,
                    tone: "text-emerald-400 bg-emerald-500/10",
                  },
                  {
                    label: "Agenda filtrada",
                    value: "Encontre eventos por modalidade, nível e status.",
                    icon: Ticket,
                    tone: "text-sky-400 bg-sky-500/10",
                  },
                  {
                    label: "Próximas inscrições",
                    value: "Veja torneios com vagas abertas para entrar agora.",
                    icon: CalendarDays,
                    tone: "text-[#ff8a4c] bg-[#ff5b00]/10",
                  },
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

          <div>
            <EventList />
          </div>
        </div>
      </div>
    </main>
  )
}
