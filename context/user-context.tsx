"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"

// Define como é o nosso utilizador
interface User {
  id: number;
  nome: string;
  is_pro: boolean;
  is_academy_pro?: boolean;
  is_coach?: boolean;
  is_admin?: boolean;
  email?: string;
  cidade?: string;
  bio?: string;
  avatarUrl?: string;
  currentXP?: number;
  level?: number;
}

interface UserContextType {
  user: User | null;
  isAuthReady: boolean;
  isPremium: boolean;
  isAcademyPremium: boolean;
  isCoach: boolean;
  updateUser: (nextUser: User) => void;
  logout: () => void; // Função para terminar sessão
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const router = useRouter()

  // Assim que o Provider carrega, ele vai buscar os dados reais ao navegador
  useEffect(() => {
    try {
      const loggedUser = localStorage.getItem("selestialhub_user")
      if (loggedUser) {
        try {
          setUser(JSON.parse(loggedUser))
        } catch {
          localStorage.removeItem("selestialhub_user")
          setUser(null)
        }
      }
    } finally {
      setIsAuthReady(true)
    }
  }, [])

  useEffect(() => {
    if (!isAuthReady) return

    const onStorage = (event: StorageEvent) => {
      if (event.key !== "selestialhub_user") return
      if (!event.newValue) {
        setUser(null)
        return
      }
      try {
        setUser(JSON.parse(event.newValue))
      } catch {
        setUser(null)
      }
    }

    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [isAuthReady])

  // A nossa função global de Logout
  const logout = () => {
    localStorage.removeItem("selestialhub_user")
    setUser(null)
    router.push("/login")
  }

  const updateUser = (nextUser: User) => {
    setUser(nextUser)
    localStorage.setItem("selestialhub_user", JSON.stringify(nextUser))
  }

  return (
    <UserContext.Provider value={{ 
      user, 
      isAuthReady,
      isPremium: user?.is_pro || false, // Se for true no banco, fica Premium aqui!
      isAcademyPremium: user?.is_academy_pro || false,
      isCoach: user?.is_coach || false,
      updateUser,
      logout 
    }}>
      {isAuthReady ? children : null}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser tem de ser usado dentro de um UserProvider")
  }
  return context
}

