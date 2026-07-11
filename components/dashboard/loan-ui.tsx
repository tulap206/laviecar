"use client"

import {
  ModuleKpiCard,
  ModuleSectionCard,
  moduleTableHeadClass,
  moduleTableBodyClass,
  moduleBadgeClass,
  moduleFilterInputClass,
} from "@/components/dashboard/module-shell"
import { CardHeader } from "@/components/ui/card"
import { CardTitle, CardDescription } from "@/components/ui/card"
import { ShieldAlert } from "lucide-react"

export const loanTableHeadClass = moduleTableHeadClass
export const loanTableBodyClass = moduleTableBodyClass
export const loanBadgeClass = moduleBadgeClass
export const loanFilterInputClass = moduleFilterInputClass

export function LoanKpiCard(
  props: Omit<React.ComponentProps<typeof ModuleKpiCard>, "accent">
) {
  return <ModuleKpiCard accent="purple" {...props} />
}

export function LoanModuleCardHeader({
  title,
  description,
  badge,
  filters,
}: {
  title: string
  description?: string
  badge?: React.ReactNode
  filters?: React.ReactNode
}) {
  return (
    <CardHeader className="py-4 px-4 border-b border-slate-100 bg-slate-50/40">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">{title}</CardTitle>
            {description && (
              <CardDescription className="text-xs text-slate-500 mt-0.5">{description}</CardDescription>
            )}
          </div>
          {badge}
        </div>
        {filters}
      </div>
    </CardHeader>
  )
}

export { ModuleSectionCard as LoanSectionCard }

const LOAN_LEDGER_TYPE_LABELS: Record<string, string> = {
  CASH_OUT_LOAN: "Giải ngân",
  CASH_IN_INTEREST: "Thu lãi",
  CASH_IN_PRINCIPAL: "Thu gốc",
  CASH_IN_EARLY: "Tất toán",
  OPERATIONAL_EXPENSE: "Chi phí vận hành",
}

export function getLoanLedgerTypeLabel(type: string): string {
  return LOAN_LEDGER_TYPE_LABELS[type] ?? type.replace(/_/g, " ")
}

const LOAN_INTEREST_PERIOD_LABELS: Record<string, string> = {
  day: "ngày",
  week: "tuần",
  month: "tháng",
}

export function formatLoanInterestRate(agreement: {
  interestratetype: "fixed_daily" | "percentage"
  interestrate: number
  interestperiod: "day" | "week" | "month"
}): string {
  if (agreement.interestratetype === "fixed_daily") {
    return `${agreement.interestrate.toLocaleString("vi-VN")}đ/ngày`
  }
  const period = LOAN_INTEREST_PERIOD_LABELS[agreement.interestperiod] ?? agreement.interestperiod
  return `${agreement.interestrate}%/${period}`
}

export function LoanAccessDenied({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/40 p-6 text-center">
      <ShieldAlert className="mx-auto mb-2 h-10 w-10 text-red-500" />
      <h3 className="text-sm font-bold text-red-800">Truy cập bị hạn chế</h3>
      <p className="mt-1 text-xs text-red-600">
        {message || "Bạn không có quyền truy cập mục này."}
      </p>
    </div>
  )
}
