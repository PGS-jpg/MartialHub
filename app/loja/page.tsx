"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/context/user-context"
import { TopBar } from "@/components/selestialhub/top-bar"
import { Sidebar } from "@/components/selestialhub/sidebar"
import { BottomNav } from "@/components/selestialhub/bottom-nav"
import { ProductList } from "../../components/selestialhub/product-list"

export default function LojaPage() {
  const router = useRouter()
  const { user, isAuthReady } = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("loja")

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) {
      router.push("/login")
    }
  }, [isAuthReady, router, user])

  if (!isAuthReady || !user) return null

  return (
    <main className="min-h-screen bg-background pb-24">
      <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isOpen={sidebarOpen} />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="lg:ml-64 p-4 lg:p-6">
        <div className="mx-auto max-w-[1360px] space-y-5">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#17181b] via-[#111216] to-[#0f1013] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.4)] lg:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#ff5b00]/8 blur-3xl" />
            <p className="inline-flex rounded-full bg-primary/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/90">
              SelestialHub Gear
            </p>
            <h1 className="mt-3 font-sans text-4xl font-black tracking-tight text-foreground lg:text-5xl">
              Loja de Combate
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Catálogo direto ao ponto para treino, sparring e competição. Frete grátis acima de R$ 100.
            </p>
          </section>

          <ProductList />
        </div>
      </div>
    </main>
  )
}
