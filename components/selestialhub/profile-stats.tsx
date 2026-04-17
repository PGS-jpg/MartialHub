"use client"

import { Activity, TrendingUp, Calendar, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"

export function ProfileStats() {
  const stats = [
    {
      label: "Lutas Totais",
      value: "28",
      icon: Activity,
      color: "text-blue-500",
      trend: "+2",
    },
    {
      label: "Taxa de Vitória",
      value: "89.3%",
      icon: TrendingUp,
      color: "text-green-500",
      trend: "+3.2%",
    },
    {
      label: "Dias Ativo",
      value: "142",
      icon: Calendar,
      color: "text-purple-500",
      trend: "Consistente",
    },
    {
      label: "Tempo Treino",
      value: "2.5h",
      icon: Clock,
      color: "text-orange-500",
      trend: "Por semana",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="bg-card border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-serif font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
