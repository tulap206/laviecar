"use client"

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  fetchLoanAgreements, fetchLoanBorrowers, fetchLoanLedger,
  insertLoanAgreement, insertLoanBorrower, insertLoanLedger,
  updateLoanAgreement, updateLoanBorrower, deleteLoanAgreement, deleteLoanBorrower,
  LoanAgreement, LoanBorrower, LoanLedger, supabase
} from "@/lib/supabase"
import { uploadImage } from "@/lib/storage"
import { logger } from "@/lib/logger"
import { formatMoneyInput, parseMoneyInput } from "@/lib/format-money"
import { formatDisplayDate } from "@/lib/format-date"
import { cn } from "@/lib/utils"
import {
  EntityFormDialogContent,
  EntityFormHeader,
  EntityFormBody,
  EntityFormSection,
  EntityFormField,
  EntityFormFooter,
  EntityFormToggle,
  EntityFormInfoBox,
  EntityFormTip,
  entityFormInputClass,
  entityFormSelectClass,
} from "@/components/dashboard/entity-form-dialog"
import {
  TrendingUp, AlertTriangle,
  Plus, Search, CheckCircle2,
  Database, User, Receipt, Camera, Check, RefreshCw,
  Trash2, History, Settings, Eye, Wallet, DollarSign,
  FileText, Calendar, Printer, ChevronRight,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { SkeletonMetricCards } from "@/components/ui/skeleton-loader"
import { BackupAccessDenied, BackupRestorePanel } from "@/components/dashboard/backup-restore-panel"
import { AccessHistoryModuleSection } from "@/components/dashboard/access-history-panel"
import {
  ModulePageShell,
  ModuleBrandHeader,
  ModuleSectionCard,
  ModuleResponsiveTable,
  ModuleMobileCard,
} from "@/components/dashboard/module-shell"
import {
  LoanStatusChart,
  LoanCapitalChart,
  LoanProfitChart,
  MonthlyCashFlowChart,
} from "@/components/dashboard/loan-charts"
import {
  LoanKpiCard,
  LoanAccessDenied,
  getLoanLedgerTypeLabel,
  formatLoanInterestRate,
  loanTableHeadClass,
  loanFilterInputClass,
} from "@/components/dashboard/loan-ui"
import { LAVIECAR_BUSINESS } from "@/lib/business-info"

interface LoanBackupData {
  timestamp: string
  loan_borrowers: LoanBorrower[]
  loan_agreements: LoanAgreement[]
  loan_ledger: LoanLedger[]
}

interface BackupFile {
  name: string
  created_at: string
  size: number
  url: string
}

function LoanManagementContent() {
  const router = useRouter()
  const { user } = useAuth()
  const searchParams = useSearchParams()

  const [agreements, setAgreements] = useState<LoanAgreement[]>([])
  const [borrowers, setBorrowers] = useState<LoanBorrower[]>([])
  const [ledger, setLedger] = useState<LoanLedger[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTab, setCurrentTab] = useState<"dashboard" | "borrowers" | "agreements" | "history" | "backup">(
    (searchParams.get("tab") as any) || "dashboard"
  )

  const [borrowerStatusFilter, setBorrowerStatusFilter] = useState<string>("all")
  const [agreementStatusFilter, setAgreementStatusFilter] = useState<string>("all")
  const [showDueToday, setShowDueToday] = useState(false)

  const [logSearchQuery, setLogSearchQuery] = useState("")
  const [accessLogs, setAccessLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([])
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupFilesLoading, setBackupFilesLoading] = useState(true)
  const [backupMessage, setBackupMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [showBorrowerDialog, setShowBorrowerDialog] = useState(false)
  const [showAgreementDialog, setShowAgreementDialog] = useState(false)
  const [editingBorrower, setEditingBorrower] = useState<LoanBorrower | null>(null)
  const [editingAgreement, setEditingAgreement] = useState<LoanAgreement | null>(null)

  const [borrowerForm, setBorrowerForm] = useState({
    name: "",
    phone: "",
    facebook: "",
    address: "",
    idcard: "",
    status: "active" as "active" | "inactive",
  })

  const [agreementForm, setAgreementForm] = useState({
    borrowerid: "",
    loanamount: "",
    interestratetype: "fixed_daily" as "fixed_daily" | "percentage",
    interestrate: "",
    interestperiod: "day" as "day" | "week" | "month",
    interestpaymentcycle: "1",
    startdate: "",
    duedate: "",
    graceperioddays: "0",
    purpose: "",
    collateral: "",
    collateralvalue: "",
    notes: "",
  })

  const [isNewBorrower, setIsNewBorrower] = useState(false)
  const [newBorrowerData, setNewBorrowerData] = useState({
    name: "",
    phone: "",
    idcard: "",
    borrower_photo: null as File | null,
    cccd_front: null as File | null,
  })

  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false)
  const [capitalForm, setCapitalForm] = useState({ type: "nạp", amount: "", note: "" })
  const [availableCapital, setAvailableCapital] = useState(0)

  // Schedule dialog
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [scheduleAgreement, setScheduleAgreement] = useState<LoanAgreement | null>(null)

  // Borrower history dialog
  const [showBorrowerHistoryDialog, setShowBorrowerHistoryDialog] = useState(false)
  const [selectedBorrowerForHistory, setSelectedBorrowerForHistory] = useState<LoanBorrower | null>(null)

  // Server-side search
  const [serverSearchAgreements, setServerSearchAgreements] = useState<LoanAgreement[] | null>(null)
  const [serverSearchBorrowers, setServerSearchBorrowers] = useState<LoanBorrower[] | null>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Payment dialog states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedAgreement, setSelectedAgreement] = useState<LoanAgreement | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    type: "CASH_IN_INTEREST" as "CASH_IN_INTEREST" | "CASH_IN_PRINCIPAL" | "CASH_IN_EARLY",
    amount: "",
    interestAdjustment: "",
    paymentMethod: "cash" as "cash" | "bank_transfer",
    description: "",
    notes: "",
  })

  // Update tab from URL search params
  useEffect(() => {
    const tab = searchParams.get("tab") as any
    if (tab && ["dashboard", "borrowers", "agreements", "history", "backup"].includes(tab)) {
      setCurrentTab(tab)
    }
  }, [searchParams])

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [agreementsData, borrowersData, ledgerData] = await Promise.all([
          fetchLoanAgreements(),
          fetchLoanBorrowers(),
          fetchLoanLedger(),
        ])
        setAgreements(agreementsData)
        setBorrowers(borrowersData)
        setLedger(ledgerData)

        // Calculate available capital from ledger OPERATIONAL_EXPENSE entries
        const capital = ledgerData
          .filter(l => l.type === 'OPERATIONAL_EXPENSE')
          .reduce((sum, l) => sum + l.amount, 0)
        setAvailableCapital(capital)
      } catch (error) {
        console.error("Error loading loan data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Load access logs
  const loadAccessLogs = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLogsLoading(true)
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .eq('module', 'Cho vay')
        .order('timestamp', { ascending: false })
      if (error) throw error
      setAccessLogs(data || [])
    } catch (error) {
      console.error("Error loading access logs:", error)
    } finally {
      if (showLoading) setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentTab === "history") {
      loadAccessLogs(true)

      const channel = supabase
        .channel("loan-access-logs-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "access_logs" }, () => {
          loadAccessLogs(false)
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [currentTab, loadAccessLogs])

  // Load backup files
  const loadBackupFiles = useCallback(async () => {
    try {
      setBackupFilesLoading(true)
      const { data, error } = await supabase.storage
        .from('backups')
        .list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        })
      if (error) throw error
      const files: BackupFile[] = (data || [])
        .filter((f: any) => f.name.startsWith('loan-') && f.name.endsWith('.json'))
        .map((f: any) => ({
          name: f.name,
          created_at: f.created_at,
          size: f.metadata?.size || 0,
          url: supabase.storage.from('backups').getPublicUrl(f.name).data.publicUrl,
        }))
      setBackupFiles(files)
    } catch (error) {
      console.error("Error loading backup files:", error)
    } finally {
      setBackupFilesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentTab === "backup") {
      loadBackupFiles()
    }
  }, [currentTab, loadBackupFiles])

  // Filtered data
  const filteredBorrowers = useMemo(() => {
    const base = serverSearchBorrowers !== null ? serverSearchBorrowers : borrowers
    return base.filter(b => borrowerStatusFilter === "all" || b.status === borrowerStatusFilter)
  }, [borrowers, serverSearchBorrowers, borrowerStatusFilter])

  const filteredAgreements = useMemo(() => {
    const base = serverSearchAgreements !== null ? serverSearchAgreements : agreements
    return base.filter(a => {
      const matchesStatus = agreementStatusFilter === "all" || a.status === agreementStatusFilter
      if (showDueToday) return matchesStatus && a.duedate === new Date().toISOString().split('T')[0]
      return matchesStatus
    })
  }, [agreements, serverSearchAgreements, agreementStatusFilter, showDueToday])

  const filteredLedger = ledger.filter(l => {
    const matchesSearch = (l.description?.toLowerCase().includes(logSearchQuery.toLowerCase()) || false) ||
      (l.loancode?.includes(logSearchQuery) || false)
    return matchesSearch
  })

  const borrowerLoanCounts = useMemo(() => {
    const totals = new Map<string, number>()
    const active = new Map<string, number>()
    for (const agreement of agreements) {
      totals.set(agreement.borrowerid, (totals.get(agreement.borrowerid) ?? 0) + 1)
      if (agreement.status === "active" || agreement.status === "overdue" || agreement.status === "bad_debt") {
        active.set(agreement.borrowerid, (active.get(agreement.borrowerid) ?? 0) + 1)
      }
    }
    return { totals, active }
  }, [agreements])

  const getBorrowerLoanCount = (borrowerId: string) => borrowerLoanCounts.totals.get(borrowerId) ?? 0
  const getBorrowerActiveLoanCount = (borrowerId: string) => borrowerLoanCounts.active.get(borrowerId) ?? 0

  const isLoanAgreementOverdue = (a: LoanAgreement) => {
    if (a.status === "overdue" || a.status === "bad_debt") return true
    if (a.status === "completed" || a.status === "cancelled") return false
    return a.duedate ? new Date(a.duedate) < new Date() : false
  }

  const borrowerStats = {
    total: borrowers.length,
    active: borrowers.filter((b) => b.status === "active").length,
    inactive: borrowers.filter((b) => b.status === "inactive").length,
    withActiveLoans: borrowers.filter((b) => getBorrowerActiveLoanCount(b.id) > 0).length,
  }

  const agreementStats = {
    total: agreements.length,
    active: agreements.filter((a) => a.status === "active" || a.status === "overdue" || a.status === "bad_debt").length,
    overdue: agreements.filter(isLoanAgreementOverdue).length,
    completed: agreements.filter((a) => a.status === "completed").length,
    outstanding: agreements
      .filter((a) => a.status !== "completed" && a.status !== "cancelled")
      .reduce((sum, a) => sum + a.loanamount, 0),
  }

  // Calculate dashboard stats
  const stats = {
    totalBorrowers: borrowers.filter(b => b.status === "active").length,
    activeLoans: agreements.filter(a => a.status === "active").length,
    overdueLoans: agreements.filter(a => a.status === "overdue").length,
    totalLoanAmount: agreements.reduce((sum, a) => sum + a.loanamount, 0),
    totalInterestCollected: ledger
      .filter(l => l.type === "CASH_IN_INTEREST")
      .reduce((sum, l) => sum + l.amount, 0),
    totalPrincipalRepaid: ledger
      .filter(l => l.type === "CASH_IN_PRINCIPAL" || l.type === "CASH_IN_EARLY")
      .reduce((sum, l) => sum + l.amount, 0),
  }

  const formatPrice = (n: number) => `${formatMoneyInput(n.toString())}đ`

  // Server-side search handler
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (!term || term.length < 2) {
      setServerSearchAgreements(null)
      setServerSearchBorrowers(null)
      return
    }
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const [agrRes, borRes] = await Promise.all([
          supabase.from('loan_agreements').select('*')
            .or(`borrowername.ilike.%${term}%,loancode.ilike.%${term}%,borrowerphone.ilike.%${term}%`)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase.from('loan_borrowers').select('*')
            .or(`name.ilike.%${term}%,phone.ilike.%${term}%,idcard.ilike.%${term}%`)
            .order('created_at', { ascending: false })
            .limit(50),
        ])
        setServerSearchAgreements(agrRes.data || null)
        setServerSearchBorrowers(borRes.data || null)
      } catch (e) {
        console.error('Search error:', e)
      }
    }, 400)
  }, [])

  // Calculate amortization schedule
  const calculatePaymentSchedule = useCallback((agreement: LoanAgreement) => {
    const schedule: Array<{ period: number; date: string; interest: number; isPast: boolean; isNext: boolean }> = []
    if (!agreement.startdate || !agreement.duedate) return schedule
    const start = new Date(agreement.startdate)
    const due = new Date(agreement.duedate)
    const cycle = agreement.interestpaymentcycle || 1
    const period = agreement.interestperiod
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const nextPayStr = agreement.nextpaymentdate || ""
    let current = new Date(start)
    let periodNum = 1
    while (periodNum <= 120) {
      const next = new Date(current)
      if (period === "day") next.setDate(next.getDate() + cycle)
      else if (period === "week") next.setDate(next.getDate() + cycle * 7)
      else next.setMonth(next.getMonth() + cycle)
      const payDate = next > due ? new Date(due) : new Date(next)
      const daysInPeriod = Math.round((payDate.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))
      let interest = 0
      if (agreement.interestratetype === "fixed_daily") {
        interest = Math.round(agreement.interestrate * daysInPeriod)
      } else {
        const baseDays = period === "month" ? 30 : period === "week" ? 7 : 1
        interest = Math.round(agreement.loanamount * (agreement.interestrate / 100) * (daysInPeriod / (baseDays * cycle)))
      }
      const payDateStr = payDate.toISOString().split('T')[0]
      schedule.push({
        period: periodNum,
        date: payDateStr,
        interest,
        isPast: payDate < today,
        isNext: !!nextPayStr && payDateStr === nextPayStr,
      })
      current = next
      periodNum++
      if (next >= due) break
    }
    return schedule
  }, [])

  // Print contract
  const handlePrintContract = useCallback((agreement: LoanAgreement) => {
    const borrower = borrowers.find(b => b.id === agreement.borrowerid)
    const periodLabel = agreement.interestperiod === "day" ? "ngày" : agreement.interestperiod === "week" ? "tuần" : "tháng"
    const cycle = agreement.interestpaymentcycle || 1
    const interestStr = agreement.interestratetype === "fixed_daily"
      ? `${agreement.interestrate.toLocaleString('vi-VN')}đ/${periodLabel}`
      : `${agreement.interestrate}%/${periodLabel}`
    const fmtDate = (s: string) => { if (!s) return "—"; const d = new Date(s); return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}` }
    const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"/><title>HĐ ${agreement.loancode}</title>
<style>body{font-family:'Times New Roman',serif;max-width:800px;margin:0 auto;padding:40px 60px;font-size:14px;line-height:1.8}h1{text-align:center;font-size:18px;text-transform:uppercase;margin-bottom:4px}.subtitle{text-align:center;font-size:13px;color:#555;margin-bottom:30px}.section{margin-bottom:16px}.section-title{font-weight:bold;text-decoration:underline;margin-bottom:6px}.row{display:flex;gap:4px;margin-bottom:2px}.label{min-width:220px;color:#555}.value{font-weight:bold}.signature-area{margin-top:50px;display:flex;justify-content:space-between}.sig{text-align:center;width:200px}.sig-line{border-top:1px solid #000;margin-top:60px;padding-top:8px;font-size:12px;color:#555}.header-brand{text-align:center;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:20px}.brand-name{font-size:20px;font-weight:bold}@media print{body{padding:20px 40px}}</style></head><body>
<div class="header-brand"><div class="brand-name">${LAVIECAR_BUSINESS.brandName}</div><div style="font-size:12px;color:#555">${LAVIECAR_BUSINESS.shopName}</div></div>
<h1>Hợp Đồng Vay Tiền</h1><div class="subtitle">Mã hợp đồng: <strong>${agreement.loancode}</strong></div>
<div class="section"><div class="section-title">I. THÔNG TIN BÊN CHO VAY</div><div class="row"><span class="label">Tên cơ sở:</span><span class="value">${LAVIECAR_BUSINESS.shopName}</span></div><div class="row"><span class="label">Người đại diện:</span><span class="value">${LAVIECAR_BUSINESS.bank.accountHolder}</span></div></div>
<div class="section"><div class="section-title">II. THÔNG TIN BÊN VAY</div><div class="row"><span class="label">Họ và tên:</span><span class="value">${agreement.borrowername}</span></div><div class="row"><span class="label">Số điện thoại:</span><span class="value">${agreement.borrowerphone}</span></div>${agreement.borrowercccd ? `<div class="row"><span class="label">CCCD:</span><span class="value">${agreement.borrowercccd}</span></div>` : ""}${borrower?.address ? `<div class="row"><span class="label">Địa chỉ:</span><span class="value">${borrower.address}</span></div>` : ""}</div>
<div class="section"><div class="section-title">III. ĐIỀU KHOẢN KHOẢN VAY</div><div class="row"><span class="label">Số tiền vay:</span><span class="value">${agreement.loanamount.toLocaleString('vi-VN')} đồng</span></div><div class="row"><span class="label">Lãi suất:</span><span class="value">${interestStr}</span></div><div class="row"><span class="label">Chu kỳ thanh toán:</span><span class="value">Mỗi ${cycle} ${periodLabel}</span></div><div class="row"><span class="label">Ngày giải ngân:</span><span class="value">${fmtDate(agreement.startdate)}</span></div><div class="row"><span class="label">Ngày đáo hạn:</span><span class="value">${fmtDate(agreement.duedate)}</span></div>${agreement.graceperioddays > 0 ? `<div class="row"><span class="label">Thời gian ân hạn:</span><span class="value">${agreement.graceperioddays} ngày</span></div>` : ""}</div>
${agreement.collateral ? `<div class="section"><div class="section-title">IV. TÀI SẢN THẾ CHẤP</div><div class="row"><span class="label">Tài sản:</span><span class="value">${agreement.collateral}</span></div>${agreement.collateralvalue > 0 ? `<div class="row"><span class="label">Giá trị ước tính:</span><span class="value">${agreement.collateralvalue.toLocaleString('vi-VN')} đồng</span></div>` : ""}</div>` : ""}
${agreement.purpose ? `<div class="section"><div class="section-title">MỤC ĐÍCH VAY</div><div>${agreement.purpose}</div></div>` : ""}
${agreement.notes ? `<div class="section"><div class="section-title">GHI CHÚ</div><div>${agreement.notes}</div></div>` : ""}
<div class="section"><p>Hai bên đồng ý thực hiện hợp đồng theo đúng các điều khoản nêu trên. Mọi tranh chấp phát sinh sẽ được giải quyết theo thỏa thuận của hai bên.</p></div>
<div class="signature-area"><div class="sig"><div>Bên cho vay</div><div class="sig-line">${LAVIECAR_BUSINESS.bank.accountHolder}</div></div><div class="sig"><div>Bên vay</div><div class="sig-line">${agreement.borrowername}</div></div></div>
<div style="text-align:center;margin-top:30px;font-size:12px;color:#888">Ngày in: ${new Date().toLocaleDateString('vi-VN')} · Mã HĐ: ${agreement.loancode}</div>
<script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }, [borrowers])

  const statusChartData = useMemo(
    () => [
      { name: "Hoạt động", value: stats.activeLoans },
      { name: "Quá hạn", value: stats.overdueLoans },
      {
        name: "Hoàn thành",
        value: agreements.filter((a) => a.status === "completed").length,
      },
      {
        name: "Hủy",
        value: agreements.filter((a) => a.status === "cancelled").length,
      },
    ],
    [stats.activeLoans, stats.overdueLoans, agreements]
  )

  const capitalChartData = useMemo(
    () => [
      {
        name: "Hoạt động",
        amount: agreements
          .filter((a) => a.status === "active")
          .reduce((sum, a) => sum + a.loanamount, 0),
      },
      {
        name: "Quá hạn",
        amount: agreements
          .filter((a) => a.status === "overdue")
          .reduce((sum, a) => sum + a.loanamount, 0),
      },
      {
        name: "Hoàn thành",
        amount: agreements
          .filter((a) => a.status === "completed")
          .reduce((sum, a) => sum + a.loanamount, 0),
      },
    ],
    [agreements]
  )

  const operationalExpense = useMemo(
    () =>
      ledger
        .filter((l) => l.type === "OPERATIONAL_EXPENSE")
        .reduce((sum, l) => sum + l.amount, 0),
    [ledger]
  )

  const badDebtAmount = useMemo(
    () => agreements.filter(a => a.status === "bad_debt").reduce((sum, a) => sum + a.loanamount, 0),
    [agreements]
  )

  const profitChartData = useMemo(
    () => [
      { name: "Lãi thu", amount: stats.totalInterestCollected },
      { name: "Chi phí", amount: operationalExpense },
      { name: "Nợ xấu", amount: badDebtAmount },
      { name: "Lãi ròng", amount: Math.max(0, stats.totalInterestCollected - operationalExpense - badDebtAmount) },
    ],
    [stats.totalInterestCollected, operationalExpense, badDebtAmount]
  )

  // Monthly cash flow
  const monthlyCashFlowData = useMemo(() => {
    const monthMap = new Map<string, { inflow: number; outflow: number }>()
    ledger.forEach((l) => {
      const d = new Date(l.timestamp)
      const key = `T${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
      if (!monthMap.has(key)) monthMap.set(key, { inflow: 0, outflow: 0 })
      const entry = monthMap.get(key)!
      if (l.type === "CASH_OUT_LOAN") entry.outflow += Math.abs(l.amount)
      else if (["CASH_IN_INTEREST", "CASH_IN_PRINCIPAL", "CASH_IN_EARLY"].includes(l.type)) entry.inflow += l.amount
    })
    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([name, { inflow, outflow }]) => ({ name, inflow, outflow }))
  }, [ledger])

  const netProfit = stats.totalInterestCollected - operationalExpense - badDebtAmount

  // Loan preview
  const loanPreview = useMemo(() => {
    const amount = parseMoneyInput(agreementForm.loanamount)
    const rate = parseFloat(agreementForm.interestrate) || 0
    const cycle = parseInt(agreementForm.interestpaymentcycle) || 1
    if (!amount || !rate) return null
    let interestPerCycle = 0
    if (agreementForm.interestratetype === "fixed_daily") {
      interestPerCycle = rate * cycle
    } else {
      interestPerCycle = amount * (rate / 100)
    }
    let totalCycles = 0
    let totalInterest = 0
    if (agreementForm.startdate && agreementForm.duedate) {
      const start = new Date(agreementForm.startdate)
      const due = new Date(agreementForm.duedate)
      const diffDays = Math.ceil((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const daysPerCycle = agreementForm.interestperiod === "month" ? 30 : agreementForm.interestperiod === "week" ? 7 : 1
      totalCycles = Math.max(1, Math.ceil(diffDays / (cycle * daysPerCycle)))
      totalInterest = Math.round(interestPerCycle * totalCycles)
    }
    return { interestPerCycle: Math.round(interestPerCycle), totalCycles, totalInterest, amount }
  }, [agreementForm])

  // Handle borrower operations
  const handleSaveBorrower = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      if (editingBorrower) {
        const updated = await updateLoanBorrower(editingBorrower.id, {
          ...borrowerForm,
          totalloans: editingBorrower.totalloans,
          borrowerphoto: editingBorrower.borrowerphoto,
          cccdfront: editingBorrower.cccdfront,
          cccdback: editingBorrower.cccdback,
        })
        setBorrowers(borrowers.map(b => b.id === updated.id ? updated : b))
        logger.log(user?.username || 'unknown', user?.displayName || 'Unknown', 'Chỉnh sửa', 'Cho vay', `Cập nhật khách vay: ${borrowerForm.name}`)
      } else {
        const newBorrower = await insertLoanBorrower({
          ...borrowerForm,
          totalloans: 0,
          borrowerphoto: [],
          cccdfront: [],
          cccdback: [],
        })
        setBorrowers([newBorrower, ...borrowers])
        logger.log(user?.username || 'unknown', user?.displayName || 'Unknown', 'Thêm mới', 'Cho vay', `Tạo khách vay: ${borrowerForm.name}`)
      }
      setShowBorrowerDialog(false)
      setBorrowerForm({
        name: "",
        phone: "",
        facebook: "",
        address: "",
        idcard: "",
        status: "active",
      })
      setEditingBorrower(null)
    } catch (error) {
      console.error("Error saving borrower:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBorrower = async (id: string, name: string) => {
    if (!confirm(`Xóa khách vay "${name}"?`)) return
    try {
      await deleteLoanBorrower(id)
      setBorrowers(borrowers.filter(b => b.id !== id))
      logger.log(user?.username || 'unknown', user?.displayName || 'Unknown', 'Xóa', 'Cho vay', `Xóa khách vay: ${name}`)
    } catch (error) {
      console.error("Error deleting borrower:", error)
    }
  }

  // Handle agreement operations
  const generateLoanCode = (borrower_name: string, startDate: string, id: string) => {
    const nameParts = borrower_name.trim().split(/\s+/)
    const lastName = nameParts[nameParts.length - 1].substring(0, 3).toUpperCase()
    const dateParts = startDate.split('-')
    const dateFormatted = dateParts[2] + dateParts[1] + dateParts[0]
    const idPart = id.substring(0, 6).toUpperCase()
    return `VY-${lastName}-${dateFormatted}-${idPart}`
  }

  const handleSaveAgreement = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      let borrower: LoanBorrower | null | undefined = null

      if (isNewBorrower) {
        if (!newBorrowerData.name || !newBorrowerData.phone || !newBorrowerData.idcard) {
          alert("⚠️ Vui lòng điền đầy đủ thông tin khách vay!")
          return
        }

        let borrowerPhotoUrl = ""
        let cccdFrontUrl = ""

        if (newBorrowerData.borrower_photo) {
          borrowerPhotoUrl = await uploadImage(newBorrowerData.borrower_photo, "loan-documents", "borrower-photos") || ""
        }
        if (newBorrowerData.cccd_front) {
          cccdFrontUrl = await uploadImage(newBorrowerData.cccd_front, "loan-documents", "cccd-front") || ""
        }

        borrower = await insertLoanBorrower({
          name: newBorrowerData.name,
          phone: newBorrowerData.phone,
          idcard: newBorrowerData.idcard,
          facebook: "",
          address: "",
          status: "active",
          totalloans: 0,
          borrowerphoto: borrowerPhotoUrl ? [borrowerPhotoUrl] : [],
          cccdfront: cccdFrontUrl ? [cccdFrontUrl] : [],
          cccdback: [],
        })

        setBorrowers([borrower, ...borrowers])
        setAgreementForm({ ...agreementForm, borrowerid: borrower.id })
      } else {
        borrower = borrowers.find(b => b.id === agreementForm.borrowerid)
        if (!borrower) {
          alert("⚠️ Vui lòng chọn khách vay!")
          return
        }
      }

      const loanData = {
        borrowerid: borrower.id,
        borrowername: borrower.name,
        borrowerphone: borrower.phone,
        borrowercccd: borrower.idcard,
        loanamount: parseMoneyInput(agreementForm.loanamount),
        interestratetype: agreementForm.interestratetype as "fixed_daily" | "percentage",
        interestrate: parseFloat(agreementForm.interestrate) || 0,
        interestperiod: agreementForm.interestperiod as "day" | "week" | "month",
        interestpaymentcycle: parseInt(agreementForm.interestpaymentcycle) || 1,
        startdate: agreementForm.startdate,
        duedate: agreementForm.duedate,
        graceperioddays: parseInt(agreementForm.graceperioddays) || 0,
        purpose: agreementForm.purpose,
        collateral: agreementForm.collateral,
        collateralvalue: parseMoneyInput(agreementForm.collateralvalue),
        notes: agreementForm.notes,
      }

      if (editingAgreement) {
        const updated = await updateLoanAgreement(editingAgreement.id, {
          ...loanData,
          nextpaymentdate: editingAgreement.nextpaymentdate || editingAgreement.startdate,
          status: editingAgreement.status,
        })
        setAgreements(agreements.map(a => a.id === updated.id ? updated : a))
        logger.log(user?.username || 'unknown', user?.displayName || 'Unknown', 'Chỉnh sửa', 'Cho vay', `Cập nhật đơn vay: ${loanData.loanamount.toLocaleString()}đ`)
      } else {
        const newAgreement = await insertLoanAgreement({
          ...loanData,
          nextpaymentdate: agreementForm.startdate,
          status: "active" as const,
          loancode: `VY-${Date.now()}`,
        })

        const loanCode = generateLoanCode(borrower.name, agreementForm.startdate, newAgreement.id)
        const updatedAgreement = await updateLoanAgreement(newAgreement.id, { loancode: loanCode })

        setAgreements([updatedAgreement, ...agreements])
        logger.log(user?.username || 'unknown', user?.displayName || 'Unknown', 'Thêm mới', 'Cho vay', `Tạo đơn vay: ${loanCode}`)

        await insertLoanLedger({
          agreementid: updatedAgreement.id,
          loancode: loanCode,
          type: 'CASH_OUT_LOAN',
          amount: loanData.loanamount,
          description: `Giải ngân cho ${borrower.name}`,
          paymentmethod: 'cash',
          user: user?.displayName || 'Unknown',
          timestamp: new Date().toISOString(),
        })
      }

      setShowAgreementDialog(false)
      setAgreementForm({
        borrowerid: "",
        loanamount: "",
        interestratetype: "fixed_daily",
        interestrate: "",
        interestperiod: "day",
        interestpaymentcycle: "1",
        startdate: "",
        duedate: "",
        graceperioddays: "0",
        purpose: "",
        collateral: "",
        collateralvalue: "",
        notes: "",
      })
      setNewBorrowerData({
        name: "",
        phone: "",
        idcard: "",
        borrower_photo: null,
        cccd_front: null,
      })
      setIsNewBorrower(false)
      setEditingAgreement(null)
    } catch (error) {
      console.error("Error saving agreement:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteAgreement = async (id: string, code: string) => {
    if (!confirm(`Xóa đơn vay "${code}"?`)) return
    try {
      await deleteLoanAgreement(id)
      setAgreements(agreements.filter(a => a.id !== id))
      logger.log(user?.username || 'unknown', user?.displayName || 'Unknown', 'Xóa', 'Cho vay', `Xóa đơn vay: ${code}`)
    } catch (error) {
      console.error("Error deleting agreement:", error)
    }
  }

  const handleCapitalAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      const amount = parseMoneyInput(capitalForm.amount)
      const isNạp = capitalForm.type === "nạp"
      const ledgerAmount = isNạp ? amount : -amount

      await insertLoanLedger({
        type: 'OPERATIONAL_EXPENSE',
        amount: ledgerAmount,
        description: `${isNạp ? 'Nạp' : 'Rút'} vốn quỹ: ${capitalForm.note || "Điều chỉnh vốn"} (${amount.toLocaleString()}đ)`,
        paymentmethod: 'cash',
        user: user?.displayName || 'Unknown',
        timestamp: new Date().toISOString(),
      })

      const updatedLedger = await fetchLoanLedger()
      setLedger(updatedLedger)
      const capital = updatedLedger
        .filter(l => l.type === 'OPERATIONAL_EXPENSE')
        .reduce((sum, l) => sum + l.amount, 0)
      setAvailableCapital(capital)

      logger.log(user?.username || 'unknown', user?.displayName || 'Unknown', 'Chỉnh sửa', 'Cho vay', `${isNạp ? 'Nạp' : 'Rút'} vốn: ${capitalForm.note || "N/A"} (${amount.toLocaleString()}đ)`)

      setIsCapitalModalOpen(false)
      setCapitalForm({ type: "nạp", amount: "", note: "" })
    } catch (error) {
      console.error("Error adjusting capital:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const calculateDefaultInterest = (agreement: LoanAgreement) => {
    if (!agreement) return 0
    const lastDateStr = agreement.nextpaymentdate || agreement.startdate
    const lastDate = new Date(lastDateStr)
    const today = new Date()
    lastDate.setHours(0,0,0,0)
    today.setHours(0,0,0,0)
    const diffTime = today.getTime() - lastDate.getTime()
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

    if (agreement.interestratetype === "fixed_daily") {
      const cycleVal = agreement.interestpaymentcycle || 1
      const cycles = Math.max(1, Math.ceil(diffDays / cycleVal))
      return agreement.interestrate * cycleVal * cycles
    } else {
      const interestPerCycle = agreement.loanamount * (agreement.interestrate / 100)
      const period = agreement.interestperiod
      const cycleDays = period === "month" ? 30 : period === "week" ? 7 : 1
      const cycles = Math.max(1, Math.ceil(diffDays / cycleDays))
      return interestPerCycle * cycles
    }
  }

  const handleOpenPaymentDialog = (agreement: LoanAgreement) => {
    setSelectedAgreement(agreement)
    const defaultInterest = calculateDefaultInterest(agreement)
    setPaymentForm({
      type: "CASH_IN_INTEREST",
      amount: formatMoneyInput(defaultInterest.toString()),
      interestAdjustment: "",
      paymentMethod: "cash",
      description: `DONG LAI ${agreement.loancode}`,
      notes: "",
    })
    setShowPaymentDialog(true)
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAgreement) return
    try {
      setSubmitting(true)
      const rawAmount = parseMoneyInput(paymentForm.amount)
      const adjustment = parseMoneyInput(paymentForm.interestAdjustment || "0")
      const finalAmount = Math.max(0, rawAmount - adjustment)

      await insertLoanLedger({
        agreementid: selectedAgreement.id,
        loancode: selectedAgreement.loancode,
        type: paymentForm.type,
        amount: finalAmount,
        description: `${paymentForm.type === 'CASH_IN_INTEREST' ? 'Thu tiền lãi' : paymentForm.type === 'CASH_IN_PRINCIPAL' ? 'Thu nợ gốc' : 'Tất toán khoản vay'} cho HĐ ${selectedAgreement.loancode}. ${paymentForm.description}. Ghi chú: ${paymentForm.notes}`,
        paymentmethod: paymentForm.paymentMethod,
        user: user?.displayName || 'Unknown',
        timestamp: new Date().toISOString(),
      })

      let updatedAmount = selectedAgreement.loanamount
      let nextPayDate = selectedAgreement.nextpaymentdate || selectedAgreement.startdate
      let newStatus = selectedAgreement.status

      if (paymentForm.type === "CASH_IN_INTEREST") {
        const currentDate = new Date(nextPayDate)
        const cycleVal = selectedAgreement.interestpaymentcycle || 1
        const period = selectedAgreement.interestperiod

        if (period === "day") {
          currentDate.setDate(currentDate.getDate() + cycleVal)
        } else if (period === "week") {
          currentDate.setDate(currentDate.getDate() + (cycleVal * 7))
        } else if (period === "month") {
          currentDate.setMonth(currentDate.getMonth() + cycleVal)
        }

        nextPayDate = currentDate.toISOString().split("T")[0]
        const isNextOverdue = new Date(nextPayDate) < new Date()
        newStatus = isNextOverdue ? "overdue" : "active"
      } else if (paymentForm.type === "CASH_IN_PRINCIPAL") {
        updatedAmount = Math.max(0, selectedAgreement.loanamount - rawAmount)
        if (updatedAmount <= 0) {
          newStatus = "completed"
        }
      } else if (paymentForm.type === "CASH_IN_EARLY") {
        updatedAmount = 0
        newStatus = "completed"
      }

      await updateLoanAgreement(selectedAgreement.id, {
        loanamount: updatedAmount,
        nextpaymentdate: nextPayDate,
        status: newStatus
      })

      const agreementsData = await fetchLoanAgreements()
      setAgreements(agreementsData)
      const ledgerData = await fetchLoanLedger()
      setLedger(ledgerData)

      logger.log(
        user?.username || 'unknown',
        user?.displayName || 'Unknown',
        'Chỉnh sửa',
        'Cho vay',
        `Ghi nhận giao dịch ${paymentForm.type} hợp đồng ${selectedAgreement.loancode}: ${finalAmount.toLocaleString()}đ`
      )

      setShowPaymentDialog(false)
      setSelectedAgreement(null)
    } catch (error) {
      console.error("Error processing payment:", error)
    } finally {
      setSubmitting(false)
    }
  }

  // Backup operations
  const handleLoanBackup = async () => {
    try {
      setBackupLoading(true)
      setBackupMessage(null)

      const [bData, aData, lData] = await Promise.all([
        fetchLoanBorrowers(),
        fetchLoanAgreements(),
        fetchLoanLedger()
      ])

      const backupObj: LoanBackupData = {
        timestamp: new Date().toISOString(),
        loan_borrowers: bData,
        loan_agreements: aData,
        loan_ledger: lData
      }

      const fileName = `loan-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
      const jsonString = JSON.stringify(backupObj, null, 2)
      const blob = new Blob([jsonString], { type: "application/json" })

      const { error: uploadError } = await supabase.storage
        .from("backups")
        .upload(fileName, blob, { upsert: false })

      if (uploadError) throw uploadError

      if (user) {
        await logger.log(
          user.username,
          user.displayName,
          "Sao lưu dữ liệu",
          "Cho vay",
          `Sao lưu phân hệ cho vay: ${bData.length} khách vay, ${aData.length} đơn vay, ${lData.length} giao dịch`
        )
      }

      setBackupMessage({
        type: "success",
        text: `✅ Sao lưu phân hệ cho vay thành công!\n- ${bData.length} khách vay\n- ${aData.length} đơn vay\n- ${lData.length} giao dịch\n\nFile: ${fileName}`
      })

      loadBackupFiles()
    } catch (error) {
      console.error("Loan backup error:", error)
      setBackupMessage({ type: "error", text: `❌ Lỗi sao lưu: ${(error as any).message}` })
    } finally {
      setBackupLoading(false)
    }
  }

  const handleLoanRestore = async (url: string, fileName: string) => {
    try {
      setBackupLoading(true)
      setBackupMessage(null)

      const response = await fetch(url)
      const data = await response.json()

      if (!data.loan_borrowers || !data.loan_agreements || !data.loan_ledger) {
        throw new Error("Định dạng tệp sao lưu không hợp lệ")
      }

      await Promise.all([
        supabase.from('loan_borrowers').delete().neq('id', 'null'),
        supabase.from('loan_agreements').delete().neq('id', 'null'),
        supabase.from('loan_ledger').delete().neq('id', 'null'),
      ])

      const [bRes, aRes, lRes] = await Promise.all([
        supabase.from('loan_borrowers').insert(data.loan_borrowers),
        supabase.from('loan_agreements').insert(data.loan_agreements),
        supabase.from('loan_ledger').insert(data.loan_ledger),
      ])

      if (bRes.error || aRes.error || lRes.error) {
        throw new Error("Lỗi khôi phục dữ liệu")
      }

      if (user) {
        await logger.log(
          user.username,
          user.displayName,
          "Khôi phục dữ liệu",
          "Cho vay",
          `Khôi phục từ bản sao lưu: ${fileName}`
        )
      }

      setBackupMessage({
        type: "success",
        text: `✅ Khôi phục dữ liệu cho vay thành công!\n- ${data.loan_borrowers.length} khách vay\n- ${data.loan_agreements.length} đơn vay\n- ${data.loan_ledger.length} giao dịch`
      })

      const [b, a, l] = await Promise.all([
        fetchLoanBorrowers(),
        fetchLoanAgreements(),
        fetchLoanLedger()
      ])
      setBorrowers(b)
      setAgreements(a)
      setLedger(l)
    } catch (error) {
      console.error("Loan restore error:", error)
      setBackupMessage({ type: "error", text: `❌ Lỗi khôi phục: ${(error as any).message}` })
    } finally {
      setBackupLoading(false)
    }
  }

  const handleLoanRestoreFromUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return

      setBackupLoading(true)
      setBackupMessage(null)

      const text = await file.text()
      const data = JSON.parse(text)

      if (!data.loan_borrowers || !data.loan_agreements || !data.loan_ledger) {
        throw new Error("Định dạng tệp sao lưu không hợp lệ")
      }

      await Promise.all([
        supabase.from('loan_borrowers').delete().neq('id', 'null'),
        supabase.from('loan_agreements').delete().neq('id', 'null'),
        supabase.from('loan_ledger').delete().neq('id', 'null'),
      ])

      const [bRes, aRes, lRes] = await Promise.all([
        supabase.from('loan_borrowers').insert(data.loan_borrowers),
        supabase.from('loan_agreements').insert(data.loan_agreements),
        supabase.from('loan_ledger').insert(data.loan_ledger),
      ])

      if (bRes.error || aRes.error || lRes.error) {
        throw new Error("Lỗi khôi phục dữ liệu")
      }

      if (user) {
        await logger.log(
          user.username,
          user.displayName,
          "Khôi phục dữ liệu",
          "Cho vay",
          `Khôi phục từ tệp tin được tải lên: ${file.name}`
        )
      }

      setBackupMessage({
        type: "success",
        text: `✅ Khôi phục dữ liệu cho vay thành công!\n- ${data.loan_borrowers.length} khách vay\n- ${data.loan_agreements.length} đơn vay\n- ${data.loan_ledger.length} giao dịch`
      })

      const [b, a, l] = await Promise.all([
        fetchLoanBorrowers(),
        fetchLoanAgreements(),
        fetchLoanLedger()
      ])
      setBorrowers(b)
      setAgreements(a)
      setLedger(l)
    } catch (error) {
      console.error("Loan restore from upload error:", error)
      setBackupMessage({ type: "error", text: `❌ Lỗi khôi phục: ${(error as any).message}` })
    } finally {
      setBackupLoading(false)
    }
  }

  const handleDeleteBackup = async (fileName: string) => {
    try {
      setBackupLoading(true)
      const { error } = await supabase.storage.from('backups').remove([fileName])
      if (error) throw error

      if (user) {
        await logger.log(
          user.username,
          user.displayName,
          "Xoá",
          "Cho vay",
          `Xoá bản sao lưu: ${fileName}`
        )
      }

      loadBackupFiles()
    } catch (error) {
      console.error("Delete backup error:", error)
      setBackupMessage({ type: "error", text: `❌ Lỗi xoá: ${(error as any).message}` })
    } finally {
      setBackupLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin text-purple-950">
          <Database className="w-8 h-8" />
        </div>
      </div>
    )
  }

  return (
    <ModulePageShell module="loan">
      <ModuleBrandHeader
        module="loan"
        sticky
        subtitle={`${LAVIECAR_BUSINESS.shopName} · Quản lý hợp đồng cho vay, thu lãi và hồi vốn`}
        actions={
          <>
            <Button
              onClick={() => setIsCapitalModalOpen(true)}
              variant="outline"
              className="border-slate-200 text-slate-700 text-sm rounded-xl h-9 hover:bg-slate-50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Tinh chỉnh vốn
            </Button>
            <Button
              onClick={() => {
                setEditingAgreement(null)
                setIsNewBorrower(false)
                setAgreementForm({
                  borrowerid: "",
                  loanamount: "",
                  interestratetype: "fixed_daily",
                  interestrate: "",
                  interestperiod: "day",
                  interestpaymentcycle: "1",
                  startdate: "",
                  duedate: "",
                  graceperioddays: "0",
                  purpose: "",
                  collateral: "",
                  collateralvalue: "",
                  notes: "",
                })
                setShowAgreementDialog(true)
              }}
              className="bg-purple-900 hover:bg-purple-950 text-white text-sm rounded-xl h-9 font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Hợp đồng cho vay mới
            </Button>
          </>
        }
      />

      {/* Dashboard Tab */}
      {currentTab === "dashboard" && (
        <div className="space-y-5">
          {stats.overdueLoans > 0 && (
            <div
              className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 cursor-pointer hover:bg-orange-100 transition-colors"
              onClick={() => {
                setAgreementStatusFilter("overdue")
                setCurrentTab("agreements")
                router.push("?tab=agreements")
              }}
            >
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-orange-800">{stats.overdueLoans} đơn vay đang quá hạn</p>
                <p className="text-xs text-orange-600">Nhấn để xem danh sách và xử lý</p>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-400 shrink-0" />
            </div>
          )}

          {loading ? (
            <SkeletonMetricCards count={7} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
              <LoanKpiCard
                variant="hero"
                label="Vốn khả dụng"
                value={formatPrice(availableCapital)}
                valueClassName="text-purple-900"
              />
              <LoanKpiCard
                variant="hero"
                label="Tổng vốn cho vay"
                value={formatPrice(stats.totalLoanAmount)}
                onClick={() => {
                  setCurrentTab("agreements")
                  router.push("?tab=agreements")
                }}
              />
              <LoanKpiCard
                variant="hero"
                label="Lãi thu được"
                value={formatPrice(stats.totalInterestCollected)}
                valueClassName="text-emerald-700"
              />
              <LoanKpiCard
                variant="hero"
                label="Chi phí vận hành"
                value={formatPrice(operationalExpense)}
                valueClassName="text-amber-750"
              />
              <LoanKpiCard
                variant="hero"
                label="Lãi ròng thực tế"
                value={formatPrice(netProfit)}
                valueClassName={netProfit >= 0 ? "text-emerald-700" : "text-red-600"}
                sublabel={badDebtAmount > 0 ? `Nợ xấu: ${formatPrice(badDebtAmount)}` : undefined}
              />
              <LoanKpiCard
                variant="hero"
                label="Khách hoạt động"
                value={stats.totalBorrowers}
              />
              <LoanKpiCard
                variant="hero"
                label="Đơn quá hạn"
                value={`${stats.overdueLoans}`}
                valueClassName="text-red-600"
                sublabel="đơn vay"
                onClick={() => {
                  setAgreementStatusFilter("overdue")
                  setCurrentTab("agreements")
                  router.push("?tab=agreements")
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            <LoanStatusChart data={statusChartData} />
            <LoanCapitalChart data={capitalChartData} formatPrice={formatPrice} />
            <LoanProfitChart data={profitChartData} formatPrice={formatPrice} />
            <MonthlyCashFlowChart data={monthlyCashFlowData} formatPrice={formatPrice} />
          </div>

          <ModuleSectionCard
            title="Giao dịch gần đây"
            description="10 giao dịch mới nhất trên sổ cái cho vay"
          >
            <CardContent className="p-0">
              {ledger.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400 text-sm">Chưa có giao dịch nào</p>
                </div>
              ) : (
                <ModuleResponsiveTable
                  desktop={
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="module-table-head border-b border-slate-100 bg-slate-50/50">
                          <th className={cn(loanTableHeadClass, "w-12 text-center")}>STT</th>
                          <th className={loanTableHeadClass}>Loại</th>
                          <th className={loanTableHeadClass}>Mô tả</th>
                          <th className={cn(loanTableHeadClass, "text-right")}>Số tiền</th>
                          <th className={loanTableHeadClass}>Người thực hiện</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                        {ledger.slice(0, 10).map((entry, index) => (
                          <tr key={entry.id} className="module-table-row hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 text-center text-xs text-slate-400 font-medium">{index + 1}</td>
                            <td className="py-3 px-4">
                              <span className="inline-flex text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                                {getLoanLedgerTypeLabel(entry.type)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{entry.description}</td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-800 tabular-nums">
                              {formatPrice(entry.amount)}
                            </td>
                            <td className="py-3 px-4 text-slate-500">{entry.user}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  }
                  mobile={ledger.slice(0, 10).map((entry, index) => (
                    <ModuleMobileCard key={entry.id}>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                          {getLoanLedgerTypeLabel(entry.type)}
                        </span>
                        <span className="text-xs text-slate-400">#{index + 1}</span>
                      </div>
                      <p className="text-sm text-slate-700">{entry.description}</p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-900 tabular-nums">{formatPrice(entry.amount)}</span>
                        <span className="text-slate-500">{entry.user}</span>
                      </div>
                    </ModuleMobileCard>
                  ))}
                />
              )}
            </CardContent>
          </ModuleSectionCard>
        </div>
      )}

      {/* Borrowers Tab */}
      {currentTab === "borrowers" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <LoanKpiCard label="Tổng khách vay" value={borrowerStats.total} sublabel={`${filteredBorrowers.length} đang lọc`} />
            <LoanKpiCard
              label="Đang hoạt động"
              value={borrowerStats.active}
              sublabel="Tài khoản mở"
              valueClassName="text-purple-900"
              onClick={() => {
                setBorrowerStatusFilter("active")
                setSearchTerm("")
              }}
            />
            <LoanKpiCard
              label="Đã khóa"
              value={borrowerStats.inactive}
              sublabel="Không giao dịch"
              valueClassName="text-slate-600"
              onClick={() => {
                setBorrowerStatusFilter("inactive")
                setSearchTerm("")
              }}
            />
            <LoanKpiCard
              label="Có đơn đang vay"
              value={borrowerStats.withActiveLoans}
              sublabel="Khách tích cực"
              valueClassName="text-amber-700"
            />
          </div>

          <ModuleSectionCard
            title="Danh sách khách vay"
            description={`Quản lý ${filteredBorrowers.length} khách vay`}
            filters={
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Tên, SĐT, CCCD..."
                    className={cn(loanFilterInputClass, "pl-9")}
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>
                <Select value={borrowerStatusFilter} onValueChange={setBorrowerStatusFilter}>
                  <SelectTrigger className="w-full md:w-40 h-9 rounded-xl border-slate-200 text-sm bg-white">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Đang hoạt động</SelectItem>
                    <SelectItem value="inactive">Bị khóa</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    setEditingBorrower(null)
                    setBorrowerForm({ name: "", phone: "", facebook: "", address: "", idcard: "", status: "active" })
                    setShowBorrowerDialog(true)
                  }}
                  className="bg-purple-900 hover:bg-purple-950 text-white h-9 rounded-xl text-sm font-semibold shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Thêm khách
                </Button>
              </div>
            }
          >
            <CardContent className="p-0">
              {filteredBorrowers.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Không tìm thấy khách vay nào</p>
                </div>
              ) : (
                <ModuleResponsiveTable
                  desktop={
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="module-table-head border-b border-slate-100 bg-slate-50/50">
                          <th className={cn(loanTableHeadClass, "w-12 text-center")}>STT</th>
                          <th className={loanTableHeadClass}>Tên khách</th>
                          <th className={loanTableHeadClass}>Số điện thoại</th>
                          <th className={loanTableHeadClass}>Địa chỉ</th>
                          <th className={loanTableHeadClass}>CCCD</th>
                          <th className={cn(loanTableHeadClass, "text-center")}>Đơn vay</th>
                          <th className={cn(loanTableHeadClass, "text-center")}>Trạng thái</th>
                          <th className={cn(loanTableHeadClass, "text-right")}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                        {filteredBorrowers.map((borrower, index) => (
                          <tr key={borrower.id} className="module-table-row hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 text-center text-xs text-slate-400 font-medium">{index + 1}</td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800">{borrower.name}</td>
                            <td className="py-3.5 px-4">{borrower.phone}</td>
                            <td className="py-3.5 px-4">{borrower.address || "-"}</td>
                            <td className="py-3.5 px-4 font-mono text-xs">{borrower.idcard || "-"}</td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex flex-col items-center">
                                <span className="font-bold text-amber-600">{getBorrowerLoanCount(borrower.id)} ĐV</span>
                                {getBorrowerActiveLoanCount(borrower.id) > 0 && (
                                  <span className="text-[10px] text-emerald-700 font-semibold">
                                    {getBorrowerActiveLoanCount(borrower.id)} đang vay
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                borrower.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"
                              }`}>
                                {borrower.status === "active" ? "Hoạt động" : "Khóa"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-sky-600 hover:text-sky-700 rounded-lg hover:bg-sky-50"
                                  onClick={() => { setSelectedBorrowerForHistory(borrower); setShowBorrowerHistoryDialog(true) }}
                                  title="Lịch sử vay"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                                  onClick={() => {
                                    setEditingBorrower(borrower)
                                    setBorrowerForm({
                                      name: borrower.name,
                                      phone: borrower.phone,
                                      facebook: borrower.facebook || "",
                                      address: borrower.address || "",
                                      idcard: borrower.idcard || "",
                                      status: borrower.status,
                                    })
                                    setShowBorrowerDialog(true)
                                  }}
                                  title="Chỉnh sửa"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </Button>
                                {user?.role === "admin" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50"
                                    onClick={() => handleDeleteBorrower(borrower.id, borrower.name)}
                                    title="Xóa khách hàng"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  }
                  mobile={filteredBorrowers.map((borrower) => (
                    <ModuleMobileCard key={borrower.id}>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-semibold text-slate-800">{borrower.name}</p>
                          <p className="text-xs text-slate-500">{borrower.phone}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          borrower.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"
                        }`}>
                          {borrower.status === "active" ? "Hoạt động" : "Khóa"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>CCCD: {borrower.idcard || "—"}</span>
                        <div className="text-right">
                          <span className="font-bold text-amber-600">{getBorrowerLoanCount(borrower.id)} đơn</span>
                          {getBorrowerActiveLoanCount(borrower.id) > 0 && (
                            <span className="block text-[10px] text-emerald-700 font-semibold">{getBorrowerActiveLoanCount(borrower.id)} đang vay</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1.5 border-t border-slate-100 mt-0.5">
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs border-slate-200 rounded-lg text-sky-700" onClick={() => { setSelectedBorrowerForHistory(borrower); setShowBorrowerHistoryDialog(true) }}>
                          <History className="w-3 h-3 mr-1" />Lịch sử vay
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-slate-200 rounded-lg" onClick={() => { setEditingBorrower(borrower); setBorrowerForm({ name: borrower.name, phone: borrower.phone, facebook: borrower.facebook || "", address: borrower.address || "", idcard: borrower.idcard || "", status: borrower.status }); setShowBorrowerDialog(true) }}>
                          <Settings className="w-3 h-3" />
                        </Button>
                      </div>
                    </ModuleMobileCard>
                  ))}
                />
              )}
            </CardContent>
          </ModuleSectionCard>
        </div>
      )}

      {/* Agreements Tab */}
      {currentTab === "agreements" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <LoanKpiCard label="Tổng đơn vay" value={agreementStats.total} sublabel={`${filteredAgreements.length} đang lọc`} />
            <LoanKpiCard
              label="Đang vay"
              value={agreementStats.active}
              sublabel="Đơn hiện hành"
              valueClassName="text-sky-700"
              onClick={() => {
                setAgreementStatusFilter("active")
                setSearchTerm("")
                setShowDueToday(false)
              }}
            />
            <LoanKpiCard
              label="Quá hạn"
              value={agreementStats.overdue}
              sublabel="Cần theo dõi"
              valueClassName="text-amber-700"
              onClick={() => {
                setAgreementStatusFilter("overdue")
                setSearchTerm("")
                setShowDueToday(false)
              }}
            />
            <LoanKpiCard
              label="Dư nợ"
              value={formatPrice(agreementStats.outstanding)}
              sublabel={`${agreementStats.completed} đã hoàn thành`}
              valueClassName="text-lg"
            />
          </div>

          <ModuleSectionCard
            title="Danh sách đơn vay"
            description={`Quản lý ${filteredAgreements.length} đơn vay`}
            filters={
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Mã vay, tên khách..."
                    className={cn(loanFilterInputClass, "pl-9")}
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>
                <Select value={agreementStatusFilter} onValueChange={setAgreementStatusFilter}>
                  <SelectTrigger className="w-full md:w-40 h-9 rounded-xl border-slate-200 text-sm bg-white">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Đang vay</SelectItem>
                    <SelectItem value="overdue">Quá hạn</SelectItem>
                    <SelectItem value="completed">Hoàn thành</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    setEditingAgreement(null)
                    setAgreementForm({
                      borrowerid: "",
                      loanamount: "",
                      interestratetype: "fixed_daily",
                      interestrate: "",
                      interestperiod: "day",
                      interestpaymentcycle: "1",
                      startdate: "",
                      duedate: "",
                      graceperioddays: "0",
                      purpose: "",
                      collateral: "",
                      collateralvalue: "",
                      notes: "",
                    })
                    setShowAgreementDialog(true)
                  }}
                  className="bg-purple-900 hover:bg-purple-950 text-white h-9 rounded-xl text-sm font-semibold shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Thêm đơn vay
                </Button>
              </div>
            }
          >
            <CardContent className="p-0">
              <ModuleResponsiveTable
                desktop={
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="module-table-head border-b border-slate-100 bg-slate-50/50">
                        <th className={cn(loanTableHeadClass, "w-12 text-center")}>STT</th>
                        <th className={loanTableHeadClass}>Mã vay</th>
                        <th className={loanTableHeadClass}>Khách vay</th>
                        <th className={cn(loanTableHeadClass, "text-right")}>Số tiền</th>
                        <th className={cn(loanTableHeadClass, "text-center")}>Lãi suất</th>
                        <th className={loanTableHeadClass}>Đến hạn</th>
                        <th className={cn(loanTableHeadClass, "text-center")}>Trạng thái</th>
                        <th className={cn(loanTableHeadClass, "text-right")}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                      {filteredAgreements.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            Chưa có đơn vay nào
                          </td>
                        </tr>
                      ) : (
                        filteredAgreements.map((agreement, index) => {
                          const isOverdue = agreement.duedate && new Date(agreement.duedate) < new Date() && agreement.status !== "completed"
                          const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - new Date(agreement.duedate).getTime()) / (1000*60*60*24)) : 0
                          const statusColor = agreement.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : agreement.status === "overdue" || isOverdue
                            ? "bg-orange-50 text-orange-700 border-orange-100"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                          const openEdit = () => {
                            setEditingAgreement(agreement)
                            setAgreementForm({
                              borrowerid: agreement.borrowerid,
                              loanamount: agreement.loanamount.toString(),
                              interestratetype: agreement.interestratetype,
                              interestrate: agreement.interestrate.toString(),
                              interestperiod: agreement.interestperiod,
                              interestpaymentcycle: agreement.interestpaymentcycle.toString(),
                              startdate: agreement.startdate,
                              duedate: agreement.duedate,
                              graceperioddays: agreement.graceperioddays.toString(),
                              purpose: agreement.purpose || "",
                              collateral: agreement.collateral || "",
                              collateralvalue: agreement.collateralvalue.toString(),
                              notes: agreement.notes || "",
                            })
                            setShowAgreementDialog(true)
                          }

                          return (
                            <tr key={agreement.id} className="module-table-row hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-4 text-center text-xs text-slate-400 font-medium">{index + 1}</td>
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-slate-900 block">{agreement.loancode}</span>
                                <span className="text-[10px] text-slate-400">{formatDisplayDate(agreement.startdate)}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-semibold text-slate-800 block">{agreement.borrowername}</span>
                                <span className="text-[10px] text-slate-400">{agreement.borrowerphone}</span>
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-slate-950">{formatMoneyInput(agreement.loanamount.toString())}</td>
                              <td className="py-3.5 px-4 text-center text-xs">
                                {formatLoanInterestRate(agreement)}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="block">{formatDisplayDate(agreement.duedate)}</span>
                                {agreement.nextpaymentdate && agreement.status !== "completed" && (
                                  <span className="text-[10px] text-amber-600 font-medium">Kỳ: {formatDisplayDate(agreement.nextpaymentdate)}</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                                  {agreement.status === "completed" ? "Hoàn thành" : isOverdue ? "Quá hạn" : "Đang vay"}
                                </span>
                                {isOverdue && daysOverdue > 0 && (
                                  <span className="block text-[10px] text-red-500 mt-0.5 font-semibold">{daysOverdue} ngày</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center justify-end gap-1">
                                  {agreement.status !== "completed" && agreement.status !== "cancelled" && (
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50" onClick={() => handleOpenPaymentDialog(agreement)} title="Thu lãi / gốc">
                                      <DollarSign className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-sky-600 hover:text-sky-700 rounded-lg hover:bg-sky-50" onClick={() => { setScheduleAgreement(agreement); setShowScheduleDialog(true) }} title="Lịch trả nợ">
                                    <Calendar className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100" onClick={() => handlePrintContract(agreement)} title="In hợp đồng">
                                    <Printer className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 rounded-lg hover:bg-amber-50" onClick={openEdit} title="Chỉnh sửa">
                                    <Settings className="w-3.5 h-3.5" />
                                  </Button>
                                  {user?.role === "admin" && (
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50" onClick={() => handleDeleteAgreement(agreement.id, agreement.loancode)} title="Xóa">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                }
                mobile={
                  filteredAgreements.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">Chưa có đơn vay nào</div>
                  ) : (
                    filteredAgreements.map((agreement) => {
                      const isOverdue = agreement.duedate && new Date(agreement.duedate) < new Date() && agreement.status !== "completed"
                      const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - new Date(agreement.duedate).getTime()) / (1000*60*60*24)) : 0
                      return (
                        <ModuleMobileCard key={agreement.id}>
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{agreement.loancode}</p>
                              <p className="text-xs text-slate-500">{agreement.borrowername} · {agreement.borrowerphone}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                              agreement.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : isOverdue ? "bg-orange-50 text-orange-700 border-orange-100"
                                : "bg-blue-50 text-blue-700 border-blue-100"
                            }`}>
                              {agreement.status === "completed" ? "Hoàn thành" : isOverdue ? `Quá ${daysOverdue}N` : "Đang vay"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-900 tabular-nums">{formatMoneyInput(agreement.loanamount.toString())}</span>
                            <span className="text-slate-500">{formatLoanInterestRate(agreement)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-slate-500">
                            <span>Hạn: {formatDisplayDate(agreement.duedate)}</span>
                            {agreement.nextpaymentdate && agreement.status !== "completed" && (
                              <span className="text-amber-600 font-medium">Kỳ: {formatDisplayDate(agreement.nextpaymentdate)}</span>
                            )}
                          </div>
                          {agreement.status !== "completed" && agreement.status !== "cancelled" && (
                            <div className="flex gap-2 pt-1.5 border-t border-slate-100 mt-0.5">
                              <Button size="sm" className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" onClick={() => handleOpenPaymentDialog(agreement)}>
                                <DollarSign className="w-3 h-3 mr-1" />Thu lãi
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-slate-200 rounded-lg text-sky-600" onClick={() => { setScheduleAgreement(agreement); setShowScheduleDialog(true) }} title="Lịch trả">
                                <Calendar className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-slate-200 rounded-lg" onClick={() => handlePrintContract(agreement)} title="In HĐ">
                                <Printer className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </ModuleMobileCard>
                      )
                    })
                  )
                }
              />
            </CardContent>
          </ModuleSectionCard>
        </div>
      )}

      {/* History Tab */}
      {currentTab === "history" && (
        <AccessHistoryModuleSection
          module="loan"
          logs={accessLogs}
          loading={logsLoading}
          onRefresh={() => loadAccessLogs(true)}
          allowed={user?.permissions?.canDelete ?? false}
        />
      )}

      {/* Backup & Restore Tab */}
      {currentTab === "backup" && (
        user?.role !== "admin" ? (
          <BackupAccessDenied />
        ) : (
          <BackupRestorePanel
            accent="purple"
            moduleName="Phân hệ cho vay"
            scopeLabel="Khách vay · Hợp đồng · Sổ cái"
            fileHint="Tiền tố loan-backup-, loan-auto-backup-"
            files={backupFiles}
            filesLoading={backupFilesLoading}
            loading={backupLoading}
            message={backupMessage}
            canBackup
            canRestore={user?.role === "admin"}
            canDelete
            onBackup={handleLoanBackup}
            onRestoreUpload={handleLoanRestoreFromUpload}
            onRestoreFile={handleLoanRestore}
            onDeleteFile={handleDeleteBackup}
            onRefresh={loadBackupFiles}
          />
        )
      )}

      {/* Borrower Dialog */}
      <Dialog open={showBorrowerDialog} onOpenChange={setShowBorrowerDialog}>
        <EntityFormDialogContent accent="purple" maxWidth="2xl">
          <EntityFormHeader
            title={editingBorrower ? "Sửa Khách Vay" : "Thêm Khách Vay"}
            description="Nhập thông tin khách vay trong hệ thống cho vay"
          />
          <form onSubmit={handleSaveBorrower}>
            <EntityFormBody>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600">Tên Khách</Label>
                  <Input
                    value={borrowerForm.name}
                    onChange={(e) => setBorrowerForm({ ...borrowerForm, name: e.target.value })}
                    placeholder="Nhập tên khách vay"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600">Số Điện Thoại</Label>
                  <Input
                    value={borrowerForm.phone}
                    onChange={(e) => setBorrowerForm({ ...borrowerForm, phone: e.target.value })}
                    placeholder="Nhập số điện thoại"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600">Số CCCD</Label>
                  <Input
                    value={borrowerForm.idcard}
                    onChange={(e) => setBorrowerForm({ ...borrowerForm, idcard: e.target.value })}
                    placeholder="Nhập số CCCD"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600">Facebook</Label>
                  <Input
                    value={borrowerForm.facebook}
                    onChange={(e) => setBorrowerForm({ ...borrowerForm, facebook: e.target.value })}
                    placeholder="Nhập Facebook"
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-slate-600">Địa Chỉ</Label>
                  <Textarea
                    value={borrowerForm.address}
                    onChange={(e) => setBorrowerForm({ ...borrowerForm, address: e.target.value })}
                    placeholder="Nhập địa chỉ"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600">Trạng Thái</Label>
                  <Select value={borrowerForm.status} onValueChange={(value: any) => setBorrowerForm({ ...borrowerForm, status: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Hoạt Động</SelectItem>
                      <SelectItem value="inactive">Bất Hoạt Động</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </EntityFormBody>
            <EntityFormFooter
              accent="purple"
              onCancel={() => setShowBorrowerDialog(false)}
              submitLabel="Lưu"
              loading={submitting}
            />
          </form>
        </EntityFormDialogContent>
      </Dialog>

      {/* Capital Adjustment Dialog */}
      <Dialog open={isCapitalModalOpen} onOpenChange={setIsCapitalModalOpen}>
        <EntityFormDialogContent accent="purple" maxWidth="md">
          <EntityFormHeader
            title="Tinh Chỉnh Vốn Quỹ"
            description="Ghi nhận điều chỉnh số dư vốn quỹ cho vay"
          />
          <form onSubmit={handleCapitalAdjust}>
            <EntityFormBody>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-505">Loại Giao Dịch</Label>
                <Select value={capitalForm.type} onValueChange={(value) => setCapitalForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nạp">
                      <span className="flex items-center gap-2">🟢 Nạp vốn</span>
                    </SelectItem>
                    <SelectItem value="rút">
                      <span className="flex items-center gap-2">🔴 Rút vốn</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Số tiền vốn (đ)</Label>
                <Input
                  type="text"
                  placeholder="VD: 100.000.000"
                  value={capitalForm.amount}
                  onChange={e => setCapitalForm(prev => ({ ...prev, amount: formatMoneyInput(e.target.value) }))}
                  className="rounded-xl border-slate-200 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Ghi chú</Label>
                <Input
                  placeholder="VD: Bổ sung vốn tháng 6..."
                  value={capitalForm.note}
                  onChange={e => setCapitalForm(prev => ({ ...prev, note: e.target.value }))}
                  className="rounded-xl border-slate-200 text-sm"
                />
              </div>
            </EntityFormBody>
            <EntityFormFooter
              accent="purple"
              onCancel={() => setIsCapitalModalOpen(false)}
              submitLabel="Xác nhận"
              loading={submitting}
            />
          </form>
        </EntityFormDialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <EntityFormDialogContent accent="purple" maxWidth="md">
          <EntityFormHeader
            title="Thanh Toán Kỳ Lãi / Trả Gốc"
            description="Ghi nhận giao dịch đóng tiền lãi định kỳ hoặc thu hồi vốn gốc"
          />

          {selectedAgreement && (
            <form onSubmit={handlePaymentSubmit}>
              <EntityFormBody>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-505">Mã hợp đồng:</span>
                    <span className="font-bold text-slate-800">{selectedAgreement.loancode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-505">Khách vay:</span>
                    <span className="font-semibold text-slate-800">{selectedAgreement.borrowername}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-505">Dư nợ gốc hiện tại:</span>
                    <span className="font-bold text-slate-800">{selectedAgreement.loanamount.toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-505">Ngày đóng lãi gần nhất:</span>
                    <span className="font-semibold text-amber-600">
                      {formatDisplayDate(selectedAgreement.nextpaymentdate || selectedAgreement.startdate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-505">Lãi suất thiết lập:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedAgreement && formatLoanInterestRate(selectedAgreement)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Loại giao dịch</Label>
                  <Select
                    value={paymentForm.type}
                    onValueChange={(val: any) => {
                      let prefillAmount = "0"
                      if (val === "CASH_IN_INTEREST") {
                        prefillAmount = calculateDefaultInterest(selectedAgreement).toString()
                      } else if (val === "CASH_IN_PRINCIPAL" || val === "CASH_IN_EARLY") {
                        prefillAmount = selectedAgreement.loanamount.toString()
                      }
                      setPaymentForm(prev => ({
                        ...prev,
                        type: val,
                        amount: formatMoneyInput(prefillAmount),
                        description: val === "CASH_IN_INTEREST"
                          ? `DONG LAI ${selectedAgreement.loancode}`
                          : val === "CASH_IN_PRINCIPAL"
                          ? `TRA GOC ${selectedAgreement.loancode}`
                          : `TAT TOAN ${selectedAgreement.loancode}`
                      }))
                    }}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH_IN_INTEREST">💰 Thu tiền lãi định kỳ</SelectItem>
                      <SelectItem value="CASH_IN_PRINCIPAL">📉 Thu một phần nợ gốc</SelectItem>
                      <SelectItem value="CASH_IN_EARLY">🏁 Tất toán toàn bộ đơn vay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Số tiền giao dịch thực tế (VNĐ)</Label>
                  <Input
                    type="text"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: formatMoneyInput(e.target.value) }))}
                    className="rounded-xl border-slate-200 font-bold"
                    required
                  />
                </div>

                {paymentForm.type === "CASH_IN_INTEREST" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Giảm trừ lãi (đ) - Nếu muốn giảm nợ cho khách</Label>
                    <Input
                      type="text"
                      value={paymentForm.interestAdjustment}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, interestAdjustment: formatMoneyInput(e.target.value) }))}
                      placeholder="VD: 50.000"
                      className="rounded-xl border-slate-200 text-rose-600 bg-white font-semibold"
                    />
                    {paymentForm.interestAdjustment && (
                      <p className="text-[10px] text-rose-500 font-bold mt-0.5">
                        Khách thực trả: {((parseMoneyInput(paymentForm.amount) - parseMoneyInput(paymentForm.interestAdjustment)) || 0).toLocaleString()}đ
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Phương thức nhận tiền</Label>
                  <Select
                    value={paymentForm.paymentMethod}
                    onValueChange={(val: any) => setPaymentForm(prev => ({ ...prev, paymentMethod: val }))}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">💵 Tiền mặt</SelectItem>
                      <SelectItem value="bank_transfer">🏦 Chuyển khoản ngân hàng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Nội dung giao dịch</Label>
                  <Input
                    value={paymentForm.description}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                    className="rounded-xl border-slate-200 text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Ghi chú thêm</Label>
                  <Textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Nhập thông tin chi tiết (VD: Đóng lãi kỳ 3, chuyển khoản Techcombank...)"
                    rows={2}
                    className="rounded-xl border-slate-200 text-xs"
                  />
                </div>
              </EntityFormBody>
              <EntityFormFooter
                accent="purple"
                onCancel={() => setShowPaymentDialog(false)}
                submitLabel="Xác nhận"
                loading={submitting}
              />
            </form>
          )}
        </EntityFormDialogContent>
      </Dialog>

      {/* Agreement Dialog */}
      <Dialog open={showAgreementDialog} onOpenChange={setShowAgreementDialog}>
        <EntityFormDialogContent accent="purple" maxWidth="3xl">
          <EntityFormHeader
            title={editingAgreement ? "Sửa hợp đồng cho vay" : "Hợp đồng cho vay mới"}
            description="Nhập hồ sơ khách vay, điều khoản khoản vay và thông tin thế chấp"
          />
          <form onSubmit={handleSaveAgreement} className="space-y-6">
            <EntityFormBody>
              <EntityFormSection title="👤 1. Thông tin khách vay" description="Chọn khách cũ hoặc thêm khách mới">
                <EntityFormToggle
                  value={isNewBorrower ? "new" : "existing"}
                  onChange={(val) => setIsNewBorrower(val === "new")}
                  options={[
                    { value: "existing", label: "Khách cũ" },
                    { value: "new", label: "Khách mới" },
                  ]}
                />

                {!isNewBorrower ? (
                  <EntityFormField label="Tìm khách vay" required hint="Chọn khách đã có trong hệ thống">
                    <Select value={agreementForm.borrowerid} onValueChange={(value) => setAgreementForm({ ...agreementForm, borrowerid: value })}>
                      <SelectTrigger className={entityFormSelectClass}>
                        <SelectValue placeholder="Chọn khách vay" />
                      </SelectTrigger>
                      <SelectContent>
                        {borrowers.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} ({b.phone})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </EntityFormField>
                ) : (
                  <div className="space-y-3">
                    <EntityFormInfoBox>
                      ℹ️ <strong>Khách mới:</strong> Điền đầy đủ thông tin bắt buộc (*) để tạo hồ sơ khách vay
                    </EntityFormInfoBox>
                    <div className="grid grid-cols-2 gap-3">
                      <EntityFormField label="Tên khách" required hint="Họ và tên đầy đủ">
                        <Input
                          value={newBorrowerData.name}
                          onChange={(e) => setNewBorrowerData({ ...newBorrowerData, name: e.target.value })}
                          placeholder="VD: Nguyễn Văn A"
                          className={entityFormInputClass}
                          required
                        />
                      </EntityFormField>
                      <EntityFormField label="Số điện thoại" required hint="Số điện thoại liên lạc">
                        <Input
                          value={newBorrowerData.phone}
                          onChange={(e) => setNewBorrowerData({ ...newBorrowerData, phone: e.target.value })}
                          placeholder="VD: 0912345678"
                          className={entityFormInputClass}
                          required
                        />
                      </EntityFormField>
                      <EntityFormField label="Số CCCD" required hint="Số chứng minh thư hoặc CCCD">
                        <Input
                          value={newBorrowerData.idcard}
                          onChange={(e) => setNewBorrowerData({ ...newBorrowerData, idcard: e.target.value })}
                          placeholder="VD: 123456789012"
                          className={entityFormInputClass}
                          required
                        />
                      </EntityFormField>
                    </div>
                  </div>
                )}
              </EntityFormSection>

              <EntityFormSection title="💰 2. Thông tin khoản vay" description="Số tiền, lãi suất và lịch thanh toán">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Số Tiền Vay</Label>
                    <p className="text-[11px] text-slate-400 mb-1">Tổng tiền muốn cho vay (VD: 10.000.000đ)</p>
                    <Input
                      value={agreementForm.loanamount}
                      onChange={(e) => setAgreementForm({ ...agreementForm, loanamount: e.target.value })}
                      placeholder="VD: 10.000.000"
                      type="text"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Loại Lãi Suất</Label>
                    <p className="text-[11px] text-slate-400 mb-1">Chọn cách tính lãi: hàng ngày hoặc theo %</p>
                    <Select value={agreementForm.interestratetype} onValueChange={(value: any) => setAgreementForm({ ...agreementForm, interestratetype: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed_daily">
                          <span>💰 Cố định hàng ngày (VD: 50.000đ/ngày)</span>
                        </SelectItem>
                        <SelectItem value="percentage">
                          <span>📊 Phần trăm (VD: 2%/tháng)</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Lãi Suất</Label>
                    <p className="text-[11px] text-slate-400 mb-1">
                      {agreementForm.interestratetype === "fixed_daily"
                        ? "Nhập số tiền lãi mỗi ngày"
                        : "Nhập % lãi (VD: 2 = 2%)"}
                    </p>
                    <Input
                      value={agreementForm.interestrate}
                      onChange={(e) => setAgreementForm({ ...agreementForm, interestrate: e.target.value })}
                      placeholder={agreementForm.interestratetype === "fixed_daily" ? "VD: 50000" : "VD: 2"}
                      type="number"
                      step="0.01"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Kỳ Hạn</Label>
                    <p className="text-[11px] text-slate-400 mb-1">Chu kỳ cơ sở tính lãi</p>
                    <Select value={agreementForm.interestperiod} onValueChange={(value: any) => setAgreementForm({ ...agreementForm, interestperiod: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">📅 Ngày</SelectItem>
                        <SelectItem value="week">📅 Tuần (7 ngày)</SelectItem>
                        <SelectItem value="month">📅 Tháng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Chu Kỳ Thanh Toán</Label>
                    <p className="text-[11px] text-slate-400 mb-1">Bao nhiêu ngày/tuần/tháng mới thanh toán 1 lần</p>
                    <Input
                      value={agreementForm.interestpaymentcycle}
                      onChange={(e) => setAgreementForm({ ...agreementForm, interestpaymentcycle: e.target.value })}
                      placeholder="VD: 1 (hàng ngày), 7 (hàng tuần)"
                      type="number"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Ngày Ân Hạn</Label>
                    <p className="text-[11px] text-slate-400 mb-1">Số ngày chờ trước khi tính lãi (0 = không có)</p>
                    <Input
                      value={agreementForm.graceperioddays}
                      onChange={(e) => setAgreementForm({ ...agreementForm, graceperioddays: e.target.value })}
                      placeholder="VD: 0 (hoặc 3, 7 ngày...)"
                      type="number"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Ngày Bắt Đầu</Label>
                    <p className="text-[11px] text-slate-400 mb-1">Ngày phát hành khoản vay</p>
                    <Input
                      value={agreementForm.startdate}
                      onChange={(e) => setAgreementForm({ ...agreementForm, startdate: e.target.value })}
                      type="date"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Ngày Đáo Hạn</Label>
                    <p className="text-[11px] text-slate-400 mb-1">Ngày khách hàng phải hoàn trả toàn bộ vốn</p>
                    <Input
                      value={agreementForm.duedate}
                      onChange={(e) => setAgreementForm({ ...agreementForm, duedate: e.target.value })}
                      type="date"
                      className="mt-1"
                    />
                  </div>
                </div>

                <EntityFormTip
                  variant="purple"
                  title="💡 Ví dụ tính lãi"
                  items={[
                    "• Lãi cố định: Vay 5M, lãi 50k/ngày, 30 ngày = 1.5M lãi",
                    "• Lãi %: Vay 5M, lãi 2%/tháng, 30 ngày = 100k lãi",
                  ]}
                />

                {loanPreview && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs space-y-1.5">
                    <p className="font-bold text-purple-800 text-sm">📊 Dự tính khoản vay</p>
                    <div className="flex justify-between">
                      <span className="text-purple-750">Lãi mỗi kỳ ({agreementForm.interestpaymentcycle} {agreementForm.interestperiod === "day" ? "ngày" : agreementForm.interestperiod === "week" ? "tuần" : "tháng"}):</span>
                      <span className="font-bold text-purple-900">{formatPrice(loanPreview.interestPerCycle)}</span>
                    </div>
                    {loanPreview.totalCycles > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-purple-750">Số kỳ dự kiến:</span>
                          <span className="font-bold text-purple-900">{loanPreview.totalCycles} kỳ</span>
                        </div>
                        <div className="flex justify-between border-t border-purple-200 pt-1.5">
                          <span className="text-purple-750">Tổng lãi dự kiến:</span>
                          <span className="font-bold text-purple-900">{formatPrice(loanPreview.totalInterest)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-800 font-semibold">Tổng thu dự kiến:</span>
                          <span className="font-bold text-purple-900 text-sm">{formatPrice(loanPreview.amount + loanPreview.totalInterest)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </EntityFormSection>

              <EntityFormSection title="📋 3. Mục đích & ghi chú" description="Mục đích vay, tài sản thế chấp và ghi chú nội bộ">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Mục Đích Vay</Label>
                    <p className="text-[11px] text-slate-400 mb-1">Lý do khách hàng vay tiền</p>
                    <Input
                      value={agreementForm.purpose}
                      onChange={(e) => setAgreementForm({ ...agreementForm, purpose: e.target.value })}
                      placeholder="VD: Kinh doanh bán hàng, Mua nhà, Sửa xe, v.v."
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-600">Chứng Chỉ Thế Chấp</Label>
                      <p className="text-[11px] text-slate-400 mb-1">Tài sản đặt cầm cố (nếu có)</p>
                      <Input
                        value={agreementForm.collateral}
                        onChange={(e) => setAgreementForm({ ...agreementForm, collateral: e.target.value })}
                        placeholder="VD: Sổ đỏ, xe máy, điện thoại, vàng..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600">Giá Trị Thế Chấp</Label>
                      <p className="text-[11px] text-slate-400 mb-1">Giá trị ước lượng của tài sản</p>
                      <Input
                        value={agreementForm.collateralvalue}
                        onChange={(e) => setAgreementForm({ ...agreementForm, collateralvalue: e.target.value })}
                        placeholder="VD: 50.000.000"
                        type="text"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Ghi Chú Thêm</Label>
                    <p className="text-[11px] text-slate-400 mb-1">Thông tin bổ sung, điều khoản đặc biệt, v.v. (tùy chọn)</p>
                    <Textarea
                      value={agreementForm.notes}
                      onChange={(e) => setAgreementForm({ ...agreementForm, notes: e.target.value })}
                      placeholder="VD: Khách lần đầu vay, có Sổ hộ khẩu, có người bảo lãnh..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </div>

                <EntityFormTip
                  variant="amber"
                  title="📋 Những thông tin cần ghi chú"
                  items={[
                    "• Khách hàng lần đầu vay hay vay nhiều lần?",
                    "• Có tài sản thế chấp không? Giấy tờ có hợp pháp?",
                    "• Khách có người bảo lãnh hoặc thân nhân liên kết?",
                    "• Ghi chú về tín dụng, tiền sử trả nợ",
                  ]}
                />
              </EntityFormSection>
            </EntityFormBody>

            <EntityFormFooter
              accent="purple"
              onCancel={() => setShowAgreementDialog(false)}
              submitLabel={editingAgreement ? "Cập nhật hợp đồng" : "Lập hợp đồng cho vay"}
              loading={submitting}
            />
          </form>
        </EntityFormDialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <EntityFormDialogContent accent="purple" maxWidth="2xl">
          <EntityFormHeader
            title="Lịch Trả Nợ"
            description={scheduleAgreement ? `${scheduleAgreement.loancode} · ${scheduleAgreement.borrowername}` : ""}
          />
          {scheduleAgreement && (() => {
            const schedule = calculatePaymentSchedule(scheduleAgreement)
            const totalInterest = schedule.reduce((sum, s) => sum + s.interest, 0)
            return (
              <EntityFormBody>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="text-base font-bold text-slate-900 tabular-nums">{formatPrice(scheduleAgreement.loanamount)}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Vốn gốc</div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <div className="text-base font-bold text-purple-700 tabular-nums">{formatPrice(totalInterest)}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Tổng lãi dự kiến</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <div className="text-base font-bold text-blue-700 tabular-nums">{formatPrice(scheduleAgreement.loanamount + totalInterest)}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Tổng phải thu</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <div className="text-base font-bold text-amber-700">{schedule.length}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Số kỳ</div>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left py-2 px-3 text-slate-500 font-semibold">Kỳ</th>
                        <th className="text-left py-2 px-3 text-slate-500 font-semibold">Ngày đóng</th>
                        <th className="text-right py-2 px-3 text-slate-500 font-semibold">Tiền lãi</th>
                        <th className="text-center py-2 px-3 text-slate-500 font-semibold">Tình trạng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {schedule.map((row) => (
                        <tr key={row.period} className={cn(
                          "transition-colors",
                          row.isNext && "bg-amber-50/60",
                          row.isPast && "opacity-50"
                        )}>
                          <td className="py-2 px-3 font-medium text-slate-700">Kỳ {row.period}</td>
                          <td className="py-2 px-3 text-slate-600">{formatDisplayDate(row.date)}</td>
                          <td className="py-2 px-3 text-right font-semibold text-purple-700 tabular-nums">{formatPrice(row.interest)}</td>
                          <td className="py-2 px-3 text-center">
                            {row.isNext ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">Kế tiếp</span>
                            ) : row.isPast ? (
                              <span className="text-[10px] text-slate-400">Đã qua</span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Chưa tới</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </EntityFormBody>
            )
          })()}
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
            <Button type="button" variant="outline" onClick={() => setShowScheduleDialog(false)} className="h-9 rounded-xl border-slate-200 text-sm">
              Đóng
            </Button>
          </div>
        </EntityFormDialogContent>
      </Dialog>

      {/* Borrower History Dialog */}
      <Dialog open={showBorrowerHistoryDialog} onOpenChange={setShowBorrowerHistoryDialog}>
        <EntityFormDialogContent accent="purple" maxWidth="2xl">
          <EntityFormHeader
            title="Lịch Sử Vay"
            description={selectedBorrowerForHistory ? `${selectedBorrowerForHistory.name} · ${selectedBorrowerForHistory.phone}` : ""}
          />
          {selectedBorrowerForHistory && (() => {
            const borrowerAgreements = agreements.filter(a => a.borrowerid === selectedBorrowerForHistory.id)
            const totalBorrowed = borrowerAgreements.reduce((sum, a) => sum + a.loanamount, 0)
            const activeCount = borrowerAgreements.filter(a => ["active","overdue","bad_debt"].includes(a.status)).length
            const completedCount = borrowerAgreements.filter(a => a.status === "completed").length
            return (
              <EntityFormBody>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-slate-900">{borrowerAgreements.length}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Tổng đơn vay</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-blue-700">{activeCount}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Đang vay</div>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-emerald-700">{completedCount}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Hoàn thành</div>
                  </div>
                </div>
                {totalBorrowed > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3 text-xs mb-3">
                    <div className="flex justify-between">
                      <span className="text-slate-505">Tổng đã vay (lịch sử):</span>
                      <span className="font-bold text-slate-900">{formatPrice(totalBorrowed)}</span>
                    </div>
                  </div>
                )}
                {borrowerAgreements.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">Khách chưa có đơn vay nào</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {borrowerAgreements.map((a) => {
                      const isOverdue = a.duedate && new Date(a.duedate) < new Date() && a.status !== "completed"
                      return (
                        <div key={a.id} className="border border-slate-100 rounded-xl p-3 text-xs space-y-1.5 bg-white hover:border-slate-200 transition-colors">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">{a.loancode}</span>
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              a.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : isOverdue || a.status === "overdue" ? "bg-orange-50 text-orange-700 border-orange-100"
                              : "bg-blue-50 text-blue-700 border-blue-100"
                            )}>
                              {a.status === "completed" ? "Hoàn thành" : isOverdue ? "Quá hạn" : "Đang vay"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-505">Số tiền vay:</span>
                            <span className="font-semibold tabular-nums">{formatPrice(a.loanamount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-505">Lãi suất:</span>
                            <span>{formatLoanInterestRate(a)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-505">Thời hạn:</span>
                            <span>{formatDisplayDate(a.startdate)} → {formatDisplayDate(a.duedate)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </EntityFormBody>
            )
          })()}
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
            <Button type="button" variant="outline" onClick={() => setShowBorrowerHistoryDialog(false)} className="h-9 rounded-xl border-slate-200 text-sm">
              Đóng
            </Button>
          </div>
        </EntityFormDialogContent>
      </Dialog>
    </ModulePageShell>
  )
}

export default function LoanManagementDashboard() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin text-purple-950">
          <Database className="w-8 h-8" />
        </div>
      </div>
    }>
      <LoanManagementContent />
    </Suspense>
  )
}
