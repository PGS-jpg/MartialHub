"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useState, useMemo, useEffect } from "react"
import { LocateFixed, MapPinned, Plus, ShieldAlert, Sparkles } from "lucide-react"
import { AcademyCard } from "./academy-card"
import { AcademyFilters, type AcademyFilterState } from "./academy-filters"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useUser } from "@/context/user-context"

const AcademyMap = dynamic(() => import("./academy-map").then((mod) => mod.AcademyMap), {
  ssr: false,
  loading: () => <p className="text-sm text-muted-foreground">Carregando mapa...</p>,
})

interface Academy {
  id: number
  name: string
  city: string
  estado: string
  modalidade: string
  rating: number
  reviews: number
  instructors: number
  faixaMinima: string
  phone: string
  isSponsored: boolean
  ownerUserId: number | null
  lat: number
  lng: number
  distanceKm?: number
}

interface AcademyApiResponse {
  id: number
  nome: string
  endereco: string
  cidade: string
  modalidade: string
  contato: string
  created_by_user_id?: number | null
  lat: number
  lng: number
  is_sponsored: boolean
  distance_km?: number
}

const API_BASES = Array.from(
  new Set(
    [
      process.env.NEXT_PUBLIC_API_URL,
      "http://localhost:5001",
      "http://127.0.0.1:5001",
      "http://localhost:5000",
      "http://127.0.0.1:5000",
    ].filter((value): value is string => Boolean(value))
  )
)

const fetchApiWithFallback = async (path: string, init?: RequestInit) => {
  let lastError: unknown = null

  for (const base of API_BASES) {
    try {
      const response = await fetch(`${base}${path}`, init)
      return response
    } catch (error) {
      lastError = error
    }
  }

  throw lastError ?? new Error("API indisponível")
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .trim()

const toRad = (value: number) => (value * Math.PI) / 180

const calculateDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371 // km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function AcademyList() {
  const { user, isAcademyPremium } = useUser()
  const [filters, setFilters] = useState<AcademyFilterState>({
    search: "",
    modalidade: "",
    city: "",
    estado: "",
    minRating: "",
    faixa: "",
  })
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [radiusKm, setRadiusKm] = useState(100)
  const [showAll, setShowAll] = useState(true)
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loadingAcademies, setLoadingAcademies] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingAcademyId, setDeletingAcademyId] = useState<number | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form, setForm] = useState({
    nome: "",
    endereco: "",
    cidade: "",
    modalidade: "",
    contato: "",
    lat: "",
    lng: "",
  })

  const loadAcademies = async () => {
    setLoadingAcademies(true)
    setLoadError(null)
    try {
      const res = await fetchApiWithFallback("/api/academies")
      if (!res.ok) {
        setAcademies([])
        setLoadError("Não foi possível carregar academias agora")
        return
      }
      const data = await res.json()
      const rows = Array.isArray(data.academies) ? data.academies : []

      const mapped: Academy[] = rows.map((acad: AcademyApiResponse) => ({
        id: acad.id,
        name: acad.nome,
        city: acad.cidade || "Cidade não informada",
        estado: "",
        modalidade: acad.modalidade || "Geral",
        rating: 4.5,
        reviews: 0,
        instructors: 1,
        faixaMinima: "Branca",
        phone: acad.contato || "Não informado",
        isSponsored: Boolean(acad.is_sponsored),
        ownerUserId: acad.created_by_user_id ?? null,
        lat: Number(acad.lat) || -23.55052,
        lng: Number(acad.lng) || -46.633308,
        distanceKm: acad.distance_km,
      }))

      setAcademies(mapped)
    } catch {
      setAcademies([])
      setLoadError("Erro de conexão ao carregar academias")
    } finally {
      setLoadingAcademies(false)
    }
  }

  useEffect(() => {
    void loadAcademies()
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocalização não suportada pelo navegador")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setForm((prev) => ({
          ...prev,
          lat: prev.lat || position.coords.latitude.toFixed(6),
          lng: prev.lng || position.coords.longitude.toFixed(6),
        }))
        setLocationError(null)
      },
      (error) => {
        setLocationError("Não foi possível obter sua localização. Permita acesso.")
      },
      { enableHighAccuracy: true, maximumAge: 60000 }
    )
  }, [])

  const academiesWithDistance = useMemo(() => {
    return academies.map((academy) => {
      if (!userLocation) return academy
      const distanceKm = calculateDistanceKm(userLocation.lat, userLocation.lng, academy.lat, academy.lng)
      return { ...academy, distanceKm }
    })
  }, [userLocation])

  const filteredAcademies = useMemo(() => {
    return academiesWithDistance.filter((academy) => {
      if (filters.search && !academy.name.toLowerCase().includes(filters.search.toLowerCase())) return false
      if (filters.modalidade && normalize(academy.modalidade) !== normalize(filters.modalidade)) return false
      if (filters.city && normalize(academy.city) !== normalize(filters.city)) return false
      if (filters.estado && academy.estado && academy.estado.toLowerCase() !== filters.estado.toLowerCase()) return false
      if (filters.minRating && academy.rating < parseFloat(filters.minRating)) return false
      if (filters.faixa && academy.faixaMinima.toLowerCase() !== filters.faixa.toLowerCase()) return false
      return true
    })
  }, [academiesWithDistance, filters])

  const visibleAcademies = useMemo(() => {
    if (!userLocation) return filteredAcademies
    return filteredAcademies
      .filter((academy) => (academy.distanceKm ?? Infinity) <= radiusKm)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
  }, [filteredAcademies, userLocation, radiusKm])

  const displayedAcademies = showAll ? filteredAcademies : visibleAcademies
  const sponsoredCount = useMemo(() => displayedAcademies.filter((academy) => academy.isSponsored).length, [displayedAcademies])
  const citiesCount = useMemo(() => new Set(displayedAcademies.map((academy) => academy.city)).size, [displayedAcademies])
  const modalitiesCount = useMemo(() => new Set(displayedAcademies.map((academy) => academy.modalidade)).size, [displayedAcademies])
  const hasOwnedAcademy = useMemo(() => {
    if (!user) return false
    return academies.some((academy) => academy.ownerUserId === user.id)
  }, [academies, user])

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocalização não suportada")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
        setLocationError(null)
      },
      () => {
        setLocationError("Permissão de localização negada")
      },
      { enableHighAccuracy: true, maximumAge: 60000 }
    )
  }

  const handleCreateAcademy = async () => {
    if (!user) {
      setCreateError("Você precisa estar logado para cadastrar uma academia")
      return
    }

    if (!isAcademyPremium) {
      setCreateError("Somente contas com plano premium de academia podem cadastrar")
      return
    }

    if (hasOwnedAcademy) {
      setCreateError("Limite atingido: cada usuário pode cadastrar apenas 1 academia")
      return
    }

    const latValue = Number(form.lat)
    const lngValue = Number(form.lng)

    if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
      setCreateError("Informe latitude e longitude válidas")
      return
    }

    if (latValue < -90 || latValue > 90 || lngValue < -180 || lngValue > 180) {
      setCreateError("Latitude deve estar entre -90 e 90, e longitude entre -180 e 180")
      return
    }

    setIsSubmitting(true)
    setCreateError(null)

    try {
      const res = await fetchApiWithFallback("/api/academies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          nome: form.nome.trim(),
          endereco: form.endereco.trim(),
          cidade: form.cidade.trim(),
          modalidade: form.modalidade.trim(),
          contato: form.contato.trim(),
          lat: latValue,
          lng: lngValue,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setCreateError(data.error || "Não foi possível cadastrar academia")
        return
      }

      setForm({ nome: "", endereco: "", cidade: "", modalidade: "", contato: "", lat: "", lng: "" })
      setIsCreateOpen(false)
      await loadAcademies()
      setCreateError(null)
    } catch {
      setCreateError("Erro de conexão ao cadastrar academia")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAcademy = async (academyId: number) => {
    if (!user) {
      setDeleteError("Você precisa estar logado para excluir uma academia")
      return
    }

    setDeleteError(null)
    setDeletingAcademyId(academyId)

    try {
      const res = await fetchApiWithFallback(`/api/academies/${academyId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      })
      const data = await res.json()

      if (!res.ok) {
        setDeleteError(data.error || "Não foi possível excluir a academia")
        return
      }

      await loadAcademies()
      setDeleteError(null)
    } catch {
      setDeleteError("Erro de conexão ao excluir academia")
    } finally {
      setDeletingAcademyId(null)
    }
  }


  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: showAll ? "Academias visíveis" : "Dentro do raio",
            value: String(displayedAcademies.length),
            hint: showAll ? "Resultado com os filtros atuais" : `Até ${radiusKm} km da sua localização`,
            icon: MapPinned,
            tone: "bg-[#ff5b00]/10 text-[#ff8a4c]",
          },
          {
            label: "Patrocinadas",
            value: String(sponsoredCount),
            hint: "Academias com destaque ativo",
            icon: Sparkles,
            tone: "bg-yellow-500/10 text-yellow-400",
          },
          {
            label: "Cidades",
            value: String(citiesCount),
            hint: "Locais atendidos na busca",
            icon: LocateFixed,
            tone: "bg-sky-500/10 text-sky-400",
          },
          {
            label: "Modalidades",
            value: String(modalitiesCount),
            hint: "Diversidade de estilos cadastrados",
            icon: ShieldAlert,
            tone: "bg-emerald-500/10 text-emerald-400",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="mt-1 font-serif text-3xl font-bold text-foreground">{item.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{item.hint}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-sans text-xl font-black uppercase tracking-[0.06em] text-foreground">Academias cadastradas</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Cadastro aberto apenas para contas com plano premium de academia.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-2 bg-[#ff5b00] text-white hover:bg-[#e65200]"
              disabled={!isAcademyPremium || hasOwnedAcademy}
              title={!isAcademyPremium ? "Requer plano premium de academia" : hasOwnedAcademy ? "Limite de 1 academia por usuário" : "Cadastrar academia"}
            >
              <Plus className="w-4 h-4" />
              Cadastrar academia
            </Button>
          </DialogTrigger>
          <DialogContent className="border-[#232832] bg-[#131820]">
            <DialogHeader>
              <DialogTitle className="font-sans uppercase tracking-wide">Novo cadastro de academia</DialogTitle>
              <DialogDescription>
                Disponível para assinantes do plano premium de academia.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                placeholder="Nome da academia"
                value={form.nome}
                onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                className="border-[#2a3040] bg-[#1b2027]"
              />
              <p className="text-[11px] text-muted-foreground -mt-1">Opcional. Se não preencher, o sistema cria automaticamente.</p>
              <Input
                placeholder="Endereço"
                value={form.endereco}
                onChange={(e) => setForm((prev) => ({ ...prev, endereco: e.target.value }))}
                className="border-[#2a3040] bg-[#1b2027]"
              />
              <p className="text-[11px] text-muted-foreground -mt-1">Opcional. Apenas latitude e longitude são obrigatórias.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Cidade"
                  value={form.cidade}
                  onChange={(e) => setForm((prev) => ({ ...prev, cidade: e.target.value }))}
                  className="border-[#2a3040] bg-[#1b2027]"
                />
                <Input
                  placeholder="Modalidade (ex: BJJ)"
                  value={form.modalidade}
                  onChange={(e) => setForm((prev) => ({ ...prev, modalidade: e.target.value }))}
                  className="border-[#2a3040] bg-[#1b2027]"
                />
              </div>
              <Input
                placeholder="Contato da academia (WhatsApp/Telefone)"
                value={form.contato}
                onChange={(e) => setForm((prev) => ({ ...prev, contato: e.target.value }))}
                className="border-[#2a3040] bg-[#1b2027]"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Latitude"
                  value={form.lat}
                  onChange={(e) => setForm((prev) => ({ ...prev, lat: e.target.value }))}
                  className="border-[#2a3040] bg-[#1b2027]"
                />
                <Input
                  placeholder="Longitude"
                  value={form.lng}
                  onChange={(e) => setForm((prev) => ({ ...prev, lng: e.target.value }))}
                  className="border-[#2a3040] bg-[#1b2027]"
                />
              </div>

              {createError && <p className="text-sm text-red-400">{createError}</p>}

              <Button
                onClick={handleCreateAcademy}
                className="w-full bg-[#ff5b00] text-white hover:bg-[#e65200]"
                disabled={isSubmitting || !isAcademyPremium || hasOwnedAcademy}
              >
                {isSubmitting ? "Salvando..." : "Salvar academia"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!isAcademyPremium && (
        <div className="rounded-2xl border border-[#6b560f] bg-gradient-to-br from-[#2a2108] to-[#171307] p-4 flex items-center gap-3 shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
          <ShieldAlert className="w-4 h-4 text-yellow-400" />
          <p className="text-xs text-yellow-200 flex-1">
            Você está no plano atleta. Faça upgrade para o plano premium de academia para publicar academias.
          </p>
          <Link href="/planos/academia" className="text-xs font-semibold text-[#FFD700] hover:underline whitespace-nowrap">
            Ver plano
          </Link>
        </div>
      )}

      {isAcademyPremium && hasOwnedAcademy && (
        <div className="rounded-2xl border border-[#6b560f] bg-gradient-to-br from-[#2a2108] to-[#171307] p-4 flex items-center gap-3 shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
          <ShieldAlert className="w-4 h-4 text-yellow-400" />
          <p className="text-xs text-yellow-200 flex-1">
            Limite atingido: cada usuário pode cadastrar apenas 1 academia.
          </p>
        </div>
      )}

      <AcademyFilters onFilterChange={setFilters} onLocationRequest={requestLocation} />

      {loadError && (
        <div className="rounded-2xl border border-red-500/25 bg-[#2a1418] p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-red-300">{loadError}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadAcademies()}
            disabled={loadingAcademies}
          >
            {loadingAcademies ? "Tentando..." : "Tentar novamente"}
          </Button>
        </div>
      )}

      {locationError ? (
        <p className="text-sm text-yellow-400">{locationError}</p>
      ) : userLocation ? (
        <p className="text-sm text-emerald-400">Localização detectada: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Buscando sua localização...</p>
      )}

      <AcademyMap
        userLocation={userLocation}
        academies={displayedAcademies}
        radiusKm={radiusKm}
        onRadiusChange={setRadiusKm}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${showAll ? "bg-[#1b2027] text-foreground hover:bg-[#242b36]" : "bg-[#ff5b00] text-white hover:bg-[#e65200]"}`}
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? "Mostrar somente próximas" : "Mostrar todas"}
          </button>
          {!showAll && userLocation && (
            <span className="text-xs text-muted-foreground">Raio: {radiusKm} km</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {loadingAcademies
            ? "Carregando academias..."
            : `${displayedAcademies.length} academia${displayedAcademies.length !== 1 ? "s" : ""} encontrad${displayedAcademies.length !== 1 ? "as" : "a"}`}
        </p>
      </div>

      {/* Academies Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!loadingAcademies && displayedAcademies.map((academy) => (
          <AcademyCard
            key={academy.id}
            {...academy}
            canDelete={Boolean(user && academy.ownerUserId === user.id)}
            isDeleting={deletingAcademyId === academy.id}
            onDelete={() => void handleDeleteAcademy(academy.id)}
          />
        ))}
      </div>

      {deleteError && <p className="mt-4 text-sm text-red-400">{deleteError}</p>}

      {!loadingAcademies && filteredAcademies.length === 0 && (
        <div className="rounded-2xl border border-[#232832] bg-[#131820] py-12 text-center shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
          <p className="text-muted-foreground mb-2">Nenhuma academia cadastrada ainda</p>
          <p className="text-xs text-muted-foreground">Quando uma conta premium de academia cadastrar, ela aparecerá aqui.</p>
        </div>
      )}
    </div>
  )
}
