"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser } from "@/context/user-context"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const { updateUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("Confirmando pagamento...")

  useEffect(() => {
    const userId = Number(searchParams.get("user_id") || "0")
    const planCode = searchParams.get("plan") || ""
    const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id") || ""
    const simulated = searchParams.get("simulated") === "1"

    const confirm = async () => {
      try {
        const payload = simulated
          ? { user_id: userId, plan_code: planCode, simulated: true }
          : { payment_id: paymentId }

        if (simulated && (!userId || !planCode)) {
          setMessage("Pagamento simulado sem dados suficientes para ativação automática.")
          setLoading(false)
          return
        }

        if (!simulated && !paymentId) {
          setMessage("Pagamento recebido, mas o provedor não enviou payment_id para validação.")
          setLoading(false)
          return
        }

        const res = await fetch(`${API_BASE}/api/payments/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        const data = await res.json()
        if (!res.ok || !data.user) {
          setMessage(data.error || "Não foi possível confirmar o pagamento")
          setLoading(false)
          return
        }

        updateUser(data.user)
        setMessage("Pagamento aprovado e plano ativado com sucesso!")
      } catch {
        setMessage("Falha de conexão ao confirmar pagamento")
      } finally {
        setLoading(false)
      }
    }

    void confirm()
  }, [searchParams, updateUser])

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 text-center">
        {loading ? (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">{message}</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-4" />
            <h1 className="font-serif text-2xl font-bold uppercase tracking-wide text-foreground mb-2">Pagamento confirmado</h1>
            <p className="text-sm text-muted-foreground mb-6">{message}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/dashboard">Ir para dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted">
                <Link href="/academias">Ir para academias</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando confirmação de pagamento...</p>
          </div>
        </main>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  )
}
