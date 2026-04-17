"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", senha: "" })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      
      const data = await res.json()
      
      if (res.ok) {
        localStorage.setItem("selestialhub_user", JSON.stringify(data.user))

        const backendIsAdmin = Boolean(data?.user?.is_admin)
        const legacyEmailHint = form.email.toLowerCase().includes("admin")

        if (backendIsAdmin || legacyEmailHint) {
          router.push("/admin")
        } else {
          router.push("/dashboard")
        }
        
      } else {
        alert(data.error || "E-mail ou senha incorretos.")
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor. O Python está rodando?")
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl">
        <div className="text-center">
          <Image
            src="/logo-mh.svg"
            alt="SelestialHub"
            width={260}
            height={56}
            className="mx-auto h-14 w-auto"
            priority
          />
          <p className="text-zinc-400 text-sm mt-2">Acesse sua conta</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" placeholder="E-mail" required
            className="w-full bg-black border border-zinc-700 p-3 rounded-lg text-white focus:border-[#FF5500] outline-none transition-colors"
            onChange={e => setForm({...form, email: e.target.value})}
          />
          <input 
            type="password" placeholder="Senha" required
            className="w-full bg-black border border-zinc-700 p-3 rounded-lg text-white focus:border-[#FF5500] outline-none transition-colors"
            onChange={e => setForm({...form, senha: e.target.value})}
          />
          <Button className="w-full bg-[#FF5500] hover:bg-[#e64d00] font-bold h-12 text-white">
            {loading ? <Loader2 className="animate-spin" /> : "ENTRAR"}
          </Button>
        </form>

        <div className="text-center mt-4">
          <p className="text-zinc-500 text-sm">
            Ainda não tem conta?{" "}
            <a href="/register" className="text-[#FF5500] hover:underline font-bold">
              Cadastre-se
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}