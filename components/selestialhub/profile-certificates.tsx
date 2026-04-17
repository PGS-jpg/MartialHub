"use client"

import { Award, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

const certificates = [
  {
    id: 1,
    title: "Faixa Roxa BJJ",
    issuer: "IBJJF",
    date: "Ago 2024",
    category: "Faixa",
  },
  {
    id: 2,
    title: "Campeão Regional BJJ",
    issuer: "Federação",
    date: "Jul 2024",
    category: "Torneio",
  },
  {
    id: 3,
    title: "Certificado BJJ",
    issuer: "Nova União",
    date: "Jan 2024",
    category: "Academia",
  },
  {
    id: 4,
    title: "Instrutor Autorizado",
    issuer: "Academia",
    date: "Ago 2023",
    category: "Instrução",
  },
]

export function ProfileCertificates() {
  const categories = {
    "Faixa": "bg-purple-500/20 text-purple-500",
    "Torneio": "bg-gold/20 text-yellow-500",
    "Academia": "bg-blue-500/20 text-blue-500",
    "Instrução": "bg-green-500/20 text-green-500",
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-6">
      <h3 className="font-serif font-bold text-lg uppercase tracking-wide text-foreground mb-4">
        Certificados & Títulos
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {certificates.map((cert) => (
          <Card key={cert.id} className="bg-muted/30 border-border p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 text-amber-500" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-serif font-bold text-sm text-foreground mb-1">
                  {cert.title}
                </h4>
                <p className="text-xs text-muted-foreground mb-2">{cert.issuer}</p>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${categories[cert.category as keyof typeof categories]}`}
                  >
                    {cert.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {cert.date}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
