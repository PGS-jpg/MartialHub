"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import Image from "next/image"
import { Users, Crown, DollarSign, LogOut, ShieldCheck, ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"

const PRIMARY_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"
const API_BASE_CANDIDATES = Array.from(new Set(["http://127.0.0.1:5001", PRIMARY_API_BASE]))

export default function AdminPage() {
  const router = useRouter()
  // Estados para controlar o usuário e as estatísticas do painel
  const [user, setUser] = useState<any>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [stats, setStats] = useState({ total_atletas: 0, atletas_pro: 0, faturamento_estimado: 0 })
  const [rankingAudit, setRankingAudit] = useState({ users_total: 0, duplicates_filtered: 0 })
  const [adminUsers, setAdminUsers] = useState<Array<{ id: number; nome: string; email: string; is_coach: boolean; is_pro: boolean; is_academy_pro: boolean }>>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null)
  const [adminAccessDenied, setAdminAccessDenied] = useState(false)

  // 1. Verificação de Segurança (Ao carregar a página)
  useEffect(() => {
    const loggedUser = localStorage.getItem("selestialhub_user")
    
    if (!loggedUser) {
      // Se não tem usuário salvo, chuta pro login
      router.push("/login")
    } else {
      // Se tá logado, libera o acesso e busca os dados do painel
      const parsedUser = JSON.parse(loggedUser)
      setUser(parsedUser)
      setLoadingAuth(false)
      fetchStats(parsedUser.id)
      fetchUsers(parsedUser.id)
    }
  }, [router])

  // 2. Busca os dados reais do seu Python/MySQL
  const fetchStats = async (requesterUserId: number) => {
    for (const base of API_BASE_CANDIDATES) {
      try {
        const [statsRes, auditRes] = await Promise.all([
          fetch(`${base}/api/admin/stats?requester_user_id=${requesterUserId}`),
          fetch(`${base}/api/ranking/audit`),
        ])

        if (statsRes.ok) {
          setAdminAccessDenied(false)
          const data = await statsRes.json()
          setStats(data)
        }

        if (statsRes.status === 403) {
          setAdminAccessDenied(true)
        }

        if (auditRes.ok) {
          const audit = await auditRes.json()
          setRankingAudit({
            users_total: Number(audit?.users_total || 0),
            duplicates_filtered: Number(audit?.duplicates_filtered || 0),
          })
        }

        if (statsRes.ok || auditRes.ok) {
          return
        }
      } catch (error) {
        console.error("Erro ao conectar com o backend:", error)
      }
    }
  }

  const fetchUsers = async (requesterUserId: number) => {
    setUsersLoading(true)
    try {
      for (const base of API_BASE_CANDIDATES) {
        try {
          const res = await fetch(`${base}/api/admin/users?requester_user_id=${requesterUserId}`)
          if (res.status === 403) {
            setAdminAccessDenied(true)
            continue
          }
          if (!res.ok) continue
          const payload = await res.json()
          const rows = Array.isArray(payload?.users) ? payload.users : []
          setAdminUsers(rows)
          setAdminAccessDenied(false)
          return
        } catch {
          // tenta o proximo backend
        }
      }
      setAdminUsers([])
    } finally {
      setUsersLoading(false)
    }
  }

  const toggleCoachAuthorization = async (targetUserId: number, nextValue: boolean) => {
    if (!user?.id) return
    setUpdatingUserId(targetUserId)
    try {
      for (const base of API_BASE_CANDIDATES) {
        try {
          const res = await fetch(`${base}/api/admin/users/${targetUserId}/coach`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requester_user_id: user.id, is_coach: nextValue }),
          })
          if (res.status === 403) {
            setAdminAccessDenied(true)
            continue
          }
          if (!res.ok) continue

          setAdminUsers((prev) => prev.map((u) => (u.id === targetUserId ? { ...u, is_coach: nextValue } : u)))
          return
        } catch {
          // tenta o proximo backend
        }
      }
    } finally {
      setUpdatingUserId(null)
    }
  }

  // 3. Função para sair da conta
  const handleLogout = () => {
    localStorage.removeItem("selestialhub_user")
    router.push("/login")
  }

  // Tela de espera enquanto o Next.js verifica o login
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#FF5500] font-bold text-xl animate-pulse">
          Acessando sistema...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* --- CABEÇALHO --- */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 border-b border-zinc-800 pb-6 gap-4">
        <div>
          <Image
            src="/logo-mh.svg"
            alt="SelestialHub"
            width={260}
            height={56}
            className="h-12 w-auto"
            priority
          />
          <p className="text-zinc-400 mt-1">Painel Administrativo</p>
        </div>
        <div className="flex items-center gap-4 bg-zinc-900 px-6 py-2 rounded-full border border-zinc-800">
          <span className="text-zinc-400 text-sm">
            Bem-vindo, <strong className="text-white">{user?.nome}</strong>
          </span>
          <div className="w-px h-6 bg-zinc-700 hidden md:block"></div>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 text-zinc-400 hover:text-red-500 transition-colors text-sm font-bold"
          >
            <LogOut className="w-4 h-4" /> SAIR
          </button>
        </div>
      </div>

      {adminAccessDenied && (
        <div className="max-w-6xl mx-auto mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-red-300">Acesso admin negado para este usuario.</p>
          <p className="mt-1 text-xs text-red-200/90">
            Em ambiente local, use uma conta com "admin" no email, configure ADMIN_USER_IDS, ou acesse com o primeiro usuario cadastrado.
          </p>
        </div>
      )}

      {/* --- CARDS DE ESTATÍSTICAS --- */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Total de Atletas */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Total Cadastrado</p>
              <h3 className="text-4xl font-black mt-2">{stats.total_atletas}</h3>
            </div>
            <div className="bg-black border border-zinc-800 p-3 rounded-xl text-zinc-300">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 2: Atletas PRO */}
        <div className="bg-zinc-900 border border-[#FF5500]/20 p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#FF5500]"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Assinantes PRO</p>
              <h3 className="text-4xl font-black mt-2 text-white">{stats.atletas_pro}</h3>
            </div>
            <div className="bg-[#FF5500]/10 border border-[#FF5500]/20 p-3 rounded-xl text-[#FF5500]">
              <Crown className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 3: Faturamento */}
        <div className="bg-zinc-900 border border-emerald-500/20 p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Faturamento (Mês)</p>
              <h3 className="text-4xl font-black mt-2 text-emerald-400">
                R$ {stats.faturamento_estimado.toFixed(2).replace('.', ',')}
              </h3>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-emerald-500">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

      </div>

      <div className="max-w-6xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
          <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Ranking: usuarios unicos</p>
          <h3 className="text-4xl font-black mt-2">{rankingAudit.users_total}</h3>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
          <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Duplicados filtrados</p>
          <h3 className="text-4xl font-black mt-2">{rankingAudit.duplicates_filtered}</h3>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Autorizacao de tecnicos</p>
              <h3 className="text-2xl font-black mt-1">Definir quem pode acessar analise tecnica</h3>
            </div>
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              onClick={() => user?.id && fetchUsers(user.id)}
              disabled={usersLoading}
            >
              {usersLoading ? "Atualizando..." : "Atualizar lista"}
            </Button>
          </div>

          <div className="space-y-2 max-h-[480px] overflow-auto pr-1">
            {adminUsers.length === 0 && (
              <p className="text-sm text-zinc-400">Nenhum usuario encontrado ou acesso admin nao autorizado.</p>
            )}
            {adminUsers.map((target) => (
              <div key={target.id} className="rounded-xl border border-zinc-800 bg-black/30 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">#{target.id} {target.nome}</p>
                  <p className="text-xs text-zinc-400">{target.email || "sem email"}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {target.is_pro ? "PRO" : "FREE"} • {target.is_academy_pro ? "Academia Premium" : "Atleta"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {target.is_coach ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
                      <ShieldCheck className="h-3.5 w-3.5" /> Autorizado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700/40 px-2 py-1 text-xs font-semibold text-zinc-300">
                      <ShieldOff className="h-3.5 w-3.5" /> Sem autorizacao
                    </span>
                  )}

                  <Button
                    size="sm"
                    className={target.is_coach ? "bg-red-600 hover:bg-red-700" : "bg-[#FF5500] hover:bg-[#e64d00]"}
                    disabled={updatingUserId === target.id}
                    onClick={() => toggleCoachAuthorization(target.id, !target.is_coach)}
                  >
                    {updatingUserId === target.id
                      ? "Salvando..."
                      : target.is_coach
                        ? "Remover autorizacao"
                        : "Autorizar tecnico"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
