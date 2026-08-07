export type ModuleId = "rental" | "loan"
export type ModuleAccent = "purple" | "amber"

export type ModuleTheme = {
  id: ModuleId
  accent: ModuleAccent
  titleSuffix: string
  adminClass: string
  label: string
}

export const MODULE_THEME: Record<ModuleId, ModuleTheme> = {
  rental: {
    id: "rental",
    accent: "purple",
    titleSuffix: "CHO THUÊ XE",
    adminClass: "rental-admin",
    label: "Cho thuê xe",
  },
  loan: {
    id: "loan",
    accent: "purple",
    titleSuffix: "HỖ TRỢ TÀI CHÍNH",
    adminClass: "loan-admin",
    label: "Hỗ trợ tài chính",
  },
}

export const ACCENT_TITLE_CLASS: Record<ModuleAccent, string> = {
  purple: "text-purple-600",
  amber: "text-amber-500",
}

export const ACCENT_BTN_CLASS: Record<ModuleAccent, string> = {
  purple: "bg-purple-900 hover:bg-purple-950 text-white",
  amber: "bg-amber-400 hover:bg-amber-500 text-purple-950",
}

export const ACCENT_BTN_OUTLINE_CLASS: Record<ModuleAccent, string> = {
  purple: "border-purple-200 text-purple-700 hover:bg-purple-50",
  amber: "border-amber-200 text-amber-800 hover:bg-amber-50",
}

export const ACCENT_KPI_HOVER_CLASS: Record<ModuleAccent, string> = {
  purple: "hover:border-purple-400 hover:shadow-[0_4px_20px_rgba(124,58,237,0.12)]",
  amber: "hover:border-amber-300 hover:shadow-[0_4px_20px_rgba(217,119,6,0.12)]",
}

export const ACCENT_BADGE_CLASS: Record<ModuleAccent, string> = {
  purple: "bg-purple-50 text-purple-700 border-purple-100",
  amber: "bg-amber-50 text-amber-800 border-amber-100",
}

export const ACCENT_ICON_CLASS: Record<ModuleAccent, string> = {
  purple: "text-purple-600",
  amber: "text-amber-600",
}

export const MODULE_CHART_PALETTE: Record<ModuleId, string[]> = {
  rental: ["#7C3AED", "#059669", "#0369A1", "#F59E0B", "#64748B"],
  loan: ["#7C3AED", "#EF4444", "#3B82F6", "#94A3B8", "#F59E0B"],
}

export function getModuleTheme(module: ModuleId): ModuleTheme {
  return MODULE_THEME[module]
}
