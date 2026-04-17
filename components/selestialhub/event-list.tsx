"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { EventCard } from "./event-card"
import { EventFilters, type EventFilterState } from "./event-filters"
import { CalendarDays, Radio, Sparkles, Ticket, Zap } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

interface Tournament {
  id: number
  name: string
  modality: string
  city: string
  date: string
  time: string
  status: "upcoming" | "live" | "finished"
  level: string
  prize_pool: number
  max_participants: number
  description: string
}

export function EventList() {
  const [filters, setFilters] = useState<EventFilterState>({
    search: "",
    modalidade: "",
    status: "",
    level: "",
  })

  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Carregar eventos da API
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/tournaments`)
        if (response.ok) {
          const data = await response.json()
          setTournaments(data.tournaments || [])
        } else {
          setError("Erro ao carregar eventos")
        }
      } catch (err) {
        console.error("Erro ao carregar eventos:", err)
        setError("Falha ao conectar com a API")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTournaments()
  }, [])

  // Filtrar eventos
  const filteredEvents = useMemo(() => {
    return tournaments.filter((event) => {
      // Search by name
      if (
        filters.search &&
        !event.name.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false
      }

      // Filter by modalidade
      const normalizedEventModality = event.modality.toLowerCase().replaceAll("_", "-")
      if (filters.modalidade && normalizedEventModality !== filters.modalidade.toLowerCase()) {
        return false
      }

      // Filter by status - converter para formatos compatíveis
      if (filters.status) {
        const eventStatus = event.status === "upcoming" ? "open" : event.status
        if (eventStatus !== filters.status) {
          return false
        }
      }

      // Filter by level
      if (
        filters.level &&
        event.level.toLowerCase() !== filters.level.toLowerCase()
      ) {
        return false
      }

      return true
    })
  }, [filters, tournaments])

  // Separar por status: ao vivo e próximos
  const liveEvents = filteredEvents.filter((e) => e.status === "live")
  const upcomingEvents = filteredEvents
    .filter((e) => e.status === "upcoming" || e.status === "finished")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const eventSummary = [
    {
      label: "Ao vivo",
      value: String(liveEvents.length),
      hint: "Disputas acontecendo agora",
      icon: Radio,
      tone: "bg-emerald-500/10 text-emerald-400",
    },
    {
      label: "Próximos",
      value: String(upcomingEvents.filter((event) => event.status === "upcoming").length),
      hint: "Torneios com agenda aberta",
      icon: CalendarDays,
      tone: "bg-sky-500/10 text-sky-400",
    },
    {
      label: "Vagas totais",
      value: String(filteredEvents.reduce((sum, event) => sum + event.max_participants, 0)),
      hint: "Capacidade somada",
      icon: Ticket,
      tone: "bg-[#ff5b00]/10 text-[#ff8a4c]",
    },
    {
      label: "Destaque",
      value: filteredEvents[0]?.name?.split(" ").slice(0, 2).join(" ") || "Sem evento",
      hint: "Primeiro evento da fila",
      icon: Sparkles,
      tone: "bg-yellow-500/10 text-yellow-400",
    },
  ]

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive mb-6">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {eventSummary.map((item) => (
          <div key={item.label} className="rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="mt-1 truncate font-serif text-2xl font-bold text-foreground">{item.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{item.hint}</p>
          </div>
        ))}
      </section>

      <EventFilters onFilterChange={setFilters} />

      {isLoading ? (
        <div className="rounded-2xl border border-[#232832] bg-[#131820] py-14 text-center text-muted-foreground shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
          Carregando eventos...
        </div>
      ) : (
        <>
          {/* AO VIVO Section */}
          {liveEvents.length > 0 && (
            <div className="rounded-3xl border border-[#232832] bg-[#131820] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
              <div className="mb-6 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Zap className="h-4 w-4 animate-pulse text-emerald-400" />
                </span>
                <h2 className="font-sans text-xl font-black uppercase tracking-[0.06em] text-foreground">
                  🔴 Ao Vivo Agora
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {liveEvents.map((event) => (
                  <Link key={event.id} href={`/eventos/${event.id}`}>
                    <EventCard
                      id={event.id}
                      title={event.name}
                      modalidade={event.modality}
                      data={event.date}
                      hora={event.time}
                      local={event.city}
                      participants={event.status === "live" ? Math.max(8, Math.floor(event.max_participants * 0.7)) : Math.max(4, Math.floor(event.max_participants * 0.45))}
                      maxParticipants={event.max_participants}
                      level={event.level}
                      prizePool={event.prize_pool.toString()}
                      status={event.status === "upcoming" ? "open" : event.status}
                    />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* PRÓXIMOS Section */}
          <div className="rounded-3xl border border-[#232832] bg-[#131820] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-sans text-xl font-black uppercase tracking-[0.06em] text-foreground">
                  Próximos Eventos
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Escolha sua próxima competição e acompanhe as vagas disponíveis.</p>
              </div>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="rounded-2xl border border-[#232832] bg-[#0f1318] p-8 text-center">
                <p className="text-muted-foreground">
                  {filteredEvents.length === 0 && Object.values(filters).some((v) => v)
                    ? "Nenhum evento encontrado com esses filtros"
                    : "Carregando ou nenhum evento disponível"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {upcomingEvents.map((event) => (
                  <Link key={event.id} href={`/eventos/${event.id}`}>
                    <EventCard
                      id={event.id}
                      title={event.name}
                      modalidade={event.modality}
                      data={event.date}
                      hora={event.time}
                      local={event.city}
                      participants={event.status === "finished" ? event.max_participants : Math.max(4, Math.floor(event.max_participants * 0.55))}
                      maxParticipants={event.max_participants}
                      level={event.level}
                      prizePool={event.prize_pool.toString()}
                      status={event.status === "upcoming" ? "open" : event.status}
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Results Summary */}
          {!isLoading && (
            <div className="border-t border-[#232832] pt-5 text-center">
              <p className="text-sm text-muted-foreground">
                {liveEvents.length > 0 && `${liveEvents.length} ao vivo + `}
                {upcomingEvents.length} próximos = {filteredEvents.length} total
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
