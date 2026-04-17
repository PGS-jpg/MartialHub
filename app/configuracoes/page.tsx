"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Lock,
  Moon,
  Palette,
  Save,
  Settings,
  Shield,
  Sun,
  User,
} from "lucide-react"
import { TopBar } from "@/components/selestialhub/top-bar"
import { Sidebar } from "@/components/selestialhub/sidebar"
import { BottomNav } from "@/components/selestialhub/bottom-nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/context/user-context"

const PRIMARY_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"
const API_BASE_CANDIDATES = Array.from(new Set(["http://127.0.0.1:5001", PRIMARY_API_BASE]))

interface SettingsState {
  fullName: string
  email: string
  city: string
  bio: string
  theme: "dark" | "light"
  profilePublic: boolean
  showWeight: boolean
  allowChallenges: boolean
  allowMessages: boolean
  notifyEvents: boolean
  notifyRanking: boolean
  notifyChat: boolean
  notifyMarketing: boolean
}

const DEFAULT_SETTINGS: SettingsState = {
  fullName: "",
  email: "",
  city: "",
  bio: "",
  theme: "dark",
  profilePublic: true,
  showWeight: false,
  allowChallenges: true,
  allowMessages: true,
  notifyEvents: true,
  notifyRanking: true,
  notifyChat: true,
  notifyMarketing: false,
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { user, updateUser, isAuthReady } = useUser()
  const [activeTab, setActiveTab] = useState("configuracoes")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string>("")
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  })

  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS)

  const requestWithFallback = useCallback(async (path: string, init?: RequestInit): Promise<Response | null> => {
    for (const base of API_BASE_CANDIDATES) {
      try {
        const response = await fetch(`${base}${path}`, init)
        if (response.status === 404) continue
        return response
      } catch {
        // tenta o próximo backend
      }
    }

    return null
  }, [])

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) {
      router.push("/login")
      return
    }

    const hydrate = async () => {
      const localFallback = () => {
        const stored = localStorage.getItem("selestialhub_settings")
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            setSettings((prev) => ({ ...prev, ...parsed }))
            return
          } catch {
            // segue para fallback padrão
          }
        }

        setSettings((prev) => ({
          ...prev,
          fullName: user.nome || "",
          email: (user as { email?: string }).email || "",
          city: (user as { cidade?: string }).cidade || "",
          bio: (user as { bio?: string }).bio || "",
        }))
      }

      const res = await requestWithFallback(`/api/user/settings?user_id=${user.id}`)
      if (res?.ok) {
        try {
          const payload = await res.json()
          const merged = { ...DEFAULT_SETTINGS, ...payload }
          setSettings(merged)
          localStorage.setItem("selestialhub_settings", JSON.stringify(merged))
          return
        } catch {
          localFallback()
          return
        }
      }

      localFallback()
    }

    hydrate()
  }, [isAuthReady, requestWithFallback, router, user])

  const completion = useMemo(() => {
    let count = 0
    if (settings.fullName.trim()) count += 1
    if (settings.email.trim()) count += 1
    if (settings.city.trim()) count += 1
    if (settings.bio.trim()) count += 1
    return Math.round((count / 4) * 100)
  }, [settings])

  if (!isAuthReady || !user) return null

  const saveSettings = async () => {
    if (!user || isSaving) return

    setIsSaving(true)
    setSaveStatus("")

    const payload = {
      user_id: user.id,
      ...settings,
    }

    try {
      const res = await requestWithFallback(`/api/user/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      localStorage.setItem("selestialhub_settings", JSON.stringify(settings))

      if (res?.ok) {
        updateUser({
          ...user,
          nome: settings.fullName || user.nome,
          email: settings.email,
          cidade: settings.city,
          bio: settings.bio,
        })
        setSaveStatus("Salvo no backend")
      } else {
        setSaveStatus("Salvo localmente (backend indisponivel)")
      }
    } catch {
      localStorage.setItem("selestialhub_settings", JSON.stringify(settings))
      setSaveStatus("Salvo localmente (erro de rede)")
    } finally {
      setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))
      setIsSaving(false)
    }
  }

  const handlePasswordSave = () => {
    if (!passwords.current || !passwords.next || !passwords.confirm) return
    if (passwords.next !== passwords.confirm) return
    setPasswords({ current: "", next: "", confirm: "" })
    setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isOpen={sidebarOpen} />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="pb-20 lg:ml-64 lg:pb-8">
        <section className="px-4 pt-4 lg:px-6">
          <div className="rounded-2xl border border-border bg-gradient-to-r from-[#121212] via-[#1a1a1a] to-[#0f0f0f] p-5 lg:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Area do atleta</p>
                <h1 className="mt-2 font-serif text-3xl font-bold text-foreground lg:text-4xl">Configuracoes</h1>
                <p className="mt-2 text-sm text-muted-foreground">Controle sua conta, privacidade e preferencias da plataforma.</p>
              </div>
              <Button className="gap-2" onClick={saveSettings} disabled={isSaving}>
                <Save className="h-4 w-4" /> {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#2a2f38]">
              <div className="h-full bg-[#ff5b00]" style={{ width: `${completion}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Perfil preenchido: {completion}% {savedAt ? `• salvo as ${savedAt}` : ""} {saveStatus ? `• ${saveStatus}` : ""}</p>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
          <Card className="border-border bg-card p-4 lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-lg font-bold uppercase tracking-wide text-foreground">Conta</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>Nome completo</Label>
                <Input value={settings.fullName} onChange={(e) => setSettings((prev) => ({ ...prev, fullName: e.target.value }))} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={settings.email} onChange={(e) => setSettings((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={settings.city} onChange={(e) => setSettings((prev) => ({ ...prev, city: e.target.value }))} />
              </div>
              <div>
                <Label>Tema</Label>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    variant={settings.theme === "dark" ? "default" : "secondary"}
                    className="gap-2"
                    onClick={() => setSettings((prev) => ({ ...prev, theme: "dark" }))}
                  >
                    <Moon className="h-4 w-4" /> Escuro
                  </Button>
                  <Button
                    type="button"
                    variant={settings.theme === "light" ? "default" : "secondary"}
                    className="gap-2"
                    onClick={() => setSettings((prev) => ({ ...prev, theme: "light" }))}
                  >
                    <Sun className="h-4 w-4" /> Claro
                  </Button>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Bio</Label>
                <Textarea rows={4} value={settings.bio} onChange={(e) => setSettings((prev) => ({ ...prev, bio: e.target.value }))} />
              </div>
            </div>
          </Card>

          <Card className="border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-lg font-bold uppercase tracking-wide text-foreground">Aparencia</h2>
            </div>
            <p className="text-sm text-muted-foreground">Escolha visual rapido da plataforma.</p>
            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                Tema atual: <span className="font-semibold text-foreground">{settings.theme === "dark" ? "Escuro" : "Claro"}</span>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                Estilo de fonte: <span className="font-semibold text-foreground">Competitivo</span>
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
          <Card className="border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-lg font-bold uppercase tracking-wide text-foreground">Privacidade</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-border p-2">
                <span className="text-sm">Perfil publico</span>
                <Switch checked={settings.profilePublic} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, profilePublic: checked }))} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-2">
                <span className="text-sm">Mostrar peso</span>
                <Switch checked={settings.showWeight} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, showWeight: checked }))} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-2">
                <span className="text-sm">Aceitar desafios</span>
                <Switch checked={settings.allowChallenges} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, allowChallenges: checked }))} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-2">
                <span className="text-sm">Aceitar mensagens</span>
                <Switch checked={settings.allowMessages} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, allowMessages: checked }))} />
              </div>
            </div>
          </Card>

          <Card className="border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-lg font-bold uppercase tracking-wide text-foreground">Notificacoes</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-border p-2">
                <span className="text-sm">Eventos e inscricoes</span>
                <Switch checked={settings.notifyEvents} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, notifyEvents: checked }))} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-2">
                <span className="text-sm">Ranking e progresso</span>
                <Switch checked={settings.notifyRanking} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, notifyRanking: checked }))} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-2">
                <span className="text-sm">Mensagens no chat</span>
                <Switch checked={settings.notifyChat} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, notifyChat: checked }))} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-2">
                <span className="text-sm">Comunicados promocionais</span>
                <Switch checked={settings.notifyMarketing} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, notifyMarketing: checked }))} />
              </div>
            </div>
          </Card>

          <Card className="border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-lg font-bold uppercase tracking-wide text-foreground">Seguranca</h2>
            </div>
            <div className="space-y-2">
              <div>
                <Label>Senha atual</Label>
                <Input type="password" value={passwords.current} onChange={(e) => setPasswords((prev) => ({ ...prev, current: e.target.value }))} />
              </div>
              <div>
                <Label>Nova senha</Label>
                <Input type="password" value={passwords.next} onChange={(e) => setPasswords((prev) => ({ ...prev, next: e.target.value }))} />
              </div>
              <div>
                <Label>Confirmar senha</Label>
                <Input type="password" value={passwords.confirm} onChange={(e) => setPasswords((prev) => ({ ...prev, confirm: e.target.value }))} />
              </div>
              <Button className="mt-2 w-full" variant="secondary" onClick={handlePasswordSave}>
                Atualizar senha
              </Button>
            </div>
          </Card>
        </section>

        <section className="mt-4 px-4 pb-6 lg:px-6">
          <Card className="border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <h2 className="font-serif text-lg font-bold uppercase tracking-wide text-foreground">Acoes da conta</h2>
              </div>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>Voltar ao dashboard</Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">As configuracoes tentam salvar no backend e mantem cache local como fallback.</p>
          </Card>
        </section>
      </main>
    </div>
  )
}

