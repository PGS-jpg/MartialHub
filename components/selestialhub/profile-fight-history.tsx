"use client"

import { CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

const fights = [
  {
    id: 1,
    opponent: "Felipe Rocha",
    academy: "Checkmat",
    result: "win",
    date: "20 Mar 2026",
    technique: "Triângulo",
    division: "Médio",
  },
  {
    id: 2,
    opponent: "Bruno Tavares",
    academy: "Gracie Barra",
    result: "win",
    date: "18 Mar 2026",
    technique: "Raspagem",
    division: "Médio",
  },
  {
    id: 3,
    opponent: "Gabriel Souza",
    academy: "Nova União",
    result: "loss",
    date: "15 Mar 2026",
    technique: "Arm Triangle",
    division: "Médio",
  },
  {
    id: 4,
    opponent: "Rodrigo Lima",
    academy: "Atos",
    result: "win",
    date: "12 Mar 2026",
    technique: "Chave de Braço",
    division: "Médio",
  },
]

export function ProfileFightHistory() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-6">
      <h3 className="font-serif font-bold text-lg uppercase tracking-wide text-foreground mb-4">
        Histórico de Lutas
      </h3>
      
      <div className="space-y-3">
        {fights.map((fight) => (
          <Card key={fight.id} className="bg-muted/30 border-border p-4">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                fight.result === "win" 
                  ? "bg-green-500/20"
                  : "bg-red-500/20"
              }`}>
                {fight.result === "win" ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-serif font-bold text-sm uppercase text-foreground truncate">
                    {fight.opponent}
                  </h4>
                  <Badge 
                    variant="secondary" 
                    className={`shrink-0 text-xs ${
                      fight.result === "win"
                        ? "bg-green-500/20 text-green-500"
                        : "bg-red-500/20 text-red-500"
                    }`}
                  >
                    {fight.result === "win" ? "Vitória" : "Derrota"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{fight.academy}</span>
                  <span>•</span>
                  <span>{fight.technique}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">{fight.date}</p>
                <Badge variant="outline" className="text-[10px] border-border text-muted-foreground mt-1">
                  {fight.division}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
