"use client"

import { useState } from "react"
import { UserCircle, MapPin, Zap, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUser } from "@/context/user-context"

interface ProfileEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileEditModal({ open, onOpenChange }: ProfileEditModalProps) {
  const { user, updateUserProfile } = useUser()
  const [form, setForm] = useState({
    nome: user?.nome || "",
    academia: user?.academia || "",
    cidade: user?.cidade || "",
    modalidade: user?.modalidade || "",
    estilo: user?.estilo || "",
    bio: user?.bio || "",
  })
  const [saving, setSaving] = useState(false)

  const modalidades = ["BJJ", "Judô", "Karatê", "Boxe", "MMA", "Jiu-Jitsu Tradicional", "Taikendo"]
  const estilos = ["Defensivo", "Agressivo", "Técnico", "Combinado"]

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setSaving(true)
    const success = await updateUserProfile({
      nome: form.nome,
      academia: form.academia,
      cidade: form.cidade,
      modalidade: form.modalidade,
      estilo: form.estilo,
      bio: form.bio,
    })
    if (success) {
      onOpenChange(false)
    } else {
      alert("Erro ao salvar o perfil. Tente novamente.")
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl uppercase tracking-wide text-foreground">
            Editar Perfil
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Atualize suas informações e preferências de luta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground">
              <UserCircle className="w-4 h-4" />
              Nome Completo
            </Label>
            <Input
              value={form.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              placeholder="Seu nome"
              className="bg-muted border-border text-foreground"
            />
          </div>

          {/* Academia */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground">
              <Zap className="w-4 h-4" />
              Academia
            </Label>
            <Input
              value={form.academia}
              onChange={(e) => handleChange("academia", e.target.value)}
              placeholder="Sua academia (ex: Alliance)"
              className="bg-muted border-border text-foreground"
            />
          </div>

          {/* Cidade */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground">
              <MapPin className="w-4 h-4" />
              Cidade
            </Label>
            <Input
              value={form.cidade}
              onChange={(e) => handleChange("cidade", e.target.value)}
              placeholder="Sua cidade"
              className="bg-muted border-border text-foreground"
            />
          </div>

          {/* Modalidade */}
          <div className="space-y-2">
            <Label className="text-foreground">Modalidade de Luta</Label>
            <Select value={form.modalidade} onValueChange={(value) => handleChange("modalidade", value)}>
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue placeholder="Selecione a modalidade" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {modalidades.map((mod) => (
                  <SelectItem key={mod} value={mod}>
                    {mod}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estilo de Luta */}
          <div className="space-y-2">
            <Label className="text-foreground">Estilo de Luta</Label>
            <Select value={form.estilo} onValueChange={(value) => handleChange("estilo", value)}>
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue placeholder="Selecione o estilo" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {estilos.map((estilo) => (
                  <SelectItem key={estilo} value={estilo}>
                    {estilo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border text-foreground hover:bg-muted"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-serif uppercase tracking-wide"
          >
            Salvar Mudanças
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
