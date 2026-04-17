"use client"

import { Calendar, MapPin, Users, Trophy, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface EventCardProps {
  id: number
  title: string
  modalidade: string
  data: string
  hora: string
  local: string
  participants: number
  maxParticipants: number
  level: string
  prizePool: string
  status: "open" | "closed" | "live" | "finished"
  image?: string
}

const statusConfig = {
  open: {
    label: "Inscrições Abertas",
    color: "bg-green-500/20 text-green-500",
    buttonText: "Inscrever-se",
  },
  closed: {
    label: "Inscrições Fechadas",
    color: "bg-red-500/20 text-red-500",
    buttonText: "Fechado",
  },
  live: {
    label: "Ao Vivo",
    color: "bg-blue-500/20 text-blue-500",
    buttonText: "Acompanhar",
  },
  finished: {
    label: "Finalizado",
    color: "bg-gray-500/20 text-gray-500",
    buttonText: "Ver Resultados",
  },
}

export function EventCard({
  id,
  title,
  modalidade,
  data,
  hora,
  local,
  participants,
  maxParticipants,
  level,
  prizePool,
  status,
}: EventCardProps) {
  const config = statusConfig[status]
  const percentFull = Math.round((participants / maxParticipants) * 100)

  return (
    <Card className="group overflow-hidden rounded-2xl border border-[#232832] bg-[#0f1318] transition-all duration-300 hover:-translate-y-1 hover:border-[#ff5b00]/45 hover:shadow-[0_18px_40px_rgba(0,0,0,0.38)]">
      {/* Header com gradient e status */}
      <div className="relative h-36 bg-gradient-to-br from-[#1d130d] via-[#181b21] to-[#101318]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,91,0,0.16),transparent_42%)]" />
        <Badge className={`absolute right-3 top-3 border-0 ${config.color}`}>{config.label}</Badge>
        <div className="absolute inset-0 flex items-center justify-center">
          <Trophy className="h-14 w-14 text-[#ff5b00]/30 transition-transform duration-300 group-hover:scale-110" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {/* Título e Modalidade */}
        <div>
          <h3 className="mb-2 font-sans text-base font-black uppercase tracking-[0.04em] text-foreground">
            {title}
          </h3>
          <Badge variant="secondary" className="bg-[#1b2027] text-muted-foreground">
            {modalidade}
          </Badge>
        </div>

        {/* Data e Hora */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 text-[#ff8a4c]" />
          <span>{data}</span>
          <Clock className="ml-2 h-4 w-4 text-[#ff8a4c]" />
          <span>{hora}</span>
        </div>

        {/* Local */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-[#ff8a4c]" />
          <span>{local}</span>
        </div>

        {/* Participantes Progress Bar */}
        <div className="rounded-xl border border-[#232832] bg-[#131820] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>
                {participants}/{maxParticipants} atletas
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{percentFull}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#232832]">
            <div
              className="h-2 rounded-full bg-[#ff5b00] transition-all duration-300"
              style={{ width: `${percentFull}%` }}
            />
          </div>
        </div>

        {/* Nível e Premiação */}
        <div className="flex items-center justify-between border-t border-[#232832] pt-1 text-xs">
          <Badge variant="outline" className="border-[#ff5b00]/45 text-[#ff8a4c]">
            {level}
          </Badge>
          <span className="font-semibold text-yellow-400">R$ {prizePool}</span>
        </div>

        {/* Action Button */}
        <Button
          disabled={status !== "open"}
          className={`w-full ${
            status === "open"
              ? "bg-[#ff5b00] text-white hover:bg-[#e65200]"
              : "cursor-not-allowed bg-[#1b2027] text-muted-foreground"
          }`}
          size="sm"
        >
          {config.buttonText}
        </Button>
      </div>
    </Card>
  )
}
