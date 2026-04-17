"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Award,
  CheckCircle2,
  Download,
  Edit3,
  FileVideo,
  FileImage,
  MessageCircle,
  Radar,
  Share2,
  Shield,
  Swords,
  Target,
  Trophy,
  Users,
} from "lucide-react"
import { useUser } from "@/context/user-context"
import { TopBar } from "@/components/selestialhub/top-bar"
import { Sidebar } from "@/components/selestialhub/sidebar"
import { BottomNav } from "@/components/selestialhub/bottom-nav"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface FightRecord {
  id: string
  date: string
  event: string
  opponent: string
  result: "Vitoria" | "Derrota"
  method: "Pontos" | "Finalizacao" | "KO/TKO" | "Desqualificacao"
  round: number
  time: string
  isOfficial: boolean
  videoUrl?: string
  reviewStatus?: string
  reviewNotes?: string
}

interface CertRecord {
  id: string
  title: string
  issuer: string
  date: string
  status: "Verificado" | "Pendente"
  category: string
  evidenceUrl?: string
}

interface PrivacySettings {
  publicProfile: boolean
  showWeight: boolean
  showFullRecord: boolean
  allowChallenges: boolean
  allowMessages: boolean
}

interface Testimonial {
  id: string
  author: string
  role: string
  text: string
}

interface PublicProfile {
  id: number
  nome: string
  cidade: string
  bio: string
  academia: string
  modalidade: string
  faixa: string
  estilo: string
  avatarUrl: string
  followers: number
  following: number
  i_follow: boolean
  follows_me: boolean
  can_message: boolean
}

const INITIAL_FIGHTS: FightRecord[] = []

const PRIMARY_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"
const API_BASE_CANDIDATES = Array.from(new Set(["http://127.0.0.1:5001", PRIMARY_API_BASE]))

const INITIAL_CERTS: CertRecord[] = []

const INITIAL_PRIVACY: PrivacySettings = {
  publicProfile: true,
  showWeight: false,
  showFullRecord: true,
  allowChallenges: true,
  allowMessages: true,
}

const TESTIMONIALS: Testimonial[] = [
  { id: "t1", author: "Mestre Carlos", role: "Treinador", text: "Atleta disciplinado, evolucao tecnica acima da media e mental forte em competicao." },
  { id: "t2", author: "Rafael Lima", role: "Parceiro de treino", text: "Sempre intenso no treino e respeitoso no tatame. Excelente parceiro de sparring." },
]

function RadarChart({ values }: { values: number[] }) {
  const size = 220
  const center = size / 2
  const radius = 78

  const points = values
    .map((v, i) => {
      const angle = (Math.PI * 2 * i) / values.length - Math.PI / 2
      const r = (Math.max(0, Math.min(100, v)) / 100) * radius
      const x = center + Math.cos(angle) * r
      const y = center + Math.sin(angle) * r
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg width={size} height={size} className="mx-auto">
      {[20, 40, 60, 80, 100].map((level) => (
        <circle key={level} cx={center} cy={center} r={(level / 100) * radius} fill="none" stroke="currentColor" className="text-border/40" />
      ))}
      <polygon points={points} fill="rgba(245,158,11,0.35)" stroke="rgba(245,158,11,1)" strokeWidth="2" />
    </svg>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isPremium, isAuthReady, updateUser } = useUser()
  const viewedAthleteIdParam = searchParams.get("athleteId")
  const viewedAthleteId = viewedAthleteIdParam ? Number(viewedAthleteIdParam) : null
  const validViewedAthleteId = viewedAthleteId && Number.isFinite(viewedAthleteId) ? viewedAthleteId : null
  const isOwnProfile = !validViewedAthleteId || validViewedAthleteId === user?.id
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("perfil")
  const [fights, setFights] = useState<FightRecord[]>(INITIAL_FIGHTS)
  const [certs, setCerts] = useState<CertRecord[]>(INITIAL_CERTS)
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [avatarUploadBusy, setAvatarUploadBusy] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [saveProfileBusy, setSaveProfileBusy] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const [editForm, setEditForm] = useState({
    nome: "",
    academia: "",
    cidade: "",
    modalidade: "",
    estilo: "",
    bio: "",
  })
  const [privacy, setPrivacy] = useState<PrivacySettings>(INITIAL_PRIVACY)
  const [newCert, setNewCert] = useState({
    title: "",
    issuer: "",
    date: "",
    category: "Graduacao",
    evidenceUrl: "",
  })
  const [fightVideoFileName, setFightVideoFileName] = useState("")
  const [certEvidenceFileName, setCertEvidenceFileName] = useState("")
  const [fightFileBusy, setFightFileBusy] = useState(false)
  const [certFileBusy, setCertFileBusy] = useState(false)
  const [newFight, setNewFight] = useState({
    date: "",
    event: "",
    opponent: "",
    result: "Vitoria" as FightRecord["result"],
    method: "Pontos" as FightRecord["method"],
    round: 1,
    time: "05:00",
    isOfficial: true,
    videoUrl: "",
  })

  const requestWithFallback = useCallback(async (path: string, init?: RequestInit): Promise<Response | null> => {
    for (const base of API_BASE_CANDIDATES) {
      try {
        const response = await fetch(`${base}${path}`, init)
        if (response.status === 404) continue
        return response
      } catch {
        // tenta proximo backend
      }
    }
    return null
  }, [])

  const readFileAsDataUrl = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result)
        else reject(new Error("falha ao ler arquivo"))
      }
      reader.onerror = () => reject(new Error("falha ao ler arquivo"))
      reader.readAsDataURL(file)
    })
  }, [])

  const handleFightFileSelect = useCallback(async (file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith("video/")) {
      alert("Selecione um arquivo de video.")
      return
    }
    if (file.size > 30 * 1024 * 1024) {
      alert("Video muito grande. Limite: 30MB.")
      return
    }

    try {
      setFightFileBusy(true)
      const dataUrl = await readFileAsDataUrl(file)
      setNewFight((prev) => ({ ...prev, videoUrl: dataUrl }))
      setFightVideoFileName(file.name)
    } catch {
      alert("Nao foi possivel ler o arquivo de video.")
    } finally {
      setFightFileBusy(false)
    }
  }, [readFileAsDataUrl])

  const handleCertFileSelect = useCallback(async (file?: File | null) => {
    if (!file) return
    const isAccepted = file.type.startsWith("image/") || file.type === "application/pdf"
    if (!isAccepted) {
      alert("Selecione uma imagem ou PDF para o certificado.")
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      alert("Arquivo muito grande. Limite: 12MB.")
      return
    }

    try {
      setCertFileBusy(true)
      const dataUrl = await readFileAsDataUrl(file)
      setNewCert((prev) => ({ ...prev, evidenceUrl: dataUrl }))
      setCertEvidenceFileName(file.name)
    } catch {
      alert("Nao foi possivel ler o arquivo de certificado.")
    } finally {
      setCertFileBusy(false)
    }
  }, [readFileAsDataUrl])

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) {
      router.push("/login")
      return
    }

    const profileUserId = validViewedAthleteId || user.id

    const hydrate = async () => {
      const fightsStorageKey = `selestialhub_profile_fights_${user.id}`
      const certsStorageKey = `selestialhub_profile_certs_${user.id}`
      const privacyStorageKey = `selestialhub_profile_privacy_${user.id}`
      const storedFights = localStorage.getItem(fightsStorageKey)
      const storedCerts = localStorage.getItem(certsStorageKey)
      const storedPrivacy = localStorage.getItem(privacyStorageKey)

      setFights([])
      setCerts([])

      if (storedPrivacy && isOwnProfile) {
        try {
          const parsed = JSON.parse(storedPrivacy)
          setPrivacy((prev) => ({ ...prev, ...parsed }))
        } catch {
          // keep defaults
        }
      }

      const profileRes = await requestWithFallback(`/api/users/${profileUserId}/public?viewer_id=${user.id}`)
      if (profileRes?.ok) {
        try {
          const payload = await profileRes.json()
          if (payload?.profile) {
            setPublicProfile(payload.profile as PublicProfile)
          }
        } catch {
          // keep defaults
        }
      }

      const fightsRes = await requestWithFallback(`/api/user/fights?user_id=${profileUserId}`)
      if (fightsRes?.ok) {
        try {
          const payload = await fightsRes.json()
          const backendFights: FightRecord[] = Array.isArray(payload?.fights) ? payload.fights : []
          if (backendFights.length > 0) {
            setFights(backendFights)
            if (isOwnProfile) {
              localStorage.setItem(fightsStorageKey, JSON.stringify(backendFights))
            }
          } else if (storedFights && isOwnProfile) {
            const parsed = JSON.parse(storedFights)
            if (Array.isArray(parsed)) setFights(parsed)
          }
        } catch {
          if (storedFights && isOwnProfile) {
            try {
              const parsed = JSON.parse(storedFights)
              if (Array.isArray(parsed)) setFights(parsed)
            } catch {
              // keep defaults
            }
          }
        }
      } else if (storedFights && isOwnProfile) {
        try {
          const parsed = JSON.parse(storedFights)
          if (Array.isArray(parsed)) setFights(parsed)
        } catch {
          // keep defaults
        }
      }

      const certsRes = await requestWithFallback(`/api/user/certificates?user_id=${profileUserId}`)
      if (certsRes?.ok) {
        try {
          const payload = await certsRes.json()
          const backendCerts: CertRecord[] = Array.isArray(payload?.certificates) ? payload.certificates : []
          if (backendCerts.length > 0) {
            setCerts(backendCerts)
            if (isOwnProfile) {
              localStorage.setItem(certsStorageKey, JSON.stringify(backendCerts))
            }
          } else if (storedCerts && isOwnProfile) {
            const parsed = JSON.parse(storedCerts)
            if (Array.isArray(parsed)) setCerts(parsed)
          }
        } catch {
          if (storedCerts && isOwnProfile) {
            try {
              const parsed = JSON.parse(storedCerts)
              if (Array.isArray(parsed)) setCerts(parsed)
            } catch {
              // keep defaults
            }
          }
        }
      } else if (storedCerts && isOwnProfile) {
        try {
          const parsed = JSON.parse(storedCerts)
          if (Array.isArray(parsed)) setCerts(parsed)
        } catch {
          // keep defaults
        }
      }
    }

    hydrate()
  }, [isAuthReady, isOwnProfile, requestWithFallback, router, user, validViewedAthleteId])

  useEffect(() => {
    if (!isOwnProfile || !user?.id) return
    localStorage.setItem(`selestialhub_profile_fights_${user.id}`, JSON.stringify(fights))
  }, [fights, isOwnProfile, user?.id])

  useEffect(() => {
    if (!isOwnProfile || !user?.id) return
    localStorage.setItem(`selestialhub_profile_certs_${user.id}`, JSON.stringify(certs))
  }, [certs, isOwnProfile, user?.id])

  useEffect(() => {
    if (!isOwnProfile || !user?.id) return
    localStorage.setItem(`selestialhub_profile_privacy_${user.id}`, JSON.stringify(privacy))
  }, [isOwnProfile, privacy, user?.id])

  useEffect(() => {
    if (!publicProfile || !isOwnProfile) return
    setEditForm({
      nome: publicProfile.nome || user?.nome || "",
      academia: publicProfile.academia || "",
      cidade: publicProfile.cidade || "",
      modalidade: publicProfile.modalidade || "",
      estilo: publicProfile.estilo || "",
      bio: publicProfile.bio || "",
    })
  }, [isOwnProfile, publicProfile, user?.nome])

  const displayName = publicProfile?.nome || user?.nome || "Atleta"
  const displayBio = publicProfile?.bio?.trim() || ""
  const displayAvatar = publicProfile?.avatarUrl || ""
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const kpis = useMemo(() => {
    const wins = fights.filter((fight) => fight.result === "Vitoria").length
    const losses = fights.length - wins
    const finishes = fights.filter((fight) => fight.method === "Finalizacao" || fight.method === "KO/TKO").length
    const winRate = fights.length ? Math.round((wins / fights.length) * 100) : 0

    return [
      { label: "Vitorias", value: String(wins), accent: "text-emerald-400" },
      { label: "Derrotas", value: String(losses), accent: "text-red-400" },
      { label: "Finalizacoes", value: String(finishes), accent: "text-primary" },
      { label: "Taxa de vitoria", value: `${winRate}%`, accent: "text-sky-400" },
    ]
  }, [fights])

  const [radarValues, setRadarValues] = useState([0, 0, 0, 0, 0])

  useEffect(() => {
    const profileId = validViewedAthleteId ?? user?.id
    if (!profileId) return
    const fetchRadar = async () => {
      for (const base of API_BASE_CANDIDATES) {
        try {
          const r = await fetch(`${base}/api/users/${profileId}/radar`)
          if (r.ok) {
            const d = await r.json()
            setRadarValues([d.raciocinio ?? d.agressividade ?? 0, d.velocidade ?? 0, d.forca ?? 0, d.resistencia ?? 0, d.stamina ?? 0])
            return
          }
        } catch { /* next */ }
      }
    }
    void fetchRadar()
  }, [validViewedAthleteId, user?.id])

  if (!isAuthReady || !user) {
    return null
  }

  const social = {
    followers: publicProfile?.followers ?? 0,
    following: publicProfile?.following ?? 0,
    badges: ["Top 10 Regional", "Atleta Consistente", "Finalizador do Mes"],
  }

  const togglePrivacy = (key: keyof PrivacySettings) => {
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleFollow = async () => {
    if (!user || !publicProfile || isOwnProfile || followBusy) return
    try {
      setFollowBusy(true)
      const res = await requestWithFallback("/api/follows/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, target_id: publicProfile.id }),
      })
      if (!res?.ok) return

      const payload = await res.json()
      setPublicProfile((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          i_follow: Boolean(payload?.is_following),
          follows_me: Boolean(payload?.follows_me),
          can_message: Boolean(payload?.can_message),
          followers: Number(payload?.target_followers ?? prev.followers),
          following: Number(payload?.target_following ?? prev.following),
        }
      })
    } finally {
      setFollowBusy(false)
    }
  }

  const handleAvatarUpload = async (file?: File | null) => {
    if (!user || !isOwnProfile || !file || avatarUploadBusy) return
    if (!file.type.startsWith("image/")) return
    if (file.size > 4 * 1024 * 1024) return

    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : ""
      if (!dataUrl) return

      try {
        setAvatarUploadBusy(true)
        const res = await requestWithFallback("/api/user/avatar", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id, avatarUrl: dataUrl }),
        })

        if (!res?.ok) return
        const payload = await res.json()
        const nextAvatar = String(payload?.avatarUrl || dataUrl)
        setPublicProfile((prev) => {
          if (!prev) return prev
          return { ...prev, avatarUrl: nextAvatar }
        })
        updateUser({
          ...user,
          avatarUrl: nextAvatar,
        })
      } finally {
        setAvatarUploadBusy(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const addFight = async () => {
    if (!user) return
    if (!newFight.date || !newFight.event.trim() || !newFight.opponent.trim()) return

    const payload = {
      user_id: user.id,
      date: newFight.date,
      event: newFight.event.trim(),
      opponent: newFight.opponent.trim(),
      result: newFight.result,
      method: newFight.method,
      round: newFight.round,
      time: newFight.time,
      isOfficial: newFight.isOfficial,
      videoUrl: newFight.videoUrl.trim(),
    }

    try {
      const res = await requestWithFallback("/api/user/fights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res?.ok) {
        const created: FightRecord = await res.json()
        setFights((prev) => [created, ...prev])
      } else {
        let message = "Falha ao enviar luta para analise."
        if (res) {
          try {
            const errPayload = await res.json()
            if (errPayload?.error) message = String(errPayload.error)
          } catch {
            // keep default message
          }
        }
        alert(message)
        return
      }
    } catch {
      alert("Falha ao conectar com o backend. A luta nao foi enviada para analise.")
      return
    }

    setNewFight({
      date: "",
      event: "",
      opponent: "",
      result: "Vitoria",
      method: "Pontos",
      round: 1,
      time: "05:00",
      isOfficial: true,
      videoUrl: "",
    })
    setFightVideoFileName("")
  }

  const addCertificate = async () => {
    if (!user) return
    if (!newCert.title.trim() || !newCert.issuer.trim() || !newCert.date) return

    const payload = {
      user_id: user.id,
      title: newCert.title.trim(),
      issuer: newCert.issuer.trim(),
      date: newCert.date,
      category: newCert.category,
      evidenceUrl: newCert.evidenceUrl.trim(),
      status: "Pendente",
    }

    try {
      const res = await requestWithFallback("/api/user/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res?.ok) {
        const created: CertRecord = await res.json()
        setCerts((prev) => [created, ...prev])
      } else {
        let message = "Falha ao enviar certificado para analise."
        if (res) {
          try {
            const errPayload = await res.json()
            if (errPayload?.error) message = String(errPayload.error)
          } catch {
            // keep default message
          }
        }
        alert(message)
        return
      }
    } catch {
      alert("Falha ao conectar com o backend. O certificado nao foi enviado para analise.")
      return
    }

    setNewCert({ title: "", issuer: "", date: "", category: "Graduacao", evidenceUrl: "" })
    setCertEvidenceFileName("")
  }

  const saveEditedProfile = async () => {
    if (!user || !isOwnProfile || saveProfileBusy) return

    const payload = {
      user_id: user.id,
      nome: editForm.nome.trim() || user.nome,
      academia: editForm.academia.trim(),
      cidade: editForm.cidade.trim(),
      modalidade: editForm.modalidade.trim(),
      estilo: editForm.estilo.trim(),
      bio: editForm.bio.trim(),
    }

    try {
      setSaveProfileBusy(true)
      const res = await requestWithFallback("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res?.ok) return

      setPublicProfile((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          nome: payload.nome,
          academia: payload.academia,
          cidade: payload.cidade,
          modalidade: payload.modalidade,
          estilo: payload.estilo,
          bio: payload.bio,
        }
      })

      updateUser({
        ...user,
        nome: payload.nome,
        cidade: payload.cidade,
        bio: payload.bio,
      })

      setEditModalOpen(false)
    } finally {
      setSaveProfileBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isOpen={sidebarOpen} />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="lg:ml-64 pb-24 lg:pb-8">
        <div className="mx-auto max-w-[1360px] space-y-5 p-4 lg:p-6">

          {/* ── Hero do perfil ── */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#17181b] via-[#111216] to-[#0f1013] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.4)] lg:p-8"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#ff5b00]/8 blur-3xl" />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              {/* Avatar + Info */}
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => isOwnProfile && avatarInputRef.current?.click()}
                    className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-[#1b2027] font-serif text-3xl font-bold text-white lg:h-24 lg:w-24"
                    title={isOwnProfile ? "Clique para trocar a foto" : undefined}
                  >
                    {displayAvatar
                      ? <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
                      : <span>{initials || "MH"}</span>
                    }
                    {isOwnProfile && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100 text-xs font-semibold text-white">
                        Trocar foto
                      </span>
                    )}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(e.target.files?.[0])} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-sans text-3xl font-black uppercase tracking-tight text-white lg:text-4xl">{displayName}</h1>
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                    {isPremium && <span className="rounded-full bg-[#FFD700] px-2.5 py-0.5 text-xs font-bold text-black">PRO</span>}
                  </div>
                  <p className="mt-1 text-sm text-white/70">
                    {publicProfile?.academia || "Sem academia"} · {publicProfile?.modalidade || "Modalidade nao definida"} · {publicProfile?.faixa || "Graduacao em verificacao"}
                  </p>
                  {displayBio && <p className="mt-1 max-w-xl text-xs text-white/55">{displayBio}</p>}
                  <p className="mt-1.5 text-[10px] uppercase tracking-[0.22em] text-white/40">Carteira oficial de atleta</p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  onClick={() => router.push(isOwnProfile ? "/chat" : `/chat?peerId=${publicProfile?.id || ""}`)}
                  disabled={!isOwnProfile && !publicProfile?.can_message}
                  className="inline-flex min-w-[130px] items-center justify-center gap-2 rounded-xl bg-[#1b2027] px-4 py-2.5 text-sm font-semibold text-foreground whitespace-nowrap transition hover:bg-[#242b36] disabled:opacity-40"
                >
                  <MessageCircle className="h-4 w-4" /> Iniciar chat
                </button>
                <button
                  onClick={toggleFollow}
                  disabled={isOwnProfile || followBusy}
                  className={`inline-flex min-w-[130px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition disabled:opacity-40 ${
                    publicProfile?.i_follow
                      ? "bg-[#1b2027] text-muted-foreground hover:bg-[#242b36]"
                      : "bg-[#ff5b00] text-white hover:bg-[#e65200]"
                  }`}
                >
                  <Swords className="h-4 w-4" /> {publicProfile?.i_follow ? "Seguindo" : "Seguir"}
                </button>
                {isOwnProfile && (
                  <button
                    onClick={() => setEditModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1b2027] px-4 py-2.5 text-sm font-semibold text-foreground whitespace-nowrap transition hover:bg-[#242b36]"
                  >
                    <Edit3 className="h-4 w-4" /> Editar
                  </button>
                )}
              </div>
            </div>

            {/* Menu expandido para perfil de outro */}
            {!isOwnProfile && actionsOpen && publicProfile && (
              <div className="relative mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-3">
                <button
                  onClick={toggleFollow}
                  disabled={followBusy}
                  className="rounded-lg bg-[#ff5b00] px-3 py-2 text-xs font-semibold text-white hover:bg-[#e65200] disabled:opacity-50"
                >
                  {publicProfile.i_follow ? "Deixar de seguir" : "Seguir atleta"}
                </button>
                <button
                  disabled={!publicProfile.can_message}
                  onClick={() => router.push(`/chat?peerId=${publicProfile.id}`)}
                  className="rounded-lg bg-[#1b2027] px-3 py-2 text-xs font-semibold text-foreground hover:bg-[#242b36] disabled:opacity-50"
                >
                  {publicProfile.can_message ? "Enviar mensagem" : "Siga-se mutuamente para conversar"}
                </button>
                {publicProfile.follows_me && (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">Segue voce</span>
                )}
              </div>
            )}
          </motion.section>

          {/* ── KPIs ── */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {kpis.map((kpi, idx) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
                <p className={`mt-2 font-serif text-3xl font-bold ${kpi.accent}`}>{kpi.value}</p>
              </motion.div>
            ))}
          </section>

          {/* ── Cartel + Radar ── */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-[#232832] bg-[#131820] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.32)] lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                    <Trophy className="h-4 w-4 text-primary" />
                  </span>
                  <h2 className="font-sans text-base font-bold uppercase tracking-[0.06em] text-foreground">Cartel detalhado</h2>
                </div>
              </div>

              {isOwnProfile && (
                <div className="mb-5 rounded-xl border border-[#2a3040] bg-[#1b2027] p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registrar nova luta</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                    <Input type="date" value={newFight.date} onChange={(e) => setNewFight((prev) => ({ ...prev, date: e.target.value }))} className="bg-[#131820] border-[#2a3040]" />
                    <Input placeholder="Evento" value={newFight.event} onChange={(e) => setNewFight((prev) => ({ ...prev, event: e.target.value }))} className="bg-[#131820] border-[#2a3040]" />
                    <Input placeholder="Adversario" value={newFight.opponent} onChange={(e) => setNewFight((prev) => ({ ...prev, opponent: e.target.value }))} className="bg-[#131820] border-[#2a3040]" />
                    <select value={newFight.result} onChange={(e) => setNewFight((prev) => ({ ...prev, result: e.target.value as FightRecord["result"] }))} className="h-10 rounded-md border border-[#2a3040] bg-[#131820] px-3 text-sm text-foreground">
                      <option value="Vitoria">Vitoria</option>
                      <option value="Derrota">Derrota</option>
                    </select>
                    <select value={newFight.isOfficial ? "Oficial" : "Treino"} onChange={(e) => setNewFight((prev) => ({ ...prev, isOfficial: e.target.value === "Oficial" }))} className="h-10 rounded-md border border-[#2a3040] bg-[#131820] px-3 text-sm text-foreground">
                      <option value="Oficial">Oficial</option>
                      <option value="Treino">Treino</option>
                    </select>
                    <select value={newFight.method} onChange={(e) => setNewFight((prev) => ({ ...prev, method: e.target.value as FightRecord["method"] }))} className="h-10 rounded-md border border-[#2a3040] bg-[#131820] px-3 text-sm text-foreground">
                      <option value="Pontos">Pontos</option>
                      <option value="Finalizacao">Finalizacao</option>
                      <option value="KO/TKO">KO/TKO</option>
                      <option value="Desqualificacao">Desqualificacao</option>
                    </select>
                    <Input placeholder="Tempo ex: 03:14" value={newFight.time} onChange={(e) => setNewFight((prev) => ({ ...prev, time: e.target.value }))} className="bg-[#131820] border-[#2a3040]" />
                    <Input type="number" min={1} max={12} placeholder="Round" value={newFight.round} onChange={(e) => setNewFight((prev) => ({ ...prev, round: Math.max(1, Number(e.target.value) || 1) }))} className="bg-[#131820] border-[#2a3040]" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-lg border border-[#2a3040] bg-[#131820] px-3 py-2">
                      <FileVideo className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <input type="file" accept="video/*" onChange={(e) => void handleFightFileSelect(e.target.files?.[0])} className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary/15 file:px-2 file:py-1 file:text-primary" />
                      <span className="shrink-0 text-[11px] text-muted-foreground">{fightFileBusy ? "Processando..." : fightVideoFileName || "Sem arquivo"}</span>
                    </div>
                    <button onClick={addFight} className="inline-flex items-center gap-2 rounded-xl bg-[#ff5b00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e65200]">
                      Registrar luta
                    </button>
                  </div>
                </div>
              )}

              {fights.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Trophy className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma luta registrada ainda.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="border-b border-[#2a3040] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="pb-2 pr-3">Data</th>
                        <th className="pb-2 pr-3">Evento</th>
                        <th className="pb-2 pr-3">Adversario</th>
                        <th className="pb-2 pr-3">Resultado</th>
                        <th className="pb-2 pr-3">Metodo</th>
                        <th className="pb-2 pr-3">Rd</th>
                        <th className="pb-2 pr-3">Tempo</th>
                        <th className="pb-2">Tipo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2530]">
                      {fights.map((fight) => (
                        <tr key={fight.id}>
                          <td className="py-2.5 pr-3 text-xs text-muted-foreground">{fight.date}</td>
                          <td className="py-2.5 pr-3 font-medium text-foreground">{fight.event}</td>
                          <td className="py-2.5 pr-3 text-foreground">{fight.opponent}</td>
                          <td className="py-2.5 pr-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${fight.result === "Vitoria" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                              {fight.result}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-xs text-muted-foreground">{fight.method}</td>
                          <td className="py-2.5 pr-3 text-xs text-muted-foreground">{fight.round}</td>
                          <td className="py-2.5 pr-3 text-xs text-muted-foreground">{fight.time}</td>
                          <td className="py-2.5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${fight.isOfficial ? "bg-primary/15 text-primary" : "bg-[#1b2027] text-muted-foreground"}`}>
                              {fight.isOfficial ? "Oficial" : "Treino"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Radar */}
            <div className="rounded-2xl border border-[#232832] bg-[#131820] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                  <Radar className="h-4 w-4 text-primary" />
                </span>
                <h2 className="font-sans text-base font-bold uppercase tracking-[0.06em] text-foreground">Radar de estilo</h2>
              </div>
              <RadarChart values={radarValues} />
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {["Raciocinio", "Resistencia", "Velocidade", "Stamina", "Forca"].map((label) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff5b00]/60" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ── Certificados + Privacidade ── */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-[#232832] bg-[#131820] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.32)] lg:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10">
                  <Award className="h-4 w-4 text-yellow-400" />
                </span>
                <h2 className="font-sans text-base font-bold uppercase tracking-[0.06em] text-foreground">Certificados e graduacoes</h2>
              </div>

              {isOwnProfile && (
                <div className="mb-4 rounded-xl border border-[#2a3040] bg-[#1b2027] p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adicionar certificado</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div><Label className="text-xs text-muted-foreground">Titulo</Label><Input value={newCert.title} onChange={(e) => setNewCert((prev) => ({ ...prev, title: e.target.value }))} className="mt-1 bg-[#131820] border-[#2a3040]" /></div>
                    <div><Label className="text-xs text-muted-foreground">Emissor</Label><Input value={newCert.issuer} onChange={(e) => setNewCert((prev) => ({ ...prev, issuer: e.target.value }))} className="mt-1 bg-[#131820] border-[#2a3040]" /></div>
                    <div><Label className="text-xs text-muted-foreground">Data</Label><Input type="date" value={newCert.date} onChange={(e) => setNewCert((prev) => ({ ...prev, date: e.target.value }))} className="mt-1 bg-[#131820] border-[#2a3040]" /></div>
                    <div><Label className="text-xs text-muted-foreground">Categoria</Label><Input value={newCert.category} onChange={(e) => setNewCert((prev) => ({ ...prev, category: e.target.value }))} className="mt-1 bg-[#131820] border-[#2a3040]" /></div>
                    <div className="md:col-span-2 flex items-center gap-2 rounded-lg border border-[#2a3040] bg-[#131820] px-3 py-2">
                      <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <input type="file" accept="image/*,application/pdf" onChange={(e) => void handleCertFileSelect(e.target.files?.[0])} className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary/15 file:px-2 file:py-1 file:text-primary" />
                      <span className="shrink-0 text-[11px] text-muted-foreground">{certFileBusy ? "Processando..." : certEvidenceFileName || "Sem arquivo"}</span>
                    </div>
                  </div>
                  <button onClick={addCertificate} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#ff5b00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e65200]">
                    Adicionar certificado
                  </button>
                </div>
              )}

              {certs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Award className="h-7 w-7 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum certificado registrado.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {certs.map((cert) => (
                    <div key={cert.id} className="rounded-xl border border-[#2a3040] bg-[#1b2027] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground">{cert.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{cert.issuer} · {cert.date} · {cert.category}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cert.status === "Verificado" ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-400"}`}>
                          {cert.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isOwnProfile ? (
              <div className="rounded-2xl border border-[#232832] bg-[#131820] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10">
                    <Shield className="h-4 w-4 text-sky-400" />
                  </span>
                  <h2 className="font-sans text-base font-bold uppercase tracking-[0.06em] text-foreground">Privacidade</h2>
                </div>
                <div className="space-y-2">
                  {[
                    { key: "publicProfile" as const, label: "Perfil publico", hint: "Descoberta por outros atletas" },
                    { key: "showWeight" as const, label: "Mostrar peso", hint: "Exibe categoria e peso atual" },
                    { key: "showFullRecord" as const, label: "Cartel completo", hint: "Oculta rounds/metodos quando desligado" },
                    { key: "allowChallenges" as const, label: "Aceitar desafios", hint: "Permite desafios diretos" },
                    { key: "allowMessages" as const, label: "Aceitar mensagens", hint: "Habilita DM com atletas" },
                  ].map(({ key, label, hint }) => (
                    <div key={key} className="flex items-center justify-between rounded-xl border border-[#2a3040] bg-[#1b2027] px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">{hint}</p>
                      </div>
                      <Switch checked={privacy[key]} onCheckedChange={() => togglePrivacy(key)} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {/* ── Social + Resumo ── */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-[#232832] bg-[#131820] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.32)] lg:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                  <Users className="h-4 w-4 text-primary" />
                </span>
                <h2 className="font-sans text-base font-bold uppercase tracking-[0.06em] text-foreground">Area social</h2>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Seguidores", value: social.followers },
                  { label: "Seguindo", value: social.following },
                  { label: "Reputacao", value: "Elite" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-[#2a3040] bg-[#1b2027] p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {social.badges.map((item) => (
                  <span key={item} className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{item}</span>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {TESTIMONIALS.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-[#2a3040] bg-[#1b2027] p-3">
                    <p className="text-sm text-foreground">{entry.text}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">{entry.author} · {entry.role}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#232832] bg-[#131820] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                  <Target className="h-4 w-4 text-primary" />
                </span>
                <h2 className="font-sans text-base font-bold uppercase tracking-[0.06em] text-foreground">Resumo de atleta</h2>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">Resumo publico para patrocinadores e olheiros.</p>
              <Textarea
                rows={8}
                placeholder="Atleta focado em competicao, com destaque em grappling e alto volume de treinos."
                defaultValue={publicProfile?.bio || ""}
                disabled={!isOwnProfile}
                className="bg-[#1b2027] border-[#2a3040] resize-none"
              />
              <button
                disabled={!isOwnProfile}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5b00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e65200] disabled:opacity-40"
              >
                <Target className="h-4 w-4" /> Salvar resumo
              </button>
            </div>
          </section>

          {/* ── FAB Desktop ── */}
          {isOwnProfile && (
            <div className="fixed bottom-20 right-4 z-40 hidden gap-2 lg:flex">
              <button onClick={() => setEditModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#1b2027] px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg hover:bg-[#242b36]">
                <Edit3 className="h-4 w-4" /> Editar
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#1b2027] px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg hover:bg-[#242b36]">
                <Share2 className="h-4 w-4" /> Compartilhar
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#1b2027] px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg hover:bg-[#242b36]">
                <Download className="h-4 w-4" /> Baixar card
              </button>
              <button onClick={() => router.push("/chat")} className="inline-flex items-center gap-2 rounded-xl bg-[#ff5b00] px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-[#e65200]">
                <MessageCircle className="h-4 w-4" /> Chat
              </button>
            </div>
          )}

          {/* ── FAB Mobile ── */}
          {isOwnProfile && (
            <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-[#232832] bg-[#0b0d10]/95 p-2 backdrop-blur lg:hidden">
              <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
                <button onClick={() => setEditModalOpen(true)} className="flex h-10 items-center justify-center rounded-xl bg-[#1b2027] text-muted-foreground hover:bg-[#242b36]"><Edit3 className="h-4 w-4" /></button>
                <button className="flex h-10 items-center justify-center rounded-xl bg-[#1b2027] text-muted-foreground hover:bg-[#242b36]"><Share2 className="h-4 w-4" /></button>
                <button className="flex h-10 items-center justify-center rounded-xl bg-[#1b2027] text-muted-foreground hover:bg-[#242b36]"><Download className="h-4 w-4" /></button>
                <button onClick={() => router.push("/chat")} className="flex h-10 items-center justify-center rounded-xl bg-[#ff5b00] text-white hover:bg-[#e65200]"><MessageCircle className="h-4 w-4" /></button>
              </div>
            </div>
          )}

          {/* ── Modal de edição ── */}
          {isOwnProfile && (
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
              <DialogContent className="sm:max-w-lg border-[#232832] bg-[#131820]">
                <DialogHeader>
                  <DialogTitle className="font-sans text-lg font-bold uppercase tracking-wide">Editar perfil</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-[#2a3040] bg-[#1b2027] p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#0f1318] text-lg font-bold">
                        {displayAvatar ? <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" /> : initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{editForm.nome || displayName}</p>
                        <p className="text-xs text-muted-foreground">{(user?.nome || "").trim()}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploadBusy} className="rounded-lg bg-[#ff5b00] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#e65200] disabled:opacity-50">
                      {avatarUploadBusy ? "Enviando..." : "Mudar foto"}
                    </button>
                  </div>
                  <div><Label className="text-xs text-muted-foreground">Nome</Label><Input value={editForm.nome} onChange={(e) => setEditForm((prev) => ({ ...prev, nome: e.target.value }))} className="mt-1 bg-[#1b2027] border-[#2a3040]" /></div>
                  <div><Label className="text-xs text-muted-foreground">Academia</Label><Input value={editForm.academia} onChange={(e) => setEditForm((prev) => ({ ...prev, academia: e.target.value }))} className="mt-1 bg-[#1b2027] border-[#2a3040]" /></div>
                  <div><Label className="text-xs text-muted-foreground">Cidade</Label><Input value={editForm.cidade} onChange={(e) => setEditForm((prev) => ({ ...prev, cidade: e.target.value }))} className="mt-1 bg-[#1b2027] border-[#2a3040]" /></div>
                  <div><Label className="text-xs text-muted-foreground">Bio</Label><Textarea rows={4} value={editForm.bio} onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))} className="mt-1 bg-[#1b2027] border-[#2a3040] resize-none" /></div>
                  <button onClick={saveEditedProfile} disabled={saveProfileBusy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5b00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e65200] disabled:opacity-50">
                    {saveProfileBusy ? "Salvando..." : "Salvar alteracoes"}
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          )}

        </div>
      </div>
    </main>
  )
}

