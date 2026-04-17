import Link from "next/link"

export default function PaymentFailurePage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 text-center">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide text-foreground mb-2">Pagamento não concluído</h1>
        <p className="text-sm text-muted-foreground mb-6">Seu pagamento foi cancelado ou recusado. Você pode tentar novamente.</p>
        <Link href="/planos" className="text-primary hover:underline font-semibold">
          Voltar para planos
        </Link>
      </div>
    </main>
  )
}
