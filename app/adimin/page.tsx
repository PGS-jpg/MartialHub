"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdiminRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/admin")
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center p-8 rounded-xl border border-border bg-card">
        <h1 className="text-xl font-bold mb-2">Parece que você chegou no caminho errado</h1>
        <p className="text-sm text-muted-foreground">Redirecionando para o painel de administrador...</p>
      </div>
    </main>
  )
}
