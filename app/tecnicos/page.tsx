"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Award, Inbox, RefreshCw, Video } from "lucide-react"
import { TopBar } from "@/components/selestialhub/top-bar"
import { Sidebar } from "@/components/selestialhub/sidebar"
import { BottomNav } from "@/components/selestialhub/bottom-nav"
import { useUser } from "@/context/user-context"

const PRIMARY_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"
const API_BASE_CANDIDATES = Array.from(
  new Set(["http://127.0.0.1:5001", PRIMARY_API_BASE])
)

interface ReviewFight {
  id: number
  athleteId: number
  athleteName: string
  date: string
  event: string
  videoUrl: string
  reviewStatus: string
}

interface ReviewCertificate {
  id: number
  athleteId: number
  athleteName: string
  title: string
  issuer: string
  date: string
  evidenceUrl: string
  status: string
}

interface AthleteCard {
  id: number
  name: string
  pendingFights: number
  pendingCerts: number
  hasFights: boolean
  hasCerts: boolean
}

async function apiFetch(path: string): Promise<Response | null> {
  for (const base of API_BASE_CANDIDATES) {
    try {
      const res = await fetch(`${base}${path}`)
      if (res.ok) return res
    } catch {
      // proximo candidato
    }
  }
  return null
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function TecnicosPage() {
  const router = useRouter()
  const { user, isAuthReady, isCoach } = useUser()

  const [activeTab, setActiveTab] = useState("tecnicos")
  const [athletes, setAthletes] = useState<AthleteCard[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) { router.push("/login"); return }
    if (!isCoach) { router.push("/dashboard") }
  }, [isAuthReady, isCoach, router, user])

  const loadQueue = async (silent = false) => {
    if (!user?.id) return
    if (!silent) setLoading(true)
    try {
      const res = await apiFetch(`/api/coach/reviews?coach_id=${user.id}&status=pendente`)
      if (!res) { setAthletes([]); return }

      const payload = await res.json()
      const fights: ReviewFight[] = Array.isArray(payload?.fights) ? payload.fights : []
      const certs: ReviewCertificate[] = Array.isArray(payload?.certificates) ? payload.certificates : []

      const map = new Map<number, AthleteCard>()

      for (const f of fights) {
        if (!map.has(f.athleteId)) {
          map.set(f.athleteId, { id: f.athleteId, name: f.athleteName, pendingFights: 0, pendingCerts: 0, hasFights: false, hasCerts: false })
        }
        const card = map.get(f.athleteId)!
        card.hasFights = true
        if ((f.reviewStatus || "").toLowerCase() === "pendente") card.pendingFights++
      }

      for (const c of certs) {
        if (!map.has(c.athleteId)) {
          map.set(c.athleteId, { id: c.athleteId, name: c.athleteName, pendingFights: 0, pendingCerts: 0, hasFights: false, hasCerts: false })
        }
        const card = map.get(c.athleteId)!
        card.hasCerts = true
        if ((c.status || "").toLowerCase() === "pendente") card.pendingCerts++
      }

      const sorted = Array.from(map.values())
        .filter((athlete) => athlete.pendingFights + athlete.pendingCerts > 0)
        .sort(
        (a, b) => (b.pendingFights + b.pendingCerts) - (a.pendingFights + a.pendingCerts)
      )

      setAthletes(sorted)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id && isCoach) void loadQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isCoach])

  useEffect(() => {
    if (!user?.id || !isCoach) return

    const interval = window.setInterval(() => {
      void loadQueue(true)
    }, 4000)

    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isCoach])

  const totalPending = athletes.reduce((acc, a) => acc + a.pendingFights + a.pendingCerts, 0)

  return (
    <div className="min-h-screen bg-black text-white">
      <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isOpen={sidebarOpen} />

      <main className={`transition-all duration-300 pb-20 ${sidebarOpen ? "md:ml-64" : "md:ml-0"} pt-16`}>
        <div className="px-4 md:px-8 pt-8 pb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[#FF5500] text-xs font-bold uppercase tracking-widest mb-1">Central do Tecnico</p>
            <h1 className="text-3xl md:text-4xl font-black leading-tight">Fila de Analise</h1>
            <p className="text-zinc-400 text-sm mt-1">Atletas que enviaram certificacoes ou videos de luta oficial para revisao.</p>
          </div>
          <div className="flex items-center gap-3">
            {totalPending > 0 && (
              <span className="px-3 py-1 rounded-full bg-[#FF5500]/15 text-[#FF5500] text-sm font-bold">
                {totalPending} pendente{totalPending !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={() => void loadQueue()}
              disabled={loading}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="px-4 md:px-8 mt-2">
          <div className="border-t border-zinc-800 mb-6" />

          {loading && athletes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-500">
              <RefreshCw className="h-8 w-8 animate-spin opacity-40" />
              <p className="text-sm">Carregando fila...</p>
            </div>
          )}

          {!loading && athletes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-500">
              <Inbox className="h-12 w-12 opacity-30" />
              <p className="text-base font-semibold">Nenhum envio encontrado</p>
              <p className="text-sm">Quando atletas enviarem certificacoes ou videos, eles aparecerao aqui.</p>
            </div>
          )}

          {athletes.length > 0 && (
            <ul className="space-y-3 max-w-2xl">
              {athletes.map((athlete) => {
                return (
                  <li key={athlete.id}>
                    <button
                      onClick={() => router.push(`/tecnicos/${athlete.id}`)}
                      className="w-full flex items-center justify-between gap-4 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 border border-zinc-800 hover:border-zinc-600 rounded-2xl px-5 py-4 transition-all group"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-11 w-11 shrink-0 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-black text-zinc-200">
                          {initials(athlete.name)}
                        </div>
                        <div className="text-left min-w-0">
                          <p className="font-bold text-white truncate">{athlete.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {athlete.hasFights && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300">
                                <Video className="h-3 w-3" /> Luta
                                {athlete.pendingFights > 0 && (
                                  <span className="ml-0.5 bg-[#FF5500] text-white text-[10px] px-1.5 py-0 rounded-full">
                                    {athlete.pendingFights}
                                  </span>
                                )}
                              </span>
                            )}
                            {athlete.hasCerts && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300">
                                <Award className="h-3 w-3" /> Certificado
                                {athlete.pendingCerts > 0 && (
                                  <span className="ml-0.5 bg-[#FF5500] text-white text-[10px] px-1.5 py-0 rounded-full">
                                    {athlete.pendingCerts}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500 group-hover:text-[#FF5500] transition-colors" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

