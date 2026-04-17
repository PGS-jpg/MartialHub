"use client"

import { useState } from "react"
import { Eye, Lock, Globe } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function ProfilePrivacy() {
  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showXP: true,
    showLocation: true,
    showRanking: true,
    allowMessages: true,
    allowChallenges: true,
  })

  const togglePrivacy = (key: keyof typeof privacy) => {
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const settings = [
    {
      key: "publicProfile",
      icon: Globe,
      label: "Perfil Público",
      description: "Permite que outros atletas vejam seu perfil",
    },
    {
      key: "showXP",
      icon: Eye,
      label: "Mostrar XP",
      description: "Sua pontuação será visível para outros atletas",
    },
    {
      key: "showLocation",
      icon: Lock,
      label: "Mostrar Localização",
      description: "Exibe sua cidade no perfil",
    },
    {
      key: "showRanking",
      icon: Globe,
      label: "Mostrar Ranking",
      description: "Sua posição no ranking será visível",
    },
    {
      key: "allowMessages",
      icon: Lock,
      label: "Aceitar Mensagens",
      description: "Outros atletas podem te enviar mensagens",
    },
    {
      key: "allowChallenges",
      icon: Eye,
      label: "Aceitar Desafios",
      description: "Permite receber solicitações de lutas",
    },
  ]

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-6">
      <h3 className="font-serif font-bold text-lg uppercase tracking-wide text-foreground mb-4">
        Configurações de Privacidade
      </h3>
      
      <div className="space-y-4">
        {settings.map((setting) => {
          const Icon = setting.icon
          return (
            <Card key={setting.key} className="bg-muted/30 border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  
                  <div>
                    <Label className="font-medium text-foreground">{setting.label}</Label>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                </div>
                
                <Switch
                  checked={privacy[setting.key as keyof typeof privacy]}
                  onCheckedChange={() => togglePrivacy(setting.key as keyof typeof privacy)}
                />
              </div>
            </Card>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Suas alterações de privacidade são salvas automaticamente.
      </p>
    </div>
  )
}
