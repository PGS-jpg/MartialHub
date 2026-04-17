"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Loader2, UserPlus } from "lucide-react"

const PRIMARY_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"
const API_BASE_CANDIDATES = Array.from(new Set(["http://127.0.0.1:5001", PRIMARY_API_BASE]))

export default function RegisterPage() {
  const [form, setForm] = useState({ nome: "", email: "", senha: "" })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let lastMessage = "Erro ao cadastrar."

      for (const base of API_BASE_CANDIDATES) {
        try {
          const res = await fetch(`${base}/api/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          })

          const data = await res.json().catch(() => ({}))

          if (res.ok) {
            alert("Conta criada! Agora faca login.")
            router.push("/login")
            return
          }

          if (data?.error) {
            lastMessage = data.error
          }
        } catch {
          // tenta o proximo backend candidato
        }
      }

      alert(lastMessage)
    } catch {
      alert("Erro ao conectar com o servidor. O backend esta rodando?")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 bg-zinc-900 p-8 rounded-2xl border border-zinc-800">
        <div className="text-center">
          <Image
            src="/logo-mh.svg"
            alt="SelestialHub"
            width={260}
            height={56}
            className="mx-auto h-14 w-auto"
            priority
          />
          <p className="text-zinc-400 text-sm mt-2">Crie sua conta de atleta</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <input 
            type="text" placeholder="Nome Completo" required
            className="w-full bg-black border border-zinc-700 p-3 rounded-lg text-white focus:border-[#FF5500] outline-none"
            onChange={e => setForm({...form, nome: e.target.value})}
          />
          <input 
            type="email" placeholder="E-mail" required
            className="w-full bg-black border border-zinc-700 p-3 rounded-lg text-white focus:border-[#FF5500] outline-none"
            onChange={e => setForm({...form, email: e.target.value})}
          />
          <input 
            type="password" placeholder="Senha" required
            className="w-full bg-black border border-zinc-700 p-3 rounded-lg text-white focus:border-[#FF5500] outline-none"
            onChange={e => setForm({...form, senha: e.target.value})}
          />
          <Button className="w-full bg-[#FF5500] hover:bg-[#e64d00] font-bold h-12">
            {loading ? <Loader2 className="animate-spin" /> : "CADASTRAR"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-zinc-400">
            Ja tem conta?{" "}
            <Link href="/login" className="font-semibold text-[#FF5500] hover:text-[#ff7a33]">
              Ir para o login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

