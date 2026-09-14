"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { logger } from "@/lib/logger"
import { toast } from "sonner"
import { LOCAL_USER_KEY, LOCAL_LOGS_KEY, LEGACY_USER_KEY, LEGACY_LOGS_KEY } from "@/lib/auth-session"

export type UserRole = "admin" | "staff"

export interface User {
  id: string
  username: string
  displayName: string
  role: UserRole
  avatarUrl?: string
  permissions: {
    canDelete: boolean
    canBackup?: boolean
    canViewAccessHistory?: boolean
    canManageUsers?: boolean
  }
}

export interface AccessLog {
  id: string
  userId: string
  username: string
  displayName: string
  action: string
  module: string
  details: string
  ipAddress: string
  timestamp: Date
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateUser: (partial: Partial<User>) => void
  addAccessLog: (action: string, module: string, details: string) => void
  accessLogs: AccessLog[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const getClientIP = async () => {
  try {
    const res = await fetch("/api/client-ip", { cache: "no-store" })
    if (!res.ok) return "Unknown"
    const data = await res.json()
    return typeof data?.ip === "string" && data.ip ? data.ip : "Unknown"
  } catch {
    return "Unknown"
  }
}

function readLocal(key: string, legacyKey: string) {
  return localStorage.getItem(key) || localStorage.getItem(legacyKey)
}

function writeLocal(key: string, legacyKey: string, value: string) {
  localStorage.setItem(key, value)
  localStorage.removeItem(legacyKey)
}

function clearLocal(key: string, legacyKey: string) {
  localStorage.removeItem(key)
  localStorage.removeItem(legacyKey)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.alert = (message: string) => {
        if (!message) return
        const cleanMessage = message.replace(/^[⚠️❌✓ℹ️🔔]\s*/g, "")
        const lines = cleanMessage.split("\n")
        const title = lines[0]
        const description = lines.slice(1).filter((l) => l.trim() !== "").join("\n")
        const isWarning =
          message.includes("⚠️") ||
          message.toLowerCase().includes("cảnh báo") ||
          message.toLowerCase().includes("vui lòng")
        const isError =
          message.includes("❌") ||
          message.toLowerCase().includes("lỗi") ||
          message.toLowerCase().includes("thất bại")
        const isSuccess =
          message.includes("✓") ||
          message.toLowerCase().includes("thành công") ||
          message.toLowerCase().includes("hoàn thành")
        const options = { description: description || undefined, duration: isError ? 6000 : 4000 }
        if (isError) toast.error(title, options)
        else if (isWarning) toast.warning(title, options)
        else if (isSuccess) toast.success(title, options)
        else toast.info(title, options)
      }
    }

    const init = async () => {
      try {
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated) {
            setUser(data.user)
            writeLocal(LOCAL_USER_KEY, LEGACY_USER_KEY, JSON.stringify(data.user))
          } else {
            setUser(null)
            clearLocal(LOCAL_USER_KEY, LEGACY_USER_KEY)
          }
        } else {
          setUser(null)
          clearLocal(LOCAL_USER_KEY, LEGACY_USER_KEY)
        }

        const savedLogs = readLocal(LOCAL_LOGS_KEY, LEGACY_LOGS_KEY)
        if (savedLogs) {
          try {
            const parsedLogs = JSON.parse(savedLogs)
            setAccessLogs(
              parsedLogs.map((log: AccessLog) => ({
                ...log,
                timestamp: new Date(log.timestamp),
              }))
            )
          } catch {
            clearLocal(LOCAL_LOGS_KEY, LEGACY_LOGS_KEY)
          }
        }
      } catch (error) {
        console.error("Error in auth init:", error)
        setUser(null)
        clearLocal(LOCAL_USER_KEY, LEGACY_USER_KEY)
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [])

  const addAccessLog = async (action: string, module: string, details: string) => {
    if (!user) return
    const ipAddress = await getClientIP()
    const newLog = {
      username: user.username,
      displayname: user.displayName,
      action,
      module,
      details,
      ip_address: ipAddress,
      timestamp: new Date().toISOString(),
    }

    try {
      const { error } = await (await import("@/lib/supabase")).supabase.from("access_logs").insert([newLog])
      if (error) console.error("Error logging to Supabase:", error)
    } catch (error) {
      console.error("Exception logging:", error)
    }

    const localLog: AccessLog = {
      id: Date.now().toString(),
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      action,
      module,
      details,
      ipAddress,
      timestamp: new Date(),
    }

    setAccessLogs((prev) => {
      const updated = [localLog, ...prev]
      writeLocal(LOCAL_LOGS_KEY, LEGACY_LOGS_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setUser(data.user)
        writeLocal(LOCAL_USER_KEY, LEGACY_USER_KEY, JSON.stringify(data.user))
        return { success: true }
      }
      return { success: false, error: data.error || "Đăng nhập thất bại" }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, error: "Lỗi kết nối máy chủ" }
    }
  }

  const logout = async () => {
    if (user) {
      try {
        await logger.logout(user.username, user.displayName)
        await fetch("/api/auth/logout", { method: "POST" })
      } catch (err) {
        console.error("Logout API error:", err)
      }
    }
    setUser(null)
    clearLocal(LOCAL_USER_KEY, LEGACY_USER_KEY)
  }

  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...partial }
      writeLocal(LOCAL_USER_KEY, LEGACY_USER_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser, addAccessLog, accessLogs }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
