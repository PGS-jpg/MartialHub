"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ExternalLink,
  FileImage,
  Loader2,
  Sliders,
  Video,
  XCircle,
} from "lucide-react"
import { TopBar } from "@/components/selestialhub/top-bar"
import { Sidebar } from "@/components/selestialhub/sidebar"
import { BottomNav } from "@/components/selestialhub/bottom-nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
  opponent: string
  result: string
  method: string
  time: string
  videoUrl: string
  reviewStatus: string
  reviewNotes: string
}

interface ReviewCertificate {
  id: number
  athleteId: number
  athleteName: string
  title: string
  issuer: string
  date: string
  category: string
  evidenceUrl: string
  status: string
  reviewNotes: string
}

function statusBadge(status: string) {
  const s = (status || "").toLowerCase()
  if (s === "aprovado" || s === "verificado")
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Aprovado</span>
  if (s === "rejeitado")
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-300"><XCircle className="h-3 w-3" /> Rejeitado</span>
  return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300">Pendente</span>
}

function isImageUrl(url: string) {
  if ((url || "").startsWith("data:image/")) return true
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)
}

function isVideoUrl(url: string) {
  if ((url || "").startsWith("data:video/")) return true
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url)
}

function isYouTube(url: string) {
  return /youtube\.com|youtu\.be/i.test(url)
}

function youtubeEmbed(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (match) return `https://www.youtube.com/embed/${match[1]}`
  return url
}

function FightCard({
  fight, coachId, onUpdated,
}: {
  fight: ReviewFight
  coachId: number
  onUpdated: (updated: ReviewFight) => void
}) {
  const [notes, setNotes] = useState(fight.reviewNotes || "")
  const [submitting, setSubmitting] = useState<"aprovar" | "rejeitar" | null>(null)

  const act = async (action: "aprovar" | "rejeitar") => {
    setSubmitting(action)
    try {
      for (const base of API_BASE_CANDIDATES) {
        try {
          const res = await fetch(`${base}/api/coach/reviews/fights/${fight.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coach_id: coachId, action, notes }),
          })
          if (!res.ok) continue
          const data = await res.json()
          onUpdated({ ...fight, reviewStatus: data.reviewStatus, reviewNotes: data.reviewNotes })
          return
        } catch { /* next backend */ }
      }
    } finally {
      setSubmitting(null)
    }
  }

  const isDone = ["aprovado", "rejeitado"].includes((fight.reviewStatus || "").toLowerCase())

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="bg-black aspect-video flex items-center justify-center">
        {fight.videoUrl ? (
          isYouTube(fight.videoUrl) ? (
            <iframe
              src={youtubeEmbed(fight.videoUrl)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : isVideoUrl(fight.videoUrl) ? (
            <video src={fight.videoUrl} controls className="w-full h-full object-contain" />
          ) : (
            <a href={fight.videoUrl} target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 text-zinc-400 hover:text-[#FF5500] transition-colors p-6">
              <ExternalLink className="h-10 w-10" />
              <span className="text-sm underline break-all text-center">{fight.videoUrl}</span>
            </a>
          )
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-600">
            <Video className="h-10 w-10" />
            <span className="text-sm">Sem video enviado</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-white">{fight.event || "Evento"}</p>
            <p className="text-sm text-zinc-400">vs {fight.opponent} · {fight.result} · {fight.method} · {fight.time}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{fight.date}</p>
          </div>
          {statusBadge(fight.reviewStatus)}
        </div>

        {fight.reviewNotes && (
          <div className="bg-zinc-800/60 rounded-xl px-4 py-3 text-sm text-zinc-300">
            <span className="text-zinc-500 font-semibold text-xs uppercase tracking-wide block mb-1">Nota anterior</span>
            {fight.reviewNotes}
          </div>
        )}

        {!isDone && (
          <div className="space-y-3">
            <Textarea placeholder="Observacao opcional..." value={notes} onChange={(e) => setNotes(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none min-h-[72px]" />
            <div className="flex gap-2">
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold gap-2" disabled={!!submitting} onClick={() => act("aprovar")}>
                {submitting === "aprovar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Aprovar
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 font-bold gap-2" disabled={!!submitting} onClick={() => act("rejeitar")}>
                {submitting === "rejeitar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Rejeitar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CertCard({
  cert, coachId, onUpdated,
}: {
  cert: ReviewCertificate
  coachId: number
  onUpdated: (updated: ReviewCertificate) => void
}) {
  const [notes, setNotes] = useState(cert.reviewNotes || "")
  const [submitting, setSubmitting] = useState<"aprovar" | "rejeitar" | null>(null)

  const act = async (action: "aprovar" | "rejeitar") => {
    setSubmitting(action)
    try {
      for (const base of API_BASE_CANDIDATES) {
        try {
          const res = await fetch(`${base}/api/coach/reviews/certificates/${cert.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coach_id: coachId, action, notes }),
          })
          if (!res.ok) continue
          const data = await res.json()
          onUpdated({ ...cert, status: data.status, reviewNotes: data.reviewNotes })
          return
        } catch { /* next backend */ }
      }
    } finally {
      setSubmitting(null)
    }
  }

  const isDone = ["verificado", "rejeitado"].includes((cert.status || "").toLowerCase())

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="bg-black min-h-[200px] flex items-center justify-center">
        {cert.evidenceUrl ? (
          isImageUrl(cert.evidenceUrl) ? (
            <img src={cert.evidenceUrl} alt="Evidencia do certificado" className="max-h-80 w-full object-contain" />
          ) : (
            <a href={cert.evidenceUrl} target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 text-zinc-400 hover:text-[#FF5500] transition-colors py-8 px-4">
              <ExternalLink className="h-10 w-10" />
              <span className="text-sm underline break-all text-center">{cert.evidenceUrl}</span>
            </a>
          )
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-600 py-8">
            <FileImage className="h-10 w-10" />
            <span className="text-sm">Sem evidencia enviada</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-white">{cert.title}</p>
            <p className="text-sm text-zinc-400">{cert.issuer} · {cert.category}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{cert.date}</p>
          </div>
          {statusBadge(cert.status)}
        </div>

        {cert.reviewNotes && (
          <div className="bg-zinc-800/60 rounded-xl px-4 py-3 text-sm text-zinc-300">
            <span className="text-zinc-500 font-semibold text-xs uppercase tracking-wide block mb-1">Nota anterior</span>
            {cert.reviewNotes}
          </div>
        )}

        {!isDone && (
          <div className="space-y-3">
            <Textarea placeholder="Observacao opcional..." value={notes} onChange={(e) => setNotes(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none min-h-[72px]" />
            <div className="flex gap-2">
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold gap-2" disabled={!!submitting} onClick={() => act("aprovar")}>
                {submitting === "aprovar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Aprovar
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 font-bold gap-2" disabled={!!submitting} onClick={() => act("rejeitar")}>
                {submitting === "rejeitar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Rejeitar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AthleteReviewPage() {
  const router = useRouter()
  const params = useParams()
  const atletaId = Number(params?.atletaId)

  const { user, isAuthReady, isCoach } = useUser()
  const [activeTab, setActiveTab] = useState("tecnicos")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [fights, setFights] = useState<ReviewFight[]>([])
  const [certs, setCerts] = useState<ReviewCertificate[]>([])
  const [athleteName, setAthleteName] = useState("")
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [tab, setTab] = useState<"lutas" | "certs" | "radar">("lutas")

  const defaultRadar = { raciocinio: 50, velocidade: 50, forca: 50, resistencia: 50, stamina: 50 }
  const [radar, setRadar] = useState(defaultRadar)
  const [radarSaving, setRadarSaving] = useState(false)
  const [radarSaved, setRadarSaved] = useState(false)

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) { router.push("/login"); return }
    if (!isCoach) { router.push("/dashboard") }
  }, [isAuthReady, isCoach, router, user])

  const loadData = useCallback(async () => {
    if (!user?.id || !atletaId) return
    setLoading(true)
    try {
      let res: Response | null = null
      for (const base of API_BASE_CANDIDATES) {
        try {
          const r = await fetch(`${base}/api/coach/reviews?coach_id=${user.id}&status=all`)
          if (r.ok) { res = r; break }
        } catch { /* next */ }
      }
      if (!res) return
      const payload = await res.json()
      const af: ReviewFight[] = (Array.isArray(payload?.fights) ? payload.fights : []).filter((f: ReviewFight) => f.athleteId === atletaId)
      const ac: ReviewCertificate[] = (Array.isArray(payload?.certificates) ? payload.certificates : []).filter((c: ReviewCertificate) => c.athleteId === atletaId)
      setFights(af)
      setCerts(ac)
      if (af[0]?.athleteName) setAthleteName(af[0].athleteName)
      else if (ac[0]?.athleteName) setAthleteName(ac[0].athleteName)
    } finally {
      setLoading(false)
      setHasLoadedOnce(true)
    }
  }, [atletaId, user])

  useEffect(() => {
    if (user?.id && isCoach && atletaId) void loadData()
  }, [user, isCoach, atletaId, loadData])

  useEffect(() => {
    if (!atletaId) return
    const fetchRadar = async () => {
      for (const base of API_BASE_CANDIDATES) {
        try {
          const r = await fetch(`${base}/api/users/${atletaId}/radar`)
          if (r.ok) {
            const d = await r.json()
            setRadar({ raciocinio: d.raciocinio ?? d.agressividade ?? 50, velocidade: d.velocidade ?? 50, forca: d.forca ?? 50, resistencia: d.resistencia ?? 50, stamina: d.stamina ?? 50 })
            return
          }
        } catch { /* next */ }
      }
    }
    void fetchRadar()
  }, [atletaId])

  const saveRadar = async () => {
    if (!user?.id || !atletaId || radarSaving) return
    setRadarSaving(true)
    try {
      for (const base of API_BASE_CANDIDATES) {
        try {
          const r = await fetch(`${base}/api/coach/radar/${atletaId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coach_id: user.id, ...radar }),
          })
          if (r.ok) { setRadarSaved(true); setTimeout(() => setRadarSaved(false), 2000); return }
        } catch { /* next */ }
      }
      alert("Erro ao salvar radar. Tente novamente.")
    } finally {
      setRadarSaving(false)
    }
  }

  useEffect(() => {
    if (!loading && fights.length === 0 && certs.length > 0) setTab("certs")
  }, [loading, fights.length, certs.length])

  const pendingFights = fights.filter((f) => (f.reviewStatus || "").toLowerCase() === "pendente").length
  const pendingCerts = certs.filter((c) => (c.status || "").toLowerCase() === "pendente").length

  useEffect(() => {
    if (!hasLoadedOnce || loading || tab === "radar") return
    if (pendingFights + pendingCerts === 0) {
      router.push("/tecnicos")
    }
  }, [hasLoadedOnce, loading, pendingFights, pendingCerts, router, tab])

  return (
    <div className="min-h-screen bg-black text-white">
      <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isOpen={sidebarOpen} />

      <main className={`transition-all duration-300 pb-20 ${sidebarOpen ? "md:ml-64" : "md:ml-0"} pt-16`}>
        <div className="px-4 md:px-8 pt-8 pb-4">
          <button onClick={() => router.push("/tecnicos")}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar para a fila
          </button>
          {loading ? (
            <div className="h-8 w-48 bg-zinc-800 animate-pulse rounded-lg" />
          ) : (
            <h1 className="text-2xl md:text-3xl font-black">{athleteName || `Atleta #${atletaId}`}</h1>
          )}
          <p className="text-zinc-400 text-sm mt-1">Analise de envios oficiais</p>
        </div>

        <div className="px-4 md:px-8">
          <div className="border-t border-zinc-800 mb-6" />

          <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl w-fit mb-6">
            <button onClick={() => setTab("lutas")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "lutas" ? "bg-[#FF5500] text-white" : "text-zinc-400 hover:text-white"}`}>
              <Video className="h-3.5 w-3.5" /> Lutas
              {pendingFights > 0 && <span className="bg-white/20 text-white text-[10px] px-1.5 rounded-full">{pendingFights}</span>}
            </button>
            <button onClick={() => setTab("certs")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "certs" ? "bg-[#FF5500] text-white" : "text-zinc-400 hover:text-white"}`}>
              <Award className="h-3.5 w-3.5" /> Certificados
              {pendingCerts > 0 && <span className="bg-white/20 text-white text-[10px] px-1.5 rounded-full">{pendingCerts}</span>}
            </button>
            <button onClick={() => setTab("radar")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "radar" ? "bg-[#FF5500] text-white" : "text-zinc-400 hover:text-white"}`}>
              <Sliders className="h-3.5 w-3.5" /> Radar
            </button>
          </div>

          {loading && (
            <div className="space-y-4 max-w-2xl">
              {[1, 2].map((i) => (
                <div key={i} className="bg-zinc-900 rounded-2xl overflow-hidden animate-pulse">
                  <div className="bg-zinc-800 aspect-video" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 w-1/2 bg-zinc-800 rounded" />
                    <div className="h-3 w-1/3 bg-zinc-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && (
            <div className="max-w-2xl space-y-5">
              {tab === "lutas" && (
                fights.length === 0 ? (
                  <div className="flex flex-col items-center py-16 gap-2 text-zinc-500">
                    <Video className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Nenhuma luta enviada por este atleta.</p>
                  </div>
                ) : fights.map((fight) => (
                  <FightCard key={fight.id} fight={fight} coachId={user!.id}
                    onUpdated={(u) => setFights((prev) => prev.map((f) => f.id === u.id ? u : f))} />
                ))
              )}
              {tab === "certs" && (
                certs.length === 0 ? (
                  <div className="flex flex-col items-center py-16 gap-2 text-zinc-500">
                    <Award className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Nenhum certificado enviado por este atleta.</p>
                  </div>
                ) : certs.map((cert) => (
                  <CertCard key={cert.id} cert={cert} coachId={user!.id}
                    onUpdated={(u) => setCerts((prev) => prev.map((c) => c.id === u.id ? u : c))} />
                ))
              )}

              {tab === "radar" && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
                  <div>
                    <h2 className="font-bold text-white text-lg">Radar de Estilo</h2>
                    <p className="text-zinc-400 text-sm mt-1">Defina os atributos do atleta (0 – 100). Os valores aparecem no perfil publico.</p>
                  </div>

                  {(["raciocinio", "velocidade", "forca", "resistencia", "stamina"] as const).map((attr) => (
                    <div key={attr} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold capitalize text-zinc-200">
                          {attr === "forca" ? "Força" : attr === "resistencia" ? "Resistência" : attr === "raciocinio" ? "Raciocínio" : attr.charAt(0).toUpperCase() + attr.slice(1)}
                        </label>
                        <span className="text-sm font-bold text-[#FF5500] w-8 text-right">{radar[attr]}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={radar[attr]}
                        onChange={(e) => setRadar((prev) => ({ ...prev, [attr]: Number(e.target.value) }))}
                        className="w-full accent-[#FF5500] cursor-pointer"
                      />
                    </div>
                  ))}

                  <Button
                    onClick={saveRadar}
                    disabled={radarSaving}
                    className="w-full bg-[#FF5500] hover:bg-[#e04d00] font-bold gap-2"
                  >
                    {radarSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : radarSaved ? <CheckCircle2 className="h-4 w-4" /> : <Sliders className="h-4 w-4" />}
                    {radarSaved ? "Salvo!" : "Salvar Radar"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

