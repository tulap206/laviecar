"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  fetchPawnContracts, fetchPawnAssets, fetchPawnLedger, 
  insertPawnContract, insertPawnAsset, insertPawnLedger, 
  updatePawnContract, updatePawnAsset, deletePawnContract, deletePawnAsset,
  PawnContract, PawnAsset, PawnLedger, fetchCustomers, Customer, supabase,
  updateCustomer, deleteCustomer, insertCustomer
} from "@/lib/supabase"
import { uploadImage } from "@/lib/storage"
import { logger } from "@/lib/logger"
import { 
  Shield, Wallet, TrendingUp, AlertTriangle, Clock, 
  Plus, Search, ArrowRight, CheckCircle2, ChevronRight,
  Database, User, ShieldAlert, Sparkles, Receipt, Camera, Check, RefreshCw,
  Trash2, History, Settings, Filter, Download, Upload, Eye, ListFilter
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

interface PawnBackupData {
  timestamp: string
  pawn_assets: PawnAsset[]
  pawn_contracts: PawnContract[]
  pawn_ledger: PawnLedger[]
}

interface BackupFile {
  name: string
  created_at: string
  size: number
  url: string
}

export default function PawnshopDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  
  const categoryLabels: Record<string, string> = {
    phone: "Điện thoại",
    bike: "Xe máy",
    car: "Ô tô",
    laptop: "Laptop/PC",
    gold: "Vàng/Trang sức",
    other: "Khác"
  }
  
  // Data State
  const [contracts, setContracts] = useState<PawnContract[]>([])
  const [assets, setAssets] = useState<PawnAsset[]>([])
  const [ledger, setLedger] = useState<PawnLedger[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTab, setCurrentTab] = useState<"dashboard" | "assets" | "customers" | "contracts" | "reports" | "history" | "backup">("dashboard")

  // Category & Status Filters for directories
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>("all")
  const [assetStatusFilter, setAssetStatusFilter] = useState<string>("all")
  const [assetLocationFilter, setAssetLocationFilter] = useState<string>("all")
  
  const [customerStatusFilter, setCustomerStatusFilter] = useState<string>("all")
  
  const [contractStatusFilter, setContractStatusFilter] = useState<string>("all")

  // Log filter options
  const [logSearchQuery, setLogSearchQuery] = useState("")
  const [logFilterAction, setLogFilterAction] = useState("all")
  const [accessLogs, setAccessLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  // Backup files state
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([])
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupFilesLoading, setBackupFilesLoading] = useState(true)
  const [backupMessage, setBackupMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Capital adjustment modal
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false)
  const [capitalForm, setCapitalForm] = useState({ amount: "", note: "" })

  // Extra ledger entry modal
  const [isExtraLedgerOpen, setIsExtraLedgerOpen] = useState(false)
  const [extraLedgerForm, setExtraLedgerForm] = useState({
    type: "CASH_IN_INTEREST" as PawnLedger["type"],
    amount: "",
    description: "",
    paymentMethod: "cash" as "cash" | "bank_transfer"
  })

  const searchParams = useSearchParams()

  // Sync tab with URL search parameter
  useEffect(() => {
    const tab = searchParams.get("tab")
    const validTabs = ["dashboard", "assets", "customers", "contracts", "reports", "history", "backup"]
    if (tab && validTabs.includes(tab)) {
      if ((tab === "history" || tab === "backup") && user?.role !== "admin") {
        setCurrentTab("dashboard")
      } else {
        setCurrentTab(tab as any)
      }
    } else {
      setCurrentTab("dashboard")
    }
  }, [searchParams, user])

  // Form Modals
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<PawnContract | null>(null)
  
  // Customer Modals & Actions
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false)
  const [isCustomerEditOpen, setIsCustomerEditOpen] = useState(false)
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    address: "",
    idcard: "",
    status: "active" as "active" | "inactive"
  })

  // Contract Detail, Edit & Asset View states
  const [selectedAsset, setSelectedAsset] = useState<PawnAsset | null>(null)
  const [isAssetDetailOpen, setIsAssetDetailOpen] = useState(false)
  const [isContractDetailOpen, setIsContractDetailOpen] = useState(false)
  const [isContractEditOpen, setIsContractEditOpen] = useState(false)
  const [contractEditForm, setContractEditForm] = useState({
    loanAmount: 0,
    interestRate: 0,
    interestRateType: "fixed_daily" as "fixed_daily" | "percentage",
    interestPeriod: "day" as "day" | "week" | "month",
    nextPaymentDate: "",
    endDate: "",
    status: "active" as PawnContract["status"],
    notes: ""
  })

  const handleViewAssetClick = (c: PawnContract) => {
    const asset = assets.find(a => a.id === c.assetId)
    if (asset) {
      setSelectedAsset(asset)
      setIsAssetDetailOpen(true)
    } else {
      const fallbackAsset: PawnAsset = {
        id: c.assetId,
        name: c.assetName,
        category: "other",
        brand: "",
        model: "",
        serialNumber: "",
        condition: "Đang lưu kho",
        sealCode: "",
        warehouseName: "Kho chính",
        warehouseLocation: "",
        images: [],
        status: "sealed"
      }
      setSelectedAsset(fallbackAsset)
      setIsAssetDetailOpen(true)
    }
  }

  const handleViewContract = (contract: PawnContract) => {
    setSelectedContract(contract)
    setIsContractDetailOpen(true)
  }

  const handleEditContractClick = (contract: PawnContract) => {
    setSelectedContract(contract)
    setContractEditForm({
      loanAmount: contract.loanAmount,
      interestRate: contract.interestRate,
      interestRateType: contract.interestRateType,
      interestPeriod: contract.interestPeriod,
      nextPaymentDate: contract.nextPaymentDate.split("T")[0],
      endDate: contract.endDate.split("T")[0],
      status: contract.status,
      notes: contract.notes || ""
    })
    setIsContractEditOpen(true)
  }

  const handleSaveContractEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContract) return
    setSubmitting(true)
    try {
      await updatePawnContract(selectedContract.id, contractEditForm)
      showToast("Cập nhật hợp đồng thành công")
      if (user) {
        await logger.log(
          user.username,
          user.displayName,
          "Cập nhật hợp đồng",
          "Cầm đồ",
          `Chỉnh sửa thông tin hợp đồng ${selectedContract.contractCode}`
        )
      }
      setIsContractEditOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      showToast("Lỗi khi cập nhật hợp đồng", "warning")
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsCustomerDetailOpen(true)
  }

  const handleEditCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer)
    setCustomerForm({
      name: customer.name || "",
      phone: customer.phone || "",
      address: customer.address || "",
      idcard: customer.idcard || "",
      status: customer.status || "active"
    })
    setIsCustomerEditOpen(true)
  }

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) return
    setSubmitting(true)
    try {
      await updateCustomer(selectedCustomer.id, customerForm)
      showToast("Cập nhật thông tin khách hàng thành công")
      if (user) {
        await logger.log(
          user.username,
          user.displayName,
          "Chỉnh sửa",
          "Cầm đồ",
          `Chỉnh sửa thông tin khách hàng ${selectedCustomer.name} (SĐT: ${selectedCustomer.phone})`
        )
      }
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, ...customerForm } : c))
      setIsCustomerEditOpen(false)
    } catch (err) {
      console.error(err)
      showToast("Lỗi khi cập nhật khách hàng", "warning")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCustomerClick = async (customer: Customer) => {
    if (user?.role !== "admin") {
      showToast("Chỉ Admin mới có quyền xoá khách hàng", "warning")
      return
    }
    if (window.confirm(`Bạn có chắc chắn muốn xoá khách hàng "${customer.name}"?`)) {
      try {
        await deleteCustomer(customer.id)
        showToast("Xoá khách hàng thành công")
        if (user) {
          await logger.log(
            user.username,
            user.displayName,
            "Xóa",
            "Cầm đồ",
            `Xóa khách hàng ${customer.name} (SĐT: ${customer.phone})`
          )
        }
        setCustomers(prev => prev.filter(c => c.id !== customer.id))
      } catch (err) {
        console.error(err)
        showToast("Lỗi khi xoá khách hàng", "warning")
      }
    }
  }
  
  // Custom alerts
  const [notification, setNotification] = useState<{ message: string; type: "success" | "warning" } | null>(null)

  // QR Payment Code simulation state
  const [qrString, setQrString] = useState("")

  // Contract Form State
  const [contractForm, setContractForm] = useState({
    customerId: "",
    customerName: "",
    customerPhone: "",
    customerCCCD: "",
    assetName: "",
    assetCategory: "bike" as PawnAsset["category"],
    assetBrand: "",
    assetModel: "",
    serialNumber: "",
    condition: "",
    sealCode: "",
    warehouseLocation: "",
    loanAmount: "",
    interestRateType: "fixed_daily" as "fixed_daily" | "percentage",
    interestRate: "3",
    interestPeriod: "day" as "day" | "week" | "month",
    durationDays: "30",
    notes: "",
    isPrepaidInterest: false,
    prepaidInterestAmount: "",
    startDate: new Date().toISOString().slice(0, 10)
  })


  // New Customer states
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState("")
  const [newCustomerPhone, setNewCustomerPhone] = useState("")
  const [newCustomerBirthday, setNewCustomerBirthday] = useState("")
  const [newCustomerCCCD, setNewCustomerCCCD] = useState("")
  const [newCustomerAddress, setNewCustomerAddress] = useState("")

  // Files upload states
  const [customerPhotoFile, setCustomerPhotoFile] = useState<File | null>(null)
  const [cccdFrontFile, setCccdFrontFile] = useState<File | null>(null)
  const [cccdBackFile, setCccdBackFile] = useState<File | null>(null)
  const [assetImageFile, setAssetImageFile] = useState<File | null>(null)

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "bank_transfer" as "cash" | "bank_transfer",
    type: "CASH_IN_INTEREST" as PawnLedger["type"],
    description: "",
    interestAdjustment: ""
  })
  // Toast helper
  const showToast = (message: string, type: "success" | "warning" = "success") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [cData, aData, lData, custData] = await Promise.all([
        fetchPawnContracts(),
        fetchPawnAssets(),
        fetchPawnLedger(),
        fetchCustomers()
      ])
      setContracts(cData)
      setAssets(aData)
      setLedger(lData)
      setCustomers(custData)
    } catch (err) {
      console.error("Error loading pawnshop data:", err)
      showToast("Lỗi tải dữ liệu hệ thống", "warning")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Load access history if history tab selected
  const loadAccessLogs = useCallback(async () => {
    try {
      setLogsLoading(true)
      const { data, error } = await supabase
        .from("access_logs")
        .select("*")
        .eq("module", "Cầm đồ")
        .order("timestamp", { ascending: false })

      if (error) throw error
      setAccessLogs(data || [])
    } catch (err) {
      console.error("Error loading pawnshop logs:", err)
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentTab === "history" && user?.role === "admin") {
      loadAccessLogs()
    }
  }, [currentTab, user, loadAccessLogs])

  // Load backup files if backup tab selected
  const loadBackupFiles = useCallback(async () => {
    try {
      setBackupFilesLoading(true)
      const { data, error } = await supabase.storage
        .from("backups")
        .list("", {
          limit: 100,
          offset: 0,
          sortBy: { column: "created_at", order: "desc" },
        })

      if (error) throw error

      const files: BackupFile[] = (data || [])
        .filter((f: any) => f.name.startsWith("pawn-backup-") && f.name.endsWith(".json"))
        .map((f: any) => ({
          name: f.name,
          created_at: f.created_at,
          size: f.metadata?.size || 0,
          url: supabase.storage.from("backups").getPublicUrl(f.name).data.publicUrl,
        }))

      setBackupFiles(files)
    } catch (err) {
      console.error("Error loading backup files:", err)
    } finally {
      setBackupFilesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentTab === "backup" && user?.role === "admin") {
      loadBackupFiles()
    }
  }, [currentTab, user, loadBackupFiles])

  // Pawnshop Backup handler
  const handlePawnBackup = async () => {
    try {
      setBackupLoading(true)
      setBackupMessage(null)

      const [cData, aData, lData] = await Promise.all([
        fetchPawnContracts(),
        fetchPawnAssets(),
        fetchPawnLedger()
      ])

      const backupObj: PawnBackupData = {
        timestamp: new Date().toISOString(),
        pawn_assets: aData,
        pawn_contracts: cData,
        pawn_ledger: lData
      }

      const fileName = `pawn-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
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
          "Cầm đồ",
          `Sao lưu phân hệ cầm đồ: ${aData.length} tài sản, ${cData.length} hợp đồng, ${lData.length} giao dịch`
        )
      }

      setBackupMessage({
        type: "success",
        text: `✅ Sao lưu phân hệ cầm đồ thành công!\n- ${aData.length} tài sản\n- ${cData.length} hợp đồng\n- ${lData.length} giao dịch\n\nFile: ${fileName}`
      })

      loadBackupFiles()
    } catch (error) {
      console.error("Pawn backup error:", error)
      setBackupMessage({ type: "error", text: `❌ Lỗi sao lưu: ${(error as any).message}` })
    } finally {
      setBackupLoading(false)
    }
  }

  // Pawnshop Restore handler
  const handlePawnRestore = async (fileUrl: string, fileName: string) => {
    if (user?.role !== "admin") {
      showToast("Bạn không có quyền khôi phục dữ liệu", "warning")
      return
    }

    try {
      setBackupLoading(true)
      setBackupMessage(null)

      const response = await fetch(fileUrl)
      if (!response.ok) throw new Error("Lỗi tải file khôi phục")

      const backupData: PawnBackupData = await response.json()

      if (!backupData.pawn_assets || !backupData.pawn_contracts || !backupData.pawn_ledger) {
        throw new Error("File backup phân hệ cầm đồ không hợp lệ")
      }

      const confirmed = window.confirm(
        `⚠️ XÁC NHẬN KHÔI PHỤC PHÂN HỆ CẦM ĐỒ:\n${fileName}\n\n` +
        `Thời gian sao lưu: ${new Date(backupData.timestamp).toLocaleString("vi-VN")}\n\n` +
        `📊 Dữ liệu nhập vào:\n` +
        `- ${backupData.pawn_assets.length} tài sản cầm cố\n` +
        `- ${backupData.pawn_contracts.length} hợp đồng cầm cố\n` +
        `- ${backupData.pawn_ledger.length} giao dịch thu chi\n\n` +
        `⚠️ TOÀN BỘ DỮ LIỆU CẦM ĐỒ HIỆN TẠI SẼ BỊ XOÁ SẠCH!\n\nBạn có chắc chắn muốn thực hiện?`
      )

      if (!confirmed) {
        setBackupMessage({ type: "error", text: "❌ Khôi phục bị huỷ bởi người dùng" })
        return
      }

      // Clear existing data (Ledger -> Contract -> Assets due to FK constraints)
      const existingContracts = await fetchPawnContracts()
      const existingLedger = await fetchPawnLedger()
      const existingAssets = await fetchPawnAssets()

      if (existingLedger.length > 0) {
        await supabase.from("pawn_ledger").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      }
      if (existingContracts.length > 0) {
        await supabase.from("pawn_contracts").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      }
      if (existingAssets.length > 0) {
        await supabase.from("pawn_assets").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      }

      // Restoring Assets
      if (backupData.pawn_assets.length > 0) {
        const { error: assetErr } = await supabase
          .from("pawn_assets")
          .insert(backupData.pawn_assets.map(({ created_at, updated_at, ...rest }) => rest))
        if (assetErr) throw assetErr
      }

      // Restoring Contracts
      if (backupData.pawn_contracts.length > 0) {
        const { error: contractErr } = await supabase
          .from("pawn_contracts")
          .insert(backupData.pawn_contracts.map(({ created_at, updated_at, ...rest }) => rest))
        if (contractErr) throw contractErr
      }

      // Restoring Ledger
      if (backupData.pawn_ledger.length > 0) {
        const { error: ledgerErr } = await supabase
          .from("pawn_ledger")
          .insert(backupData.pawn_ledger.map(({ created_at, ...rest }) => rest))
        if (ledgerErr) throw ledgerErr
      }

      if (user) {
        await logger.log(
          user.username,
          user.displayName,
          "Khôi phục dữ liệu",
          "Cầm đồ",
          `Khôi phục phân hệ cầm đồ từ file: ${fileName}`
        )
      }

      setBackupMessage({
        type: "success",
        text: "✅ Khôi phục dữ liệu phân hệ cầm đồ thành công! Hệ thống đang tự động tải lại..."
      })

      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      console.error("Restore error:", error)
      setBackupMessage({ type: "error", text: `❌ Lỗi khôi phục: ${(error as any).message}` })
    } finally {
      setBackupLoading(false)
    }
  }

  // File Upload Restore
  const handlePawnRestoreFromUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (user?.role !== "admin") {
      showToast("Bạn không có quyền khôi phục dữ liệu", "warning")
      event.target.value = ""
      return
    }

    try {
      setBackupLoading(true)
      setBackupMessage(null)

      const file = event.target.files?.[0]
      if (!file) return

      const text = await file.text()
      const backupData: PawnBackupData = JSON.parse(text)

      if (!backupData.pawn_assets || !backupData.pawn_contracts || !backupData.pawn_ledger) {
        throw new Error("File backup phân hệ cầm đồ không hợp lệ")
      }

      const confirmed = window.confirm(
        `⚠️ XÁC NHẬN KHÔI PHỤC PHÂN HỆ CẦM ĐỒ TỪ FILE TẢI LÊN:\n${file.name}\n\n` +
        `📊 Dữ liệu nhập vào:\n` +
        `- ${backupData.pawn_assets.length} tài sản cầm cố\n` +
        `- ${backupData.pawn_contracts.length} hợp đồng cầm cố\n` +
        `- ${backupData.pawn_ledger.length} giao dịch thu chi\n\n` +
        `⚠️ TOÀN BỘ DỮ LIỆU CẦM ĐỒ HIỆN TẠI SẼ BỊ XOÁ SẠCH!\n\nBạn có chắc chắn muốn thực hiện?`
      )

      if (!confirmed) {
        setBackupMessage({ type: "error", text: "❌ Khôi phục bị huỷ bởi người dùng" })
        return
      }

      const existingContracts = await fetchPawnContracts()
      const existingLedger = await fetchPawnLedger()
      const existingAssets = await fetchPawnAssets()

      if (existingLedger.length > 0) {
        await supabase.from("pawn_ledger").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      }
      if (existingContracts.length > 0) {
        await supabase.from("pawn_contracts").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      }
      if (existingAssets.length > 0) {
        await supabase.from("pawn_assets").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      }

      if (backupData.pawn_assets.length > 0) {
        const { error: assetErr } = await supabase
          .from("pawn_assets")
          .insert(backupData.pawn_assets.map(({ created_at, updated_at, ...rest }) => rest))
        if (assetErr) throw assetErr
      }

      if (backupData.pawn_contracts.length > 0) {
        const { error: contractErr } = await supabase
          .from("pawn_contracts")
          .insert(backupData.pawn_contracts.map(({ created_at, updated_at, ...rest }) => rest))
        if (contractErr) throw contractErr
      }

      if (backupData.pawn_ledger.length > 0) {
        const { error: ledgerErr } = await supabase
          .from("pawn_ledger")
          .insert(backupData.pawn_ledger.map(({ created_at, ...rest }) => rest))
        if (ledgerErr) throw ledgerErr
      }

      if (user) {
        await logger.log(
          user.username,
          user.displayName,
          "Khôi phục dữ liệu",
          "Cầm đồ",
          `Khôi phục phân hệ cầm đồ từ file tải lên: ${file.name}`
        )
      }

      setBackupMessage({
        type: "success",
        text: "✅ Khôi phục dữ liệu phân hệ cầm đồ thành công! Hệ thống đang tự động tải lại..."
      })

      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      console.error("Restore error:", error)
      setBackupMessage({ type: "error", text: `❌ Lỗi khôi phục: ${(error as any).message}` })
    } finally {
      setBackupLoading(false)
      event.target.value = ""
    }
  }

  // Delete Backup File
  const handleDeleteBackup = async (fileName: string) => {
    try {
      if (!window.confirm(`Bạn có chắc chắn muốn xoá file sao lưu "${fileName}"?`)) return

      const { error } = await supabase.storage
        .from("backups")
        .remove([fileName])

      if (error) throw error

      setBackupMessage({ type: "success", text: `✅ Xoá file sao lưu thành công` })
      loadBackupFiles()
    } catch (error) {
      console.error("Delete backup error:", error)
      setBackupMessage({ type: "error", text: `❌ Lỗi xoá: ${(error as any).message}` })
    }
  }

  // Select Customer helper
  const handleCustomerSelect = (custId: string) => {
    const cust = customers.find(c => c.id === custId)
    if (cust) {
      setContractForm(prev => ({
        ...prev,
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        customerCCCD: cust.idcard || ""
      }))
    }
  }

  // Financial Metrics Calculation
  const getMetrics = () => {
    const activeAndOverdue = contracts.filter(c => c.status === "active" || c.status === "overdue" || c.status === "bad_debt")
    const currentOutstanding = activeAndOverdue.reduce((sum, c) => sum + c.loanAmount, 0)
    
    // Revenue Ledger (income total - loan out total)
    const incomeLedger = ledger.filter(l => l.type.startsWith("CASH_IN_")).reduce((sum, l) => sum + l.amount, 0)
    const outcomeLedger = ledger.filter(l => l.type === "CASH_OUT_LOAN" || l.type === "OPERATIONAL_EXPENSE").reduce((sum, l) => sum + l.amount, 0)
    const totalCapital = 500000000 + incomeLedger - outcomeLedger // Start pool: 500M

    // Expected monthly interest
    const monthlyExpectedInterest = activeAndOverdue.reduce((sum, c) => {
      if (c.interestRateType === "percentage") {
        return sum + (c.loanAmount * (c.interestRate / 100))
      } else {
        // Fixed rate: X d/million/day -> default 30 days
        return sum + ((c.loanAmount / 1000000) * c.interestRate * 30)
      }
    }, 0)

    const dueTodayCount = contracts.filter(c => {
      if (c.status !== "active" && c.status !== "overdue") return false
      const nextPay = new Date(c.nextPaymentDate).toDateString()
      const today = new Date().toDateString()
      return nextPay === today
    }).length

    const overdueCount = contracts.filter(c => c.status === "overdue" || c.status === "bad_debt").length

    return {
      currentOutstanding,
      totalCapital,
      monthlyExpectedInterest,
      dueTodayCount,
      overdueCount
    }
  }

  const metrics = getMetrics()

  // Submit extra ledger entry (income/expense outside contract)
  const handleExtraLedger = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!extraLedgerForm.amount || !extraLedgerForm.description) {
      showToast("Vui lòng nhập đầy đủ thông tin thu chi", "warning")
      return
    }
    setSubmitting(true)
    try {
      await insertPawnLedger({
        contractId: undefined,
        contractCode: undefined,
        type: extraLedgerForm.type,
        amount: parseInt(extraLedgerForm.amount),
        description: extraLedgerForm.description,
        paymentMethod: extraLedgerForm.paymentMethod,
        user: user?.username || "staff",
        timestamp: new Date().toISOString()
      })
      if (user) {
        await logger.log(user.username, user.displayName, "Thêm mới", "Cầm đồ",
          `Ghi thu chi ngoài hợp đồng: ${extraLedgerForm.description} (${parseInt(extraLedgerForm.amount).toLocaleString()}đ)`)
      }
      showToast("Ghi sổ thu chi thành công")
      setIsExtraLedgerOpen(false)
      setExtraLedgerForm({ type: "CASH_IN_INTEREST", amount: "", description: "", paymentMethod: "cash" })
      loadData()
    } catch (err) {
      console.error(err)
      showToast("Lỗi khi ghi sổ thu chi", "warning")
    } finally {
      setSubmitting(false)
    }
  }

  // Capital pool adjustment
  const handleCapitalAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!capitalForm.amount) {
      showToast("Vui lòng nhập số tiền vốn", "warning")
      return
    }
    setSubmitting(true)
    try {
      await insertPawnLedger({
        contractId: undefined,
        contractCode: undefined,
        type: "CASH_IN_INTEREST",
        amount: Math.abs(parseInt(capitalForm.amount)),
        description: capitalForm.note || "Điều chỉnh vốn quỹ cầm đồ",
        paymentMethod: "cash",
        user: user?.username || "admin",
        timestamp: new Date().toISOString()
      })
      if (user) {
        await logger.log(user.username, user.displayName, "Chỉnh sửa", "Cầm đồ",
          `Tinh chỉnh vốn quỹ: ${capitalForm.note || "Điều chỉnh vốn"} (${parseInt(capitalForm.amount).toLocaleString()}đ)`)
      }
      showToast("Cập nhật vốn quỹ thành công")
      setIsCapitalModalOpen(false)
      setCapitalForm({ amount: "", note: "" })
      loadData()
    } catch (err) {
      console.error(err)
      showToast("Lỗi khi cập nhật vốn quỹ", "warning")
    } finally {
      setSubmitting(false)
    }
  }

  // New Pawn Contract Submission
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractForm.assetName || !contractForm.loanAmount) {
      showToast("Vui lòng điền các thông tin bắt buộc", "warning")
      return
    }

    setSubmitting(true)
    try {
      let activeCustomerId = contractForm.customerId
      let activeCustomerName = contractForm.customerName
      let activeCustomerPhone = contractForm.customerPhone
      let activeCustomerCCCD = contractForm.customerCCCD

      // Create new customer if option is active
      if (isNewCustomer) {
        if (!newCustomerName || !newCustomerPhone) {
          showToast("Vui lòng điền Họ tên và Số điện thoại khách hàng mới", "warning")
          setSubmitting(false)
          return
        }

        let customerPhotoUrl = ""
        let cccdFrontUrl = ""
        let cccdBackUrl = ""

        if (customerPhotoFile) {
          const res = await uploadImage(customerPhotoFile, "customer-documents", "customer-photos")
          if (res) customerPhotoUrl = res
        }
        if (cccdFrontFile) {
          const res = await uploadImage(cccdFrontFile, "customer-documents", "cccd-front")
          if (res) cccdFrontUrl = res
        }
        if (cccdBackFile) {
          const res = await uploadImage(cccdBackFile, "customer-documents", "cccd-back")
          if (res) cccdBackUrl = res
        }

        const newCust = await insertCustomer({
          name: newCustomerName,
          phone: newCustomerPhone,
          facebook: "",
          address: newCustomerAddress || "",
          idcard: newCustomerCCCD,
          totalrentals: 0,
          status: "active",
          customerphoto: customerPhotoUrl ? [customerPhotoUrl] : [],
          cccdfront: cccdFrontUrl ? [cccdFrontUrl] : [],
          cccdback: cccdBackUrl ? [cccdBackUrl] : [],
          licensefront: [],
          licenseback: [],
          birthday: newCustomerBirthday || undefined
        })

        activeCustomerId = newCust.id
        activeCustomerName = newCust.name
        activeCustomerPhone = newCust.phone
        activeCustomerCCCD = newCust.idcard || ""
      } else {
        if (!contractForm.customerId) {
          showToast("Vui lòng chọn khách hàng", "warning")
          setSubmitting(false)
          return
        }
      }

      // Upload Pawn Asset Image if provided
      let assetImageUrl = ""
      if (assetImageFile) {
        const res = await uploadImage(assetImageFile, "customer-documents", "pawn-assets")
        if (res) assetImageUrl = res
      }

      // 1. Create Pawn Asset
      const newAsset = await insertPawnAsset({
        name: `${contractForm.assetBrand} ${contractForm.assetModel}`.trim() || contractForm.assetName,
        category: contractForm.assetCategory,
        brand: contractForm.assetBrand,
        model: contractForm.assetModel,
        serialNumber: contractForm.serialNumber,
        condition: contractForm.condition,
        sealCode: contractForm.sealCode,
        warehouseName: "Kho A",
        warehouseLocation: contractForm.warehouseLocation,
        images: assetImageUrl ? [assetImageUrl] : [],
        status: "sealed"
      })

      // Calculate Dates
      const startDate = contractForm.startDate ? new Date(contractForm.startDate) : new Date()
      const days = parseInt(contractForm.durationDays) || 30
      const endDate = new Date(startDate.getTime())
      endDate.setDate(endDate.getDate() + days)

      const nextPayDate = new Date(startDate.getTime())
      if (contractForm.isPrepaidInterest) {
        nextPayDate.setTime(endDate.getTime())
      } else if (contractForm.interestPeriod === "day") {
        nextPayDate.setDate(nextPayDate.getDate() + 1)
      } else if (contractForm.interestPeriod === "week") {
        nextPayDate.setDate(nextPayDate.getDate() + 7)
      } else {
        nextPayDate.setMonth(nextPayDate.getMonth() + 1)
      }

      // Prepaid interest amount calculation
      const prepAmt = contractForm.isPrepaidInterest && contractForm.prepaidInterestAmount 
        ? parseInt(contractForm.prepaidInterestAmount) 
        : 0
      
      let finalNotes = contractForm.notes
      if (contractForm.isPrepaidInterest && prepAmt > 0) {
        finalNotes = `[Cắt lãi trước: ${prepAmt.toLocaleString()}đ] ${finalNotes}`.trim()
      }

      // 2. Create Pawn Contract
      const loan = parseInt(contractForm.loanAmount)
      const code = `HDCD-${Date.now().toString().slice(-6)}`
      const newContract = await insertPawnContract({
        contractCode: code,
        customerId: activeCustomerId,
        customerName: activeCustomerName,
        customerPhone: activeCustomerPhone,
        customerCCCD: activeCustomerCCCD,
        assetId: newAsset.id,
        assetName: newAsset.name,
        loanAmount: loan,
        interestRateType: contractForm.interestRateType,
        interestRate: parseFloat(contractForm.interestRate),
        interestPeriod: contractForm.interestPeriod,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        nextPaymentDate: nextPayDate.toISOString(),
        gracePeriodDays: 7,
        status: "active",
        notes: finalNotes
      })

      // 3. Create Loan Disbursement Ledger Record
      await insertPawnLedger({
        contractId: newContract.id,
        contractCode: code,
        type: "CASH_OUT_LOAN",
        amount: loan,
        description: `Giải ngân HĐ ${code} - Cầm cố ${newAsset.name}`,
        paymentMethod: "cash",
        user: user?.username || "staff",
        timestamp: new Date().toISOString()
      })

      // 3b. Create Prepaid Interest Receipt Ledger Record if any
      if (prepAmt > 0) {
        await insertPawnLedger({
          contractId: newContract.id,
          contractCode: code,
          type: "CASH_IN_INTEREST",
          amount: prepAmt,
          description: `Thu tiền lãi cắt trước khi giải ngân HĐ ${code}`,
          paymentMethod: "cash",
          user: user?.username || "staff",
          timestamp: new Date().toISOString()
        })
      }

      if (user) {
        await logger.log(
          user.username,
          user.displayName,
          "Thêm mới",
          "Cầm đồ",
          `Lập hợp đồng cầm đồ mới: ${code} (${activeCustomerName} - ${newAsset.name})`
        )
      }

      showToast(`Tạo thành công hợp đồng ${code}`)
      setIsContractModalOpen(false)
      loadData()
      
      // Reset Form
      setContractForm({
        customerId: "",
        customerName: "",
        customerPhone: "",
        customerCCCD: "",
        assetName: "",
        assetCategory: "bike",
        assetBrand: "",
        assetModel: "",
        serialNumber: "",
        condition: "",
        sealCode: "",
        warehouseLocation: "",
        loanAmount: "",
        interestRateType: "fixed_daily",
        interestRate: "3",
        interestPeriod: "day",
        durationDays: "30",
        notes: "",
        isPrepaidInterest: false,
        prepaidInterestAmount: "",
        startDate: new Date().toISOString().slice(0, 10)
      })
      setIsNewCustomer(false)
      setNewCustomerName("")
      setNewCustomerPhone("")
      setNewCustomerBirthday("")
      setNewCustomerCCCD("")
      setNewCustomerAddress("")
      setCustomerPhotoFile(null)
      setCccdFrontFile(null)
      setCccdBackFile(null)
      setAssetImageFile(null)
    } catch (err) {
      console.error(err)
      showToast("Lỗi trong quá trình tạo hợp đồng", "warning")
    } finally {
      setSubmitting(false)
    }
  }

  // Open Payment Dialog & generate simulated QR
  const openPayment = (contract: PawnContract) => {
    setSelectedContract(contract)
    const interestDue = contract.interestRateType === "percentage"
      ? (contract.loanAmount * (contract.interestRate / 100))
      : ((contract.loanAmount / 1000000) * contract.interestRate * 30)
    
    setPaymentForm({
      amount: interestDue.toFixed(0),
      paymentMethod: "bank_transfer",
      type: "CASH_IN_INTEREST",
      description: `CAMDO ${contract.contractCode} KI 1`,
      interestAdjustment: ""
    })

    setIsPaymentModalOpen(true)
  }

  // Generate QR code dynamically when form values change
  useEffect(() => {
    if (selectedContract && isPaymentModalOpen) {
      const bankBin = "970415"
      const bankAccount = "109876543210"
      const amt = parseInt(paymentForm.amount) || 0
      const adj = parseInt(paymentForm.interestAdjustment) || 0
      const actualAmount = Math.max(0, amt - adj)
      const syntax = paymentForm.description || `CAMDO ${selectedContract.contractCode}`
      setQrString(`https://api.vietqr.io/image/${bankBin}-${bankAccount}-compact2.jpg?amount=${actualAmount}&addInfo=${encodeURIComponent(syntax)}&accountName=LAVIE%20CAR`)
    }
  }, [paymentForm.amount, paymentForm.interestAdjustment, paymentForm.description, selectedContract, isPaymentModalOpen])

  // Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContract || !paymentForm.amount) return

    setSubmitting(true)
    try {
      const amt = parseInt(paymentForm.amount)
      const adj = paymentForm.interestAdjustment ? parseInt(paymentForm.interestAdjustment) : 0
      
      // 1. Add ledger record
      await insertPawnLedger({
        contractId: selectedContract.id,
        contractCode: selectedContract.contractCode,
        type: paymentForm.type,
        amount: amt,
        description: paymentForm.description,
        paymentMethod: paymentForm.paymentMethod,
        user: user?.username || "staff",
        timestamp: new Date().toISOString()
      })

      // 1b. Add interest adjustment ledger record if any
      if (adj !== 0) {
        await insertPawnLedger({
          contractId: selectedContract.id,
          contractCode: selectedContract.contractCode,
          type: "CASH_IN_INTEREST",
          amount: -adj, // store as negative value
          description: `Điều chỉnh giảm lãi HĐ ${selectedContract.contractCode}`,
          paymentMethod: paymentForm.paymentMethod,
          user: user?.username || "staff",
          timestamp: new Date().toISOString()
        })
      }

      // 2. If principal payout, update contract and asset status
      if (paymentForm.type === "CASH_IN_PRINCIPAL") {
        await updatePawnContract(selectedContract.id, { status: "completed" })
        await updatePawnAsset(selectedContract.assetId, { status: "returned" })
        
        if (user) {
          await logger.log(
            user.username,
            user.displayName,
            "Tất toán",
            "Cầm đồ",
            `Tất toán hợp đồng cầm đồ & hoàn trả tài sản: ${selectedContract.contractCode}`
          )
        }
        
        showToast(`Tất toán & trả tài sản hợp đồng ${selectedContract.contractCode}`)
      } else {
        // Paid interest: Extend next payment date by 1 month
        const currentNextPay = new Date(selectedContract.nextPaymentDate)
        currentNextPay.setMonth(currentNextPay.getMonth() + 1)
        await updatePawnContract(selectedContract.id, { 
          nextPaymentDate: currentNextPay.toISOString(),
          status: "active" 
        })

        if (user) {
          await logger.log(
            user.username,
            user.displayName,
            "Đóng lãi",
            "Cầm đồ",
            `Ghi nhận đóng tiền lãi kỳ mới cho hợp đồng: ${selectedContract.contractCode} số tiền ${amt.toLocaleString()}đ`
          )
        }

        showToast(`Đã ghi nhận đóng lãi HĐ ${selectedContract.contractCode}`)
      }

      setIsPaymentModalOpen(false)
      setSelectedContract(null)
      loadData()
    } catch (err) {
      console.error(err)
      showToast("Lỗi ghi nhận giao dịch", "warning")
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Pawn Contract (Admin Only)
  const handleDeleteContract = async (contract: PawnContract) => {
    if (user?.role !== "admin") {
      showToast("Chỉ Admin có quyền xoá hợp đồng", "warning")
      return
    }

    if (!window.confirm(`Xác nhận xoá hợp đồng ${contract.contractCode} và tài sản kèm theo?`)) return

    try {
      await deletePawnContract(contract.id)
      await deletePawnAsset(contract.assetId)
      
      if (user) {
        await logger.log(
          user.username,
          user.displayName,
          "Xoá hợp đồng",
          "Cầm đồ",
          `Xoá hợp đồng cầm đồ ${contract.contractCode} cùng tài sản cầm cố`
        )
      }

      showToast(`Đã xoá hợp đồng ${contract.contractCode}`)
      loadData()
    } catch (err) {
      console.error("Error deleting contract:", err)
      showToast("Lỗi khi xoá hợp đồng", "warning")
    }
  }

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value)
  }

  // Filter lists based on search & options
  const filteredContracts = contracts.filter(c => {
    const matchesSearch = 
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contractCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerPhone.includes(searchTerm)

    const matchesStatus = contractStatusFilter === "all" || c.status === contractStatusFilter

    return matchesSearch && matchesStatus
  })

  const filteredAssets = assets.filter(a => {
    const matchesSearch = 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.brand && a.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.model && a.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.sealCode && a.sealCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.serialNumber && a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = assetCategoryFilter === "all" || a.category === assetCategoryFilter
    const matchesStatus = assetStatusFilter === "all" || a.status === assetStatusFilter
    const matchesLocation = assetLocationFilter === "all"
      ? ["8TTT", "06NT", "38HDD", "3T"].includes(a.warehouseLocation || "")
      : a.warehouseLocation === assetLocationFilter

    return matchesSearch && matchesCategory && matchesStatus && matchesLocation
  }).sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
    return dateB - dateA
  })

  const filteredCustomers = customers.filter(c => {
    // Only display customers who have pawn contracts (no rental-only customers)
    const isPawnCustomer = contracts.some(contract => contract.customerId === c.id)
    if (!isPawnCustomer) return false

    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.idcard && c.idcard.includes(searchTerm))

    const matchesStatus = customerStatusFilter === "all" || c.status === customerStatusFilter

    return matchesSearch && matchesStatus
  })

  // Filter Access logs
  const filteredLogs = accessLogs.filter(log => {
    const matchesSearch = 
      (log.details || "").toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      (log.username || "").toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      (log.displayName || "").toLowerCase().includes(logSearchQuery.toLowerCase())
    
    const matchesAction = logFilterAction === "all" || log.action === logFilterAction
    return matchesSearch && matchesAction
  })

  // Reports data calculations
  const getReportsData = () => {
    // Assets categories counts
    const categoriesCount = assets.reduce((acc: Record<string, number>, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1
      return acc
    }, {})

    const categoriesChartData = Object.keys(categoriesCount).map(key => {
      let label = "Khác"
      if (key === "phone") label = "Điện thoại"
      else if (key === "bike") label = "Xe máy"
      else if (key === "car") label = "Ô tô"
      else if (key === "laptop") label = "Laptop/PC"
      else if (key === "gold") label = "Vàng/Trang sức"
      return { name: label, count: categoriesCount[key] }
    })

    // Monthly interest collections
    const monthlyInterest: Record<string, number> = {}
    ledger.filter(l => l.type === "CASH_IN_INTEREST").forEach(l => {
      const date = new Date(l.timestamp)
      const monthKey = `Tháng ${date.getMonth() + 1}`
      monthlyInterest[monthKey] = (monthlyInterest[monthKey] || 0) + l.amount
    })

    const interestChartData = Object.keys(monthlyInterest).map(key => ({
      name: key,
      interest: monthlyInterest[key]
    })).reverse().slice(0, 6)

    return {
      categoriesChartData,
      interestChartData
    }
  }

  const reportsData = getReportsData()

  return (
    <div className="space-y-6">
      {/* ── Notification Toast ── */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-bottom-4 duration-300 ${
          notification.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${
            notification.type === "success" ? "text-emerald-500" : "text-red-500"
          }`} />
          <span className="font-bold">{notification.message}</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span 
              onClick={() => router.push("/dashboard/selection")}
              className="text-xs font-bold text-slate-400 hover:text-amber-500 cursor-pointer transition-colors"
            >
              Phân hệ hệ thống
            </span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-xs font-bold text-amber-500">Quản trị Cầm đồ</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Quản Lý Cầm Đồ Laviecar
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Laviecar Pawnshop · Đo lường hoạt động tài chính tự động
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button 
            onClick={() => setIsContractModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl h-10 shadow-lg shadow-amber-900/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Hợp đồng cầm mới
          </Button>
          <Button 
            onClick={() => setIsCapitalModalOpen(true)}
            variant="outline"
            className="border-slate-200 text-slate-700 font-bold rounded-xl h-10 hover:bg-slate-50"
          >
            <Settings className="w-4 h-4 mr-2" />
            Tinh chỉnh vốn
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full">
            <Database className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Dữ liệu Supabase</span>
          </div>
        </div>
      </div>

      {/* ── Stats Metric Cards ── */}
      {currentTab === "dashboard" && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Outstanding Loans */}
          <Card className="border-slate-100 shadow-sm rounded-2xl col-span-1">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Dư nợ hiện tại</p>
                  <p className="text-2xl font-black text-slate-900 mt-2 leading-none">{formatPrice(metrics.currentOutstanding)}</p>
                </div>
                <div className="p-2 bg-red-50 rounded-xl">
                  <Wallet className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                Vốn đang giải ngân ngoài thị trường
              </p>
            </CardContent>
          </Card>

          {/* Total Available Capital */}
          <Card className="border-slate-100 shadow-sm rounded-2xl col-span-1">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tổng Vốn Khả Dụng</p>
                  <p className="text-2xl font-black text-amber-600 mt-2 leading-none">{formatPrice(metrics.totalCapital)}</p>
                </div>
                <div className="p-2 bg-amber-50 rounded-xl">
                  <Shield className="w-4 h-4 text-amber-500" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Quỹ tiền mặt & quỹ ngân hàng khả dụng
              </p>
            </CardContent>
          </Card>

          {/* Expected Monthly Interest */}
          <Card className="border-slate-100 shadow-sm rounded-2xl col-span-2 lg:col-span-1">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Dự thu tiền lãi</p>
                  <p className="text-2xl font-black text-emerald-600 mt-2 leading-none">{formatPrice(metrics.monthlyExpectedInterest)}</p>
                </div>
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Tính toán tự động theo tháng hiện tại
              </p>
            </CardContent>
          </Card>

          {/* Next payment due today */}
          <Card className="border-slate-100 shadow-sm rounded-2xl col-span-1">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Đến hạn hôm nay</p>
                  <p className="text-2xl font-black text-orange-600 mt-2 leading-none">{metrics.dueTodayCount} HĐ</p>
                </div>
                <div className="p-2 bg-orange-50 rounded-xl">
                  <Clock className="w-4 h-4 text-orange-500" />
                </div>
              </div>
              <p className="text-xs text-orange-600 font-bold mt-3">
                Cần thu lãi trong ngày
              </p>
            </CardContent>
          </Card>

          {/* Overdue */}
          <Card className="border-slate-100 shadow-sm rounded-2xl col-span-1">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">HĐ Quá hạn / xấu</p>
                  <p className="text-2xl font-black text-red-600 mt-2 leading-none">{metrics.overdueCount} HĐ</p>
                </div>
                <div className="p-2 bg-red-50 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Bao gồm nợ quá hạn và nợ xấu
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab: Overview Dashboard ── */}
      {currentTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Col: Contract list & Search */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="rounded-2xl border-slate-100 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base font-bold text-slate-800">Danh Sách Hợp Đồng Cầm Đồ</CardTitle>
                  <div className="relative w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input 
                      placeholder="Mã HĐ, tên KH, tài sản..."
                      className="h-8 pl-9 bg-slate-50 border-slate-200 text-xs rounded-lg"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center items-center py-20">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                  </div>
                ) : filteredContracts.length === 0 ? (
                  <div className="text-center py-20">
                    <Shield className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Không tìm thấy hợp đồng cầm đồ nào</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Mã HĐ / Ngày lập</th>
                          <th className="py-3 px-4">Khách hàng</th>
                          <th className="py-3 px-4">Tài sản cầm cố</th>
                          <th className="py-3 px-4 text-right">Tiền gốc vay</th>
                          <th className="py-3 px-4 text-center">Lãi suất</th>
                          <th className="py-3 px-4">Kỳ đóng kế tiếp</th>
                          <th className="py-3 px-4 text-center">Trạng thái</th>
                          <th className="py-3 px-4 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                        {filteredContracts.slice(0, 10).map((c) => {
                          const isOverdue = new Date(c.nextPaymentDate) < new Date() && c.status !== "completed"
                          const statusColor = c.status === "completed" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : c.status === "overdue" || isOverdue
                            ? "bg-orange-50 text-orange-700 border-orange-100 animate-pulse"
                            : c.status === "bad_debt"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : "bg-blue-50 text-blue-700 border-blue-100"

                          return (
                            <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-slate-900 block">{c.contractCode}</span>
                                <span className="text-[10px] text-slate-400">{new Date(c.startDate).toLocaleDateString("vi-VN")}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-semibold text-slate-800 block">{c.customerName}</span>
                                <span className="text-[10px] text-slate-400">{c.customerPhone}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-medium text-slate-800 block">{c.assetName}</span>
                                <span className="text-[10px] text-slate-400 uppercase">{c.interestPeriod}</span>
                              </td>
                              <td className="py-3.5 px-4 text-right font-black text-slate-950">
                                {formatPrice(c.loanAmount)}
                              </td>
                              <td className="py-3.5 px-4 text-center text-xs">
                                {c.interestRateType === "fixed_daily" 
                                  ? `${c.interestRate.toLocaleString()}đ/tr/ngày` 
                                  : `${c.interestRate}%/tháng`}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`text-xs font-semibold ${isOverdue ? "text-orange-600 font-bold" : "text-slate-600"}`}>
                                  {new Date(c.nextPaymentDate).toLocaleDateString("vi-VN")}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                                  {c.status === "completed" 
                                    ? "Tất toán" 
                                    : c.status === "overdue" || isOverdue
                                    ? "Quá hạn thu" 
                                    : c.status === "bad_debt"
                                    ? "Nợ xấu"
                                    : "Đang vay"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center flex items-center justify-center gap-1.5">
                                {c.status !== "completed" ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => openPayment(c)}
                                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] h-7 px-2.5 rounded-lg"
                                    >
                                      Đóng lãi
                                    </Button>
                                    {user?.role === "admin" && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteContract(c)}
                                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 rounded-lg"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                                    <Check className="w-3.5 h-3.5" /> Hoàn tất
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Col: Fund ledger movement */}
          <div className="space-y-4">
            
            {/* Fund Ledger Records */}
            <Card className="rounded-2xl border-slate-100 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-800">Sổ Quỹ Thu Chi Mới Nhất</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setIsExtraLedgerOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] h-7 px-2.5 rounded-lg flex-shrink-0"
                >
                  <Plus className="w-3 h-3 mr-1" /> Ghi thu chi
                </Button>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="space-y-3.5">
                  {ledger.slice(0, 8).map((l) => {
                    const isIncome = l.type.startsWith("CASH_IN_")
                    const isNegative = l.amount < 0
                    const typeLabel = l.type === "CASH_OUT_LOAN" 
                      ? "Giải ngân gốc" 
                      : l.type === "CASH_IN_INTEREST"
                      ? "Thu tiền lãi"
                      : l.type === "CASH_IN_PRINCIPAL"
                      ? "Thu nợ gốc"
                      : l.type === "CASH_IN_LIQUIDATION"
                      ? "Thanh lý tài sản"
                      : "Chi phí vận hành"

                    return (
                      <div key={l.id} className="flex justify-between items-start text-xs border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isNegative ? "bg-rose-500" : isIncome ? "bg-emerald-500" : "bg-red-500"}`} />
                            <span className="font-bold text-slate-800">{typeLabel}</span>
                          </div>
                          <p className="text-slate-400 text-[10px] mt-0.5">{l.description}</p>
                          <p className="text-slate-400 text-[9px]">{new Date(l.timestamp).toLocaleString("vi-VN")}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`font-black ${isNegative ? "text-rose-600" : isIncome ? "text-emerald-600" : "text-red-600"}`}>
                            {isNegative ? "-" : isIncome ? "+" : "-"}{formatPrice(Math.abs(l.amount))}
                          </span>
                          <p className="text-slate-400 text-[9px] uppercase font-semibold mt-0.5">{l.paymentMethod === "bank_transfer" ? "Bank" : "Cash"}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

        {/* Analytics & Watchlists Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
 
           {/* Pie Chart: Asset Categories */}
           <Card className="rounded-2xl border-slate-100 shadow-sm flex flex-col">
             <CardHeader className="pb-3 border-b border-slate-50">
               <CardTitle className="text-base font-bold text-slate-800">Cơ Cấu Tài Sản Nhận Cầm</CardTitle>
               <CardDescription className="text-xs">Tỷ lệ phân loại tài sản thế chấp lưu kho</CardDescription>
             </CardHeader>
             <CardContent className="flex justify-center pt-3 flex-1 flex-col justify-center">
               {reportsData.categoriesChartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height={260}>
                   <PieChart>
                     <Pie
                       data={reportsData.categoriesChartData}
                       dataKey="count"
                       nameKey="name"
                       cx="50%"
                       cy="50%"
                       outerRadius={85}
                       innerRadius={45}
                       paddingAngle={3}
                       label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                       labelLine={false}
                     >
                       {reportsData.categoriesChartData.map((_, index) => {
                         const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#6b7280"]
                         return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       })}
                     </Pie>
                     <RechartsTooltip formatter={(val: any, name: any) => [`${val} tài sản`, name]} />
                     <Legend iconType="circle" iconSize={8} />
                   </PieChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="text-center py-20 text-slate-400 text-sm">Chưa có dữ liệu thống kê tài sản</div>
               )}
             </CardContent>
           </Card>
 
           {/* Monthly Interest Bar Chart */}
           <Card className="rounded-2xl border-slate-100 shadow-sm flex flex-col">
             <CardHeader className="pb-3 border-b border-slate-50">
               <CardTitle className="text-base font-bold text-slate-800">Doanh Thu Thu Lãi Theo Tháng</CardTitle>
               <CardDescription className="text-xs">Tổng số tiền lãi thu về định kỳ</CardDescription>
             </CardHeader>
             <CardContent className="flex justify-center pt-3 flex-1 flex-col justify-center">
               {reportsData.interestChartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height={260}>
                   <BarChart data={reportsData.interestChartData}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                     <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                     <YAxis tick={{ fontSize: 11 }} tickFormatter={(val: any) => formatPrice(val)} />
                     <RechartsTooltip formatter={(val: any) => formatPrice(val)} />
                     <Bar dataKey="interest" fill="#10b981" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="text-center py-20 text-slate-400 text-sm">Chưa có dữ liệu thu lãi</div>
               )}
             </CardContent>
           </Card>

           {/* Overdue Assets */}
           <Card className="rounded-2xl border-slate-100 shadow-sm flex flex-col">
             <CardHeader className="pb-3 border-b border-slate-50">
               <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                 <Clock className="w-4 h-4 text-orange-500" />
                 Danh Sách Tài Sản Quá Hạn
               </CardTitle>
               <CardDescription className="text-xs">Tài sản cầm cố thuộc hợp đồng quá hạn chưa thanh lý</CardDescription>
             </CardHeader>
             <CardContent className="pt-3 p-0 flex-1 overflow-y-auto max-h-[292px]">
               {(() => {
                 const overdueContracts = contracts.filter(c => {
                   const isOverdue = new Date(c.nextPaymentDate) < new Date() && c.status !== "completed"
                   return c.status === "overdue" || c.status === "bad_debt" || isOverdue
                 })
                 if (overdueContracts.length === 0) return (
                   <div className="text-center py-20 text-slate-400 text-sm">Không có tài sản quá hạn</div>
                 )
                 return (
                   <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                       <thead>
                         <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                           <th className="py-2.5 px-3">#</th>
                           <th className="py-2.5 px-3">Tài sản</th>
                           <th className="py-2.5 px-3">Của khách</th>
                           <th className="py-2.5 px-3 text-right">Tiền cầm</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50 text-[11px] text-slate-700">
                         {overdueContracts.slice(0, 15).map((c, idx) => {
                           const asset = assets.find(a => a.id === c.assetId)
                           return (
                             <tr key={c.id} className="hover:bg-orange-50/30 transition-colors">
                               <td className="py-2 px-3 text-slate-400 font-bold">{idx + 1}</td>
                               <td className="py-2 px-3">
                                 <span className="font-semibold text-slate-800 block">{c.assetName}</span>
                                 <span className="text-[10px] text-slate-400">{asset?.warehouseLocation || "–"}</span>
                               </td>
                               <td className="py-2 px-3 text-slate-600 truncate max-w-[80px]">{c.customerName}</td>
                               <td className="py-2 px-3 text-right font-bold text-slate-950">{formatPrice(c.loanAmount)}</td>
                             </tr>
                           )
                         })}
                       </tbody>
                     </table>
                   </div>
                 )
               })()}
             </CardContent>
           </Card>
         </div>

      </div>
    )}

      {/* ── Tab: Contracts List ── */}
      {currentTab === "contracts" && (
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">Danh Sách Hợp Đồng Cầm Đồ Thông Minh</CardTitle>
                <CardDescription className="text-xs">Theo dõi chi tiết các hợp đồng hiện hành</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input 
                    placeholder="Mã HĐ, tên KH, tài sản..."
                    className="h-9 pl-9 bg-slate-50 border-slate-200 text-xs rounded-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={contractStatusFilter} onValueChange={setContractStatusFilter}>
                  <SelectTrigger className="w-full md:w-40 h-9 rounded-xl border-slate-200 text-xs bg-white">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả hợp đồng</SelectItem>
                    <SelectItem value="active">Đang vay</SelectItem>
                    <SelectItem value="overdue">Quá hạn thu</SelectItem>
                    <SelectItem value="bad_debt">Nợ xấu</SelectItem>
                    <SelectItem value="completed">Tất toán</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">STT</th>
                    <th className="py-3 px-4">Mã HĐ / Ngày lập</th>
                    <th className="py-3 px-4">Khách hàng</th>
                    <th className="py-3 px-4">Tài sản cầm</th>
                    <th className="py-3 px-4 text-right">Tiền gốc vay</th>
                    <th className="py-3 px-4 text-center">Lãi suất</th>
                    <th className="py-3 px-4">Ngày đến hạn</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                  {filteredContracts.map((c, index) => {
                    const isOverdue = new Date(c.nextPaymentDate) < new Date() && c.status !== "completed"
                    const statusColor = c.status === "completed" 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : c.status === "overdue" || isOverdue
                      ? "bg-orange-50 text-orange-700 border-orange-100"
                      : c.status === "bad_debt"
                      ? "bg-red-50 text-red-700 border-red-100"
                      : "bg-blue-50 text-blue-700 border-blue-100"

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-center text-xs text-slate-400 font-medium">{index + 1}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{c.contractCode}</span>
                          <span className="text-[10px] text-slate-400">{new Date(c.startDate).toLocaleDateString("vi-VN")}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span 
                            className="font-semibold text-slate-800 hover:text-amber-600 hover:underline cursor-pointer block"
                            onClick={() => {
                              const cust = customers.find(cust => cust.id === c.customerId) || {
                                id: c.customerId,
                                name: c.customerName,
                                phone: c.customerPhone,
                                idcard: c.customerCCCD,
                                address: ""
                              }
                              handleViewCustomer(cust)
                            }}
                          >
                            {c.customerName}
                          </span>
                          <span className="text-[10px] text-slate-400">{c.customerPhone}</span>
                        </td>
                        <td className="py-3.5 px-4 font-medium">
                          <span 
                            className="hover:text-amber-600 hover:underline cursor-pointer"
                            onClick={() => handleViewAssetClick(c)}
                          >
                            {c.assetName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-950">{formatPrice(c.loanAmount)}</td>
                        <td className="py-3.5 px-4 text-center text-xs">
                          {c.interestRateType === "fixed_daily" 
                            ? `${c.interestRate.toLocaleString()}đ/tr/ngày` 
                            : `${c.interestRate}%/tháng`}
                        </td>
                        <td className="py-3.5 px-4">{new Date(c.nextPaymentDate).toLocaleDateString("vi-VN")}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                            {c.status === "completed" ? "Tất toán" : isOverdue ? "Quá hạn" : "Đang vay"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {c.status !== "completed" ? (
                              <Button
                                size="sm"
                                onClick={() => openPayment(c)}
                                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] h-7 px-2.5 rounded-lg shrink-0"
                              >
                                Đóng lãi
                              </Button>
                            ) : (
                              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg shrink-0">
                                <Check className="w-3.5 h-3.5" /> Hoàn tất
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                              onClick={() => handleViewContract(c)}
                              title="Xem chi tiết"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 rounded-lg hover:bg-amber-50"
                              onClick={() => handleEditContractClick(c)}
                              title="Chỉnh sửa"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </Button>
                            {user?.role === "admin" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50"
                                onClick={() => handleDeleteContract(c)}
                                title="Xóa hợp đồng"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Pawn Assets List ── */}
      {currentTab === "assets" && (
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">Kho & Tài Sản Cầm Cố Đang Lưu Trữ</CardTitle>
                <CardDescription className="text-xs">Danh sách quản lý hiện trạng lưu giữ vật chất tài sản</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input 
                    placeholder="Tên tài sản, số khung, tem niêm..."
                    className="h-9 pl-9 bg-slate-50 border-slate-200 text-xs rounded-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={assetCategoryFilter} onValueChange={setAssetCategoryFilter}>
                  <SelectTrigger className="w-full md:w-36 h-9 rounded-xl border-slate-200 text-xs bg-white">
                    <SelectValue placeholder="Phân loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả loại</SelectItem>
                    <SelectItem value="phone">Điện thoại</SelectItem>
                    <SelectItem value="bike">Xe máy</SelectItem>
                    <SelectItem value="car">Ô tô</SelectItem>
                    <SelectItem value="laptop">Laptop/PC</SelectItem>
                    <SelectItem value="gold">Vàng/Trang sức</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={assetStatusFilter} onValueChange={setAssetStatusFilter}>
                  <SelectTrigger className="w-full md:w-36 h-9 rounded-xl border-slate-200 text-xs bg-white">
                    <SelectValue placeholder="Hiện trạng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả hiện trạng</SelectItem>
                    <SelectItem value="sealed">Niêm phong</SelectItem>
                    <SelectItem value="returned">Đã trả khách</SelectItem>
                    <SelectItem value="waiting_liquidation">Chờ thanh lý</SelectItem>
                    <SelectItem value="liquidated">Đã thanh lý</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={assetLocationFilter} onValueChange={setAssetLocationFilter}>
                  <SelectTrigger className="w-full md:w-36 h-9 rounded-xl border-slate-200 text-xs bg-white w-full">
                    <SelectValue placeholder="Vị trí kho" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả kho</SelectItem>
                    <SelectItem value="8TTT">8TTT</SelectItem>
                    <SelectItem value="06NT">06NT</SelectItem>
                    <SelectItem value="38HDD">38HDD</SelectItem>
                    <SelectItem value="3T">3T</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">STT</th>
                    <th className="py-3 px-4">Tên tài sản</th>
                    <th className="py-3 px-4">Phân loại</th>
                    <th className="py-3 px-4">Hãng / Dòng máy</th>
                    <th className="py-3 px-4">Của khách</th>
                    <th className="py-3 px-4 text-right">Giá cầm</th>
                    <th className="py-3 px-4">Vị trí kho</th>
                    <th className="py-3 px-4 text-center">Trạng thái kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                  {filteredAssets.map((asset, index) => {
                    const contract = contracts.find(c => c.assetId === asset.id)
                    const categoryLabels: Record<string, string> = {
                      phone: "Điện thoại",
                      bike: "Xe máy",
                      car: "Ô tô",
                      laptop: "Laptop/PC",
                      gold: "Vàng/Trang sức",
                      other: "Khác"
                    }
                    return (
                      <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 text-center text-xs text-slate-400 font-medium">{index + 1}</td>
                        <td className="py-3 px-4 font-semibold">{asset.name}</td>
                        <td className="py-3 px-4">{categoryLabels[asset.category] || asset.category}</td>
                        <td className="py-3 px-4">{asset.brand} - {asset.model}</td>
                        <td className="py-3 px-4 text-slate-600">{contract ? contract.customerName : "-"}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">
                          {contract ? formatPrice(contract.loanAmount) : "-"}
                        </td>
                        <td className="py-3 px-4">{asset.warehouseLocation || "-"}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            asset.status === "sealed" 
                              ? "bg-blue-50 text-blue-700 border-blue-100" 
                              : asset.status === "returned" 
                              ? "bg-slate-50 text-slate-500 border-slate-100" 
                              : "bg-red-50 text-red-700 border-red-100"
                          }`}>
                            {asset.status === "sealed" ? "Niêm phong" : asset.status === "returned" ? "Đã trả khách" : "Thanh lý"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Pawn Customers List ── */}
      {currentTab === "customers" && (
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">Danh Sách Khách Hàng Cầm Đồ</CardTitle>
                <CardDescription className="text-xs">Theo dõi lịch sử giao dịch và xếp hạng tín nhiệm khách cầm cố</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input 
                    placeholder="Tên khách hàng, số điện thoại, CCCD..."
                    className="h-9 pl-9 bg-slate-50 border-slate-200 text-xs rounded-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={customerStatusFilter} onValueChange={setCustomerStatusFilter}>
                  <SelectTrigger className="w-full md:w-40 h-9 rounded-xl border-slate-200 text-xs bg-white">
                    <SelectValue placeholder="Trạng thái tài khoản" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="active">Đang hoạt động</SelectItem>
                    <SelectItem value="inactive">Đã khoá</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">STT</th>
                    <th className="py-3 px-4">Tên khách hàng</th>
                    <th className="py-3 px-4">Số điện thoại</th>
                    <th className="py-3 px-4">Địa chỉ</th>
                    <th className="py-3 px-4">Số CCCD</th>
                    <th className="py-3 px-4 text-center">Hợp đồng cầm</th>
                    <th className="py-3 px-4 text-center">Trạng thái tài khoản</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                  {filteredCustomers.map((c, index) => {
                    const customerContracts = contracts.filter(con => con.customerId === c.id)
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-center text-xs text-slate-400 font-medium">{index + 1}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{c.name}</td>
                        <td className="py-3.5 px-4">{c.phone}</td>
                        <td className="py-3.5 px-4">{c.address || "-"}</td>
                        <td className="py-3.5 px-4 font-mono text-xs">{c.idcard || "-"}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-amber-600">{customerContracts.length} HĐ</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            c.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"
                          }`}>
                            {c.status === "active" ? "Hoạt động" : "Khóa"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                              onClick={() => handleViewCustomer(c)}
                              title="Xem chi tiết"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 rounded-lg hover:bg-amber-50"
                              onClick={() => handleEditCustomerClick(c)}
                              title="Chỉnh sửa"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </Button>
                            {user?.role === "admin" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50"
                                onClick={() => handleDeleteCustomerClick(c)}
                                title="Xóa khách hàng"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Reports ── */}
      {currentTab === "reports" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-2xl border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800">Cơ Cấu Tài Sản Nhận Cầm</CardTitle>
                <CardDescription className="text-xs">Theo dõi tỷ lệ phân loại tài sản thế chấp lưu kho</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                {reportsData.categoriesChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={reportsData.categoriesChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-20 text-slate-400 text-sm">Chưa có dữ liệu thống kê tài sản</div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800">Doanh Thu Thu Lãi Theo Tháng</CardTitle>
                <CardDescription className="text-xs">Tổng số tiền lãi thu về định kỳ</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                {reportsData.interestChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={reportsData.interestChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(val: any) => formatPrice(val)} />
                      <RechartsTooltip formatter={(val: any) => formatPrice(val)} />
                      <Bar dataKey="interest" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-20 text-slate-400 text-sm">Chưa có dữ liệu thu lãi</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab: Access Logs (Admin Only) ── */}
      {currentTab === "history" && (
        user?.role !== "admin" ? (
          <Card className="border-red-100 bg-red-50/30 p-8 text-center rounded-2xl">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-red-800">Truy cập bị hạn chế</h3>
            <p className="text-xs text-red-600 mt-1">Chỉ tài khoản Administrator mới có quyền xem lịch sử truy cập phân hệ này.</p>
          </Card>
        ) : (
          <Card className="rounded-2xl border-slate-100 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">Nhật Ký Truy Cập Phân Hệ Cầm Đồ</CardTitle>
                  <CardDescription className="text-xs">Giám sát các thao tác nghiệp vụ của nhân viên</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input 
                      placeholder="Tìm kiếm hành động, nhân viên..."
                      className="h-9 pl-9 bg-slate-50 border-slate-200 text-xs rounded-xl"
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={logFilterAction} onValueChange={setLogFilterAction}>
                    <SelectTrigger className="w-full md:w-40 h-9 rounded-xl border-slate-200 text-xs bg-white">
                      <SelectValue placeholder="Loại hành động" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả hành động</SelectItem>
                      <SelectItem value="Thêm mới">Thêm mới</SelectItem>
                      <SelectItem value="Chỉnh sửa">Chỉnh sửa</SelectItem>
                      <SelectItem value="Xoá">Xoá</SelectItem>
                      <SelectItem value="Sao lưu dữ liệu">Sao lưu</SelectItem>
                      <SelectItem value="Khôi phục dữ liệu">Khôi phục</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {logsLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">Chưa có nhật ký hoạt động nào phù hợp</div>
              ) : (
                <div className="space-y-3">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="p-2 bg-amber-50 rounded-xl h-10 w-10 flex items-center justify-center flex-shrink-0">
                        <History className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{log.displayName}</span>
                          <span className="text-xs text-slate-500">(@{log.username})</span>
                          <span className="text-xs bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">{log.action}</span>
                        </div>
                        <p className="text-sm text-slate-700 mt-1">{log.details}</p>
                        <p className="text-[10px] text-slate-400 mt-1.5">{new Date(log.timestamp).toLocaleString("vi-VN")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      )}

      {/* ── Tab: Backup & Restore (Admin Only) ── */}
      {currentTab === "backup" && (
        user?.role !== "admin" ? (
          <Card className="border-red-100 bg-red-50/30 p-8 text-center rounded-2xl">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-red-800">Truy cập bị hạn chế</h3>
            <p className="text-xs text-red-600 mt-1">Chỉ tài khoản Administrator mới có quyền sao lưu và khôi phục dữ liệu.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="rounded-2xl border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-500" /> Sao lưu & khôi phục dữ liệu phân hệ cầm đồ
                </CardTitle>
                <CardDescription className="text-xs">Quản lý các bản sao lưu độc lập cho cơ sở dữ liệu cầm đồ Supabase</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {backupMessage && (
                  <div className={`p-4 rounded-xl flex gap-2 text-sm ${backupMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                    <div className="text-xs md:text-sm whitespace-pre-line font-medium">{backupMessage.text}</div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Backup Card Trigger */}
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-amber-500 transition-colors">
                    <Download className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <h3 className="font-bold text-slate-800 mb-1 text-sm md:text-base">Sao lưu dữ liệu cầm đồ</h3>
                    <p className="text-xs text-slate-400 mb-4">Xuất toàn bộ tài sản, hợp đồng vay, sổ quỹ dòng tiền cầm đồ</p>
                    <Button 
                      onClick={handlePawnBackup}
                      disabled={backupLoading}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold w-full rounded-xl"
                    >
                      {backupLoading ? "Đang xử lý..." : "📥 Thực hiện sao lưu"}
                    </Button>
                  </div>

                  {/* Restore Upload Trigger */}
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors">
                    <Upload className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <h3 className="font-bold text-slate-800 mb-1 text-sm md:text-base">Khôi phục từ file JSON</h3>
                    <p className="text-xs text-slate-400 mb-4">Tải lên tệp tin JSON cấu trúc sao lưu cầm đồ từ máy tính</p>
                    <Button 
                      onClick={() => {
                        const input = document.createElement("input")
                        input.type = "file"
                        input.accept = ".json"
                        input.onchange = (e) => handlePawnRestoreFromUpload(e as any)
                        input.click()
                      }}
                      disabled={backupLoading}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold w-full rounded-xl"
                    >
                      {backupLoading ? "Đang xử lý..." : "📤 Tải file & khôi phục"}
                    </Button>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-2">
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    ⚠️ <strong>Lưu ý quan trọng:</strong> Hành động khôi phục dữ liệu sẽ xoá bỏ hoàn toàn dữ liệu cầm đồ hiện có trong cơ sở dữ liệu Supabase và thay thế bằng dữ liệu từ tệp tin sao lưu. Vui lòng kiểm tra kỹ trước khi bấm xác nhận.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Backup Files List */}
            <Card className="rounded-2xl border-slate-100 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">Danh sách tệp tin sao lưu hệ thống</CardTitle>
                  <CardDescription className="text-xs">Lưu trữ trên bộ nhớ lưu trữ Supabase Storage Backups</CardDescription>
                </div>
                <Button onClick={loadBackupFiles} size="sm" variant="outline" disabled={backupFilesLoading} className="rounded-xl h-8">
                  <RefreshCw className={`w-3.5 h-3.5 ${backupFilesLoading ? "animate-spin" : ""}`} />
                </Button>
              </CardHeader>
              <CardContent className="pt-4">
                {backupFilesLoading ? (
                  <div className="text-center py-6">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-500" />
                  </div>
                ) : backupFiles.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">Chưa có bản sao lưu nào được lưu trên đám mây</div>
                ) : (
                  <div className="space-y-3">
                    {backupFiles.map((file) => (
                      <div key={file.name} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-amber-200 transition-all gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-800 break-words">{file.name}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(file.created_at).toLocaleString("vi-VN")} • {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            size="sm"
                            onClick={() => handlePawnRestore(file.url, file.name)}
                            disabled={backupLoading}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex-1 sm:flex-initial"
                          >
                            Khôi phục bản này
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteBackup(file.name)}
                            disabled={backupLoading}
                            className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )
      )}

      {/* ── CREATE CONTRACT MODAL ── */}
      <Dialog open={isContractModalOpen} onOpenChange={setIsContractModalOpen}>
        <DialogContent className="max-w-3xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-serif text-slate-800">Lập Hợp Đồng Cầm Đồ Mới</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Vui lòng điền hồ sơ khách hàng, chi tiết tài sản thế chấp và cấu hình gói vay tài chính.
            </DialogDescription>
          </DialogHeader>
 
          <form onSubmit={handleCreateContract} className="space-y-6">
            <div className="flex flex-col gap-5 pt-2">
              
              {/* Box 1: Hồ sơ khách hàng */}
              <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4" /> 1. Hồ Sơ Khách Hàng
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="new-cust-checkbox"
                      checked={isNewCustomer}
                      onChange={(e) => setIsNewCustomer(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                    <Label htmlFor="new-cust-checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Khách mới
                    </Label>
                  </div>
                </div>

                {!isNewCustomer ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Chọn khách hàng hiện có</Label>
                    <Select onValueChange={handleCustomerSelect}>
                      <SelectTrigger className="rounded-xl border-slate-200 bg-white w-full">
                        <SelectValue placeholder="Chọn khách hàng..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.filter(c => contracts.some(contract => contract.customerId === c.id)).map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">Họ và tên *</Label>
                      <Input
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="rounded-xl border-slate-200 bg-white"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">Số điện thoại *</Label>
                      <Input
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        placeholder="0901234567"
                        className="rounded-xl border-slate-200 bg-white"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">Ngày sinh</Label>
                      <Input
                        type="date"
                        value={newCustomerBirthday}
                        onChange={(e) => setNewCustomerBirthday(e.target.value)}
                        className="rounded-xl border-slate-200 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">Số CCCD</Label>
                      <Input
                        value={newCustomerCCCD}
                        onChange={(e) => setNewCustomerCCCD(e.target.value)}
                        placeholder="012345678912"
                        className="rounded-xl border-slate-200 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">Địa chỉ thường trú</Label>
                      <Input
                        value={newCustomerAddress}
                        onChange={(e) => setNewCustomerAddress(e.target.value)}
                        placeholder="123 Đường ABC, Quận XYZ..."
                        className="rounded-xl border-slate-200 bg-white"
                      />
                    </div>
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-amber-500" /> Ảnh chân dung
                        </Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setCustomerPhotoFile(e.target.files?.[0] || null)}
                          className="rounded-xl border-slate-200 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-amber-500" /> Ảnh CCCD mặt trước
                        </Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setCccdFrontFile(e.target.files?.[0] || null)}
                          className="rounded-xl border-slate-200 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-amber-500" /> Ảnh CCCD mặt sau
                        </Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setCccdBackFile(e.target.files?.[0] || null)}
                          className="rounded-xl border-slate-200 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Box 2: Thông tin tài sản cầm cố */}
              <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> 2. Thông Tin Tài Sản
                  </h4>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Phân loại tài sản</Label>
                    <Select 
                      value={contractForm.assetCategory} 
                      onValueChange={(val: PawnAsset["category"]) => setContractForm(prev => ({ ...prev, assetCategory: val }))}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 bg-white w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="phone">Điện thoại</SelectItem>
                        <SelectItem value="bike">Xe máy</SelectItem>
                        <SelectItem value="car">Ô tô</SelectItem>
                        <SelectItem value="laptop">Laptop / PC</SelectItem>
                        <SelectItem value="gold">Vàng / Trang sức</SelectItem>
                        <SelectItem value="other">Loại khác</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Tên tài sản (Hãng / Dòng máy)</Label>
                    <Input 
                      value={contractForm.assetName}
                      onChange={(e) => setContractForm(prev => ({ ...prev, assetName: e.target.value }))}
                      placeholder="Ví dụ: iPhone 15 Pro Max"
                      className="rounded-xl border-slate-200 bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Hiện trạng thực tế</Label>
                    <Input 
                      value={contractForm.condition}
                      onChange={(e) => setContractForm(prev => ({ ...prev, condition: e.target.value }))}
                      placeholder="Xước nhẹ lưng, móp nhẹ viền..."
                      className="rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Vị trí lưu kho</Label>
                    <Select 
                      value={contractForm.warehouseLocation} 
                      onValueChange={(val) => setContractForm(prev => ({ ...prev, warehouseLocation: val }))}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 bg-white w-full">
                        <SelectValue placeholder="Chọn vị trí kho" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="8TTT">8TTT</SelectItem>
                        <SelectItem value="06NT">06NT</SelectItem>
                        <SelectItem value="38HDD">38HDD</SelectItem>
                        <SelectItem value="3T">3T</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-amber-500" /> Ảnh tài sản cầm cố
                    </Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAssetImageFile(e.target.files?.[0] || null)}
                      className="rounded-xl border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Box 3: Cấu hình khoản vay */}
              <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" /> 3. Cấu Hợp Đồng
                  </h4>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Số tiền giải ngân gốc (VNĐ)</Label>
                    <Input 
                      type="number"
                      value={contractForm.loanAmount}
                      onChange={(e) => setContractForm(prev => ({ ...prev, loanAmount: e.target.value }))}
                      placeholder="Số tiền gốc"
                      className="rounded-xl border-slate-200 font-bold bg-white"
                      required
                    />
                  </div>

                  {/* Dòng 1: Ngày cầm & Thời hạn cầm */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">Ngày cầm</Label>
                      <Input 
                        type="date"
                        value={contractForm.startDate}
                        onChange={(e) => setContractForm(prev => ({ ...prev, startDate: e.target.value }))}
                        className="rounded-xl border-slate-200 bg-white"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">Thời hạn cầm (Ngày)</Label>
                      <Input 
                        type="number"
                        value={contractForm.durationDays}
                        onChange={(e) => setContractForm(prev => ({ ...prev, durationDays: e.target.value }))}
                        placeholder="30"
                        className="rounded-xl border-slate-200 bg-white"
                        required
                      />
                    </div>
                  </div>

                  {/* Dòng 2: Công suất tính lãi & Lãi suất */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">Công thức tính lãi</Label>
                      <Select 
                        value={contractForm.interestRateType}
                        onValueChange={(val: any) => {
                          setContractForm(prev => ({ 
                            ...prev, 
                            interestRateType: val,
                            interestPeriod: "day", // Defaulting to day as requested
                            interestRate: val === "fixed_daily" ? "3" : "2.5"
                          }));
                        }}
                      >
                        <SelectTrigger className="rounded-xl border-slate-200 bg-white w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="percentage">Theo phần trăm (%)</SelectItem>
                          <SelectItem value="fixed_daily">Theo ngày (nghìn/triệu/ngày)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">
                        {contractForm.interestRateType === "percentage" ? "Lãi suất (%)" : "Lãi suất (nghìn/triệu/ngày)"}
                      </Label>
                      <Input 
                        type="number"
                        step="0.1"
                        value={contractForm.interestRate}
                        onChange={(e) => setContractForm(prev => ({ ...prev, interestRate: e.target.value }))}
                        placeholder={contractForm.interestRateType === "percentage" ? "2.5" : "3"}
                        className="rounded-xl border-slate-200 bg-white font-semibold"
                      />
                    </div>
                  </div>

                  {/* Dòng 3: Tùy chọn thu lãi trước */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-100 space-y-2.5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="prepaid-interest-checkbox"
                        checked={contractForm.isPrepaidInterest}
                        onChange={(e) => {
                          const checked = e.target.checked
                          let defaultPrepaid = ""
                          if (checked && contractForm.loanAmount && contractForm.interestRate) {
                            const loan = parseFloat(contractForm.loanAmount) || 0
                            const rate = parseFloat(contractForm.interestRate) || 0
                            const days = parseInt(contractForm.durationDays) || 30
                            if (contractForm.interestRateType === "percentage") {
                              defaultPrepaid = Math.round(loan * (rate / 100) * (days / 30)).toString()
                            } else {
                              defaultPrepaid = Math.round((loan / 1000000) * rate * days).toString()
                            }
                          }
                          setContractForm(prev => ({ 
                            ...prev, 
                            isPrepaidInterest: checked,
                            prepaidInterestAmount: defaultPrepaid
                          }))
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <Label htmlFor="prepaid-interest-checkbox" className="text-xs font-bold text-slate-700 cursor-pointer">
                        Thu lãi trước (Cắt khi giải ngân)
                      </Label>
                    </div>
                    {contractForm.isPrepaidInterest && (
                      <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Số tiền lãi cắt trước (VNĐ)</Label>
                        <Input 
                          type="number"
                          value={contractForm.prepaidInterestAmount}
                          onChange={(e) => setContractForm(prev => ({ ...prev, prepaidInterestAmount: e.target.value }))}
                          placeholder="Nhập số tiền lãi"
                          className="rounded-xl border-slate-200 font-bold bg-white text-xs"
                          required
                        />
                        {contractForm.loanAmount && contractForm.prepaidInterestAmount && (
                          <p className="text-[10px] text-amber-600 font-bold mt-0.5">
                            Thực tế giải ngân: {formatPrice(Math.max(0, (parseInt(contractForm.loanAmount) || 0) - (parseInt(contractForm.prepaidInterestAmount) || 0)))}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dòng 4: Ghi chú */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Ghi chú hợp đồng</Label>
                    <Textarea 
                      value={contractForm.notes}
                      onChange={(e) => setContractForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Thỏa thuận khác..."
                      className="rounded-xl border-slate-200 min-h-[60px] bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 mt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsContractModalOpen(false)}
                className="rounded-xl"
              >
                Hủy bỏ
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg"
              >
                {submitting ? "Đang lập hợp đồng..." : "Xác nhận & Giải ngân"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── RECORD PAYMENT & DYNAMIC VIETQR DIALOG ── */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Thanh Toán Kỳ Lãi / Tất Toán Gốc</DialogTitle>
            <DialogDescription className="text-xs">
              Mã QR động bên dưới được cấu hình cú pháp tự động hóa nhắc nợ và ghi sổ quỹ.
            </DialogDescription>
          </DialogHeader>

          {selectedContract && (
            <div className="flex flex-col gap-6 pt-3">
              {/* Right Column: Manual Invoice form */}
              <form onSubmit={handleRecordPayment} className="space-y-4">
                {selectedContract.notes?.includes("[Cắt lãi trước:") && (
                  <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold">
                    ⚠️ Hợp đồng này đã được thu lãi trước. Khách hàng chỉ cần thanh toán tiền gốc để chuộc đồ.
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Phân loại giao dịch</Label>
                  <Select 
                    value={paymentForm.type}
                    onValueChange={(val: any) => {
                      const isPrincipal = val === "CASH_IN_PRINCIPAL"
                      setPaymentForm(prev => ({
                        ...prev,
                        type: val,
                        amount: isPrincipal ? selectedContract.loanAmount.toString() : prev.amount,
                        description: isPrincipal 
                          ? `CAMDO ${selectedContract.contractCode} TATTOAN` 
                          : `CAMDO ${selectedContract.contractCode} KI 1`
                      }))
                    }}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 bg-white w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH_IN_INTEREST">Đóng tiền lãi định kỳ</SelectItem>
                      <SelectItem value="CASH_IN_PRINCIPAL">Chuộc đồ (Tất toán gốc)</SelectItem>
                      <SelectItem value="CASH_IN_LIQUIDATION">Thanh lý tài sản thế chấp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Số tiền giao dịch thực tế (VNĐ)</Label>
                  <Input 
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="rounded-xl border-slate-200 font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Điều chỉnh tăng/giảm lãi (Nhập số dương để giảm lãi cho khách)</Label>
                  <Input 
                    type="number"
                    value={paymentForm.interestAdjustment}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, interestAdjustment: e.target.value }))}
                    placeholder="Ví dụ: 50000"
                    className="rounded-xl border-slate-200 font-semibold text-rose-600 bg-white"
                  />
                  {paymentForm.interestAdjustment && (
                    <p className="text-[10px] text-rose-500 font-bold mt-0.5">
                      Khách thực trả: {formatPrice(Math.max(0, (parseInt(paymentForm.amount) || 0) - (parseInt(paymentForm.interestAdjustment) || 0)))}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Phương thức nhận tiền</Label>
                  <Select 
                    value={paymentForm.paymentMethod}
                    onValueChange={(val: any) => setPaymentForm(prev => ({ ...prev, paymentMethod: val }))}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 bg-white w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Chuyển khoản ngân hàng</SelectItem>
                      <SelectItem value="cash">Tiền mặt tại quầy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Mô tả giao dịch</Label>
                  <Input 
                    value={paymentForm.description}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                    className="rounded-xl border-slate-200"
                    required
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="w-1/2 rounded-xl"
                  >
                    Hủy bỏ
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="w-1/2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg"
                  >
                    {submitting ? "Đang xử lý..." : "Xác nhận đóng"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: View Customer Details ── */}
      <Dialog open={isCustomerDetailOpen} onOpenChange={setIsCustomerDetailOpen}>
        <DialogContent className="max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" />
              Chi Tiết Khách Hàng Cầm Đồ
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Thông tin chi tiết hồ sơ cá nhân và lịch sử hợp đồng cầm cố.
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Họ và tên</span>
                  <p className="text-sm font-bold text-slate-800">{selectedCustomer.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Số điện thoại</span>
                  <p className="text-sm font-semibold text-slate-800">{selectedCustomer.phone}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Số CCCD</span>
                  <p className="text-sm font-mono font-semibold text-slate-800">{selectedCustomer.idcard || "-"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Địa chỉ</span>
                  <p className="text-sm text-slate-700">{selectedCustomer.address || "-"}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Trạng thái</span>
                  <div>
                    <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      selectedCustomer.status === "active" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : "bg-slate-100 text-slate-400 border-slate-200"
                    }`}>
                      {selectedCustomer.status === "active" ? "Đang hoạt động" : "Đã khóa"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hợp đồng liên quan */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-wider">
                  Hợp đồng cầm cố của khách ({contracts.filter(c => c.customerId === selectedCustomer.id).length})
                </h4>
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                        <th className="py-2.5 px-3">Mã HĐ</th>
                        <th className="py-2.5 px-3">Tài sản</th>
                        <th className="py-2.5 px-3 text-right">Tiền cầm</th>
                        <th className="py-2.5 px-3 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      {contracts.filter(c => c.customerId === selectedCustomer.id).length > 0 ? (
                        contracts.filter(c => c.customerId === selectedCustomer.id).map(c => (
                          <tr key={c.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-semibold text-amber-600">{c.contractCode}</td>
                            <td className="py-2 px-3">{c.assetName}</td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">{formatPrice(c.loanAmount)}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                c.status === "active" 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                  : c.status === "overdue" 
                                  ? "bg-red-50 text-red-700 border-red-100" 
                                  : c.status === "bad_debt"
                                  ? "bg-rose-50 text-rose-700 border-rose-100"
                                  : "bg-slate-50 text-slate-500 border-slate-200"
                              }`}>
                                {c.status === "active" ? "Đang chạy" : c.status === "overdue" ? "Trễ hạn" : c.status === "bad_debt" ? "Nợ xấu" : "Đã tất toán"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400">Chưa có hợp đồng nào</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  onClick={() => setIsCustomerDetailOpen(false)}
                  className="rounded-xl px-6 bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Edit Customer Details ── */}
      <Dialog open={isCustomerEditOpen} onOpenChange={setIsCustomerEditOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-500" />
              Chỉnh Sửa Thông Tin Khách Hàng
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Cập nhật thông tin cá nhân và trạng thái tài khoản của khách hàng.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCustomer} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Tên khách hàng</Label>
              <Input 
                value={customerForm.name}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                className="rounded-xl border-slate-200"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Số điện thoại</Label>
              <Input 
                value={customerForm.phone}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                className="rounded-xl border-slate-200"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Số CCCD</Label>
              <Input 
                value={customerForm.idcard}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, idcard: e.target.value }))}
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Địa chỉ</Label>
              <Input 
                value={customerForm.address}
                onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Trạng thái tài khoản</Label>
              <Select 
                value={customerForm.status}
                onValueChange={(val: "active" | "inactive") => setCustomerForm(prev => ({ ...prev, status: val }))}
              >
                <SelectTrigger className="rounded-xl border-slate-200 bg-white w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="inactive">Đã khóa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-3 flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCustomerEditOpen(false)}
                className="w-1/2 rounded-xl"
              >
                Hủy bỏ
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="w-1/2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg"
              >
                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: View Asset Details ── */}
      <Dialog open={isAssetDetailOpen} onOpenChange={setIsAssetDetailOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Chi Tiết Tài Sản Cầm Cố
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Thông tin hiện trạng lưu trữ vật lý của tài sản thế chấp.
            </DialogDescription>
          </DialogHeader>

          {selectedAsset && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Tên tài sản</span>
                  <p className="text-sm font-bold text-slate-800">{selectedAsset.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Phân loại</span>
                  <p className="text-sm font-semibold capitalize text-slate-800">
                    {categoryLabels[selectedAsset.category] || selectedAsset.category}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Thương hiệu - Dòng</span>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedAsset.brand || "-"} {selectedAsset.model ? `/ ${selectedAsset.model}` : ""}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Số khung/IMEI</span>
                  <p className="text-sm font-mono text-xs font-semibold text-slate-800">{selectedAsset.serialNumber || "-"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Mã tem niêm phong</span>
                  <p className="text-sm font-semibold text-amber-600">{selectedAsset.sealCode || "-"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Kho lưu trữ</span>
                  <p className="text-sm text-slate-700">{selectedAsset.warehouseName || "-"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Vị trí cụ thể</span>
                  <p className="text-sm text-slate-700">{selectedAsset.warehouseLocation || "-"}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Hiện trạng thực tế</span>
                  <p className="text-sm text-slate-700">{selectedAsset.condition || "-"}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Trạng thái</span>
                  <div>
                    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      selectedAsset.status === "sealed" 
                        ? "bg-blue-50 text-blue-700 border-blue-100" 
                        : selectedAsset.status === "returned" 
                        ? "bg-slate-50 text-slate-500 border-slate-100" 
                        : "bg-red-50 text-red-700 border-red-100"
                    }`}>
                      {selectedAsset.status === "sealed" ? "Niêm phong" : selectedAsset.status === "returned" ? "Đã trả khách" : "Thanh lý"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  onClick={() => setIsAssetDetailOpen(false)}
                  className="rounded-xl px-6 bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: View Contract Details ── */}
      <Dialog open={isContractDetailOpen} onOpenChange={setIsContractDetailOpen}>
        <DialogContent className="max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-500" />
              Chi Tiết Hợp Đồng Cầm Đồ
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Chi tiết cấu hình tài chính, kỳ hạn và lịch sử đóng lãi của hợp đồng.
            </DialogDescription>
          </DialogHeader>

          {selectedContract && (
            <div className="space-y-6">
              {/* Main Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Mã hợp đồng</span>
                  <p className="text-sm font-bold text-amber-600">{selectedContract.contractCode}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Ngày lập hợp đồng</span>
                  <p className="text-sm font-semibold text-slate-800">{new Date(selectedContract.startDate).toLocaleDateString("vi-VN")}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Ngày kết thúc</span>
                  <p className="text-sm font-semibold text-slate-800">{new Date(selectedContract.endDate).toLocaleDateString("vi-VN")}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Tiền gốc vay</span>
                  <p className="text-sm font-bold text-slate-900">{formatPrice(selectedContract.loanAmount)}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Mức lãi suất</span>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedContract.interestRateType === "fixed_daily" 
                      ? `${selectedContract.interestRate.toLocaleString()}đ/tr/ngày` 
                      : `${selectedContract.interestRate}%/tháng`}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Chu kỳ đóng lãi</span>
                  <p className="text-sm font-semibold text-slate-800 capitalize">
                    {selectedContract.interestPeriod === "day" ? "Theo ngày" : selectedContract.interestPeriod === "week" ? "Theo tuần" : "Theo tháng"}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Hạn đóng lãi tiếp theo</span>
                  <p className="text-sm font-bold text-red-600">{new Date(selectedContract.nextPaymentDate).toLocaleDateString("vi-VN")}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Khách hàng</span>
                  <p className="text-sm font-semibold text-slate-800">{selectedContract.customerName}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Tài sản cầm cố</span>
                  <p className="text-sm font-semibold text-slate-800">{selectedContract.assetName}</p>
                </div>
                <div className="space-y-0.5 col-span-2 md:col-span-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Ghi chú</span>
                  <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-100 min-h-[36px]">{selectedContract.notes || "Không có ghi chú"}</p>
                </div>
              </div>

              {/* Lịch sử thu chi (Ledger) */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-wider flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-amber-500" />
                  Lịch sử đóng tiền lãi & gốc ({ledger.filter(l => l.contractId === selectedContract.id).length})
                </h4>
                <div className="border border-slate-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                        <th className="py-2 px-3">Thời gian</th>
                        <th className="py-2 px-3">Loại giao dịch</th>
                        <th className="py-2 px-3">Mô tả</th>
                        <th className="py-2 px-3 text-right">Số tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      {ledger.filter(l => l.contractId === selectedContract.id).length > 0 ? (
                        ledger.filter(l => l.contractId === selectedContract.id).map(l => {
                          const isIncome = l.type.startsWith("CASH_IN_") || l.type === "interest_income" || l.type === "principal_recovery"
                          const isNegative = l.amount < 0
                          const typeLabel = l.type === "CASH_OUT_LOAN" 
                            ? "Giải ngân gốc" 
                            : (l.type === "CASH_IN_INTEREST" || l.type === "interest_income")
                            ? "Thu tiền lãi"
                            : (l.type === "CASH_IN_PRINCIPAL" || l.type === "principal_recovery")
                            ? "Tất toán gốc"
                            : l.type === "CASH_IN_LIQUIDATION"
                            ? "Thanh lý tài sản"
                            : "Chi phí vận hành"
                          return (
                            <tr key={l.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 text-slate-400">{new Date(l.timestamp).toLocaleString("vi-VN")}</td>
                              <td className="py-2 px-3 font-semibold">{typeLabel}</td>
                              <td className="py-2 px-3 text-slate-500">{l.description}</td>
                              <td className={`py-2 px-3 text-right font-bold ${isNegative ? "text-rose-600" : isIncome ? "text-emerald-600" : "text-red-600"}`}>
                                {isNegative ? "-" : isIncome ? "+" : "-"}{formatPrice(Math.abs(l.amount))}
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400">Chưa có giao dịch tài chính nào</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  onClick={() => setIsContractDetailOpen(false)}
                  className="rounded-xl px-6 bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Edit Contract Details ── */}
      <Dialog open={isContractEditOpen} onOpenChange={setIsContractEditOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-500" />
              Chỉnh Sửa Hợp Đồng Cầm Đồ
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Cập nhật thông tin chi phí vay, chu kỳ lãi suất hoặc trạng thái hợp đồng.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveContractEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Số tiền gốc cầm cố (VNĐ)</Label>
              <Input 
                type="number"
                value={contractEditForm.loanAmount}
                onChange={(e) => setContractEditForm(prev => ({ ...prev, loanAmount: Number(e.target.value) }))}
                className="rounded-xl border-slate-200"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Mức lãi suất</Label>
                <Input 
                  type="number"
                  step="any"
                  value={contractEditForm.interestRate}
                  onChange={(e) => setContractEditForm(prev => ({ ...prev, interestRate: Number(e.target.value) }))}
                  className="rounded-xl border-slate-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Loại lãi suất</Label>
                <Select 
                  value={contractEditForm.interestRateType}
                  onValueChange={(val: "fixed_daily" | "percentage") => setContractEditForm(prev => ({ ...prev, interestRateType: val }))}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 bg-white w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_daily">Cố định / Ngày</SelectItem>
                    <SelectItem value="percentage">% / Tháng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Chu kỳ đóng lãi</Label>
                <Select 
                  value={contractEditForm.interestPeriod}
                  onValueChange={(val: "day" | "week" | "month") => setContractEditForm(prev => ({ ...prev, interestPeriod: val }))}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 bg-white w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Theo ngày</SelectItem>
                    <SelectItem value="week">Theo tuần</SelectItem>
                    <SelectItem value="month">Theo tháng</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Trạng thái HĐ</Label>
                <Select 
                  value={contractEditForm.status}
                  onValueChange={(val: PawnContract["status"]) => setContractEditForm(prev => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 bg-white w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Đang vay</SelectItem>
                    <SelectItem value="overdue">Quá hạn đóng</SelectItem>
                    <SelectItem value="bad_debt">Nợ xấu</SelectItem>
                    <SelectItem value="completed">Đã tất toán</SelectItem>
                    <SelectItem value="cancelled">Đã hủy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Ngày đóng lãi tiếp theo</Label>
                <Input 
                  type="date"
                  value={contractEditForm.nextPaymentDate}
                  onChange={(e) => setContractEditForm(prev => ({ ...prev, nextPaymentDate: e.target.value }))}
                  className="rounded-xl border-slate-200 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Ngày kết thúc HĐ</Label>
                <Input 
                  type="date"
                  value={contractEditForm.endDate}
                  onChange={(e) => setContractEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="rounded-xl border-slate-200 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Ghi chú hợp đồng</Label>
              <Textarea 
                value={contractEditForm.notes}
                onChange={(e) => setContractEditForm(prev => ({ ...prev, notes: e.target.value }))}
                className="rounded-xl border-slate-200 text-xs min-h-[60px]"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsContractEditOpen(false)}
                className="w-1/2 rounded-xl"
              >
                Hủy bỏ
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="w-1/2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg"
              >
                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Tinh chỉnh vốn quỹ ── */}
      <Dialog open={isCapitalModalOpen} onOpenChange={setIsCapitalModalOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">Tinh Chỉnh Vốn Quỹ</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ghi nhận điều chỉnh số dư vốn quỹ cầm đồ
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCapitalAdjust} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Số tiền vốn (đ)</Label>
              <Input
                type="number"
                placeholder="VD: 50000000"
                value={capitalForm.amount}
                onChange={e => setCapitalForm(prev => ({ ...prev, amount: e.target.value }))}
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
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setIsCapitalModalOpen(false)} className="w-1/2 rounded-xl">
                Hủy
              </Button>
              <Button type="submit" disabled={submitting} className="w-1/2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl">
                {submitting ? "Đang lưu..." : "Xác nhận"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Ghi thu chi ngoài hợp đồng ── */}
      <Dialog open={isExtraLedgerOpen} onOpenChange={setIsExtraLedgerOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">Ghi Thu Chi Ngoài Hợp Đồng</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Nhập các khoản thu chi phát sinh ngoài hợp đồng cầm đồ
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleExtraLedger} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Loại giao dịch</Label>
              <select
                value={extraLedgerForm.type}
                onChange={e => setExtraLedgerForm(prev => ({ ...prev, type: e.target.value as typeof extraLedgerForm.type }))}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="CASH_IN_INTEREST">Thu tiền lãi</option>
                <option value="CASH_IN_PRINCIPAL">Thu nợ gốc</option>
                <option value="CASH_IN_LIQUIDATION">Thanh lý tài sản</option>
                <option value="OPERATIONAL_EXPENSE">Chi phí vận hành</option>
                <option value="CASH_OUT_LOAN">Giải ngân gốc</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Số tiền (đ)</Label>
              <Input
                type="number"
                placeholder="VD: 500000"
                value={extraLedgerForm.amount}
                onChange={e => setExtraLedgerForm(prev => ({ ...prev, amount: e.target.value }))}
                className="rounded-xl border-slate-200 text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Mô tả</Label>
              <Input
                placeholder="VD: Chi phí điện nước tháng 6..."
                value={extraLedgerForm.description}
                onChange={e => setExtraLedgerForm(prev => ({ ...prev, description: e.target.value }))}
                className="rounded-xl border-slate-200 text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Hình thức</Label>
              <select
                value={extraLedgerForm.paymentMethod}
                onChange={e => setExtraLedgerForm(prev => ({ ...prev, paymentMethod: e.target.value as "cash" | "bank_transfer" }))}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="cash">Tiền mặt</option>
                <option value="bank_transfer">Chuyển khoản</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setIsExtraLedgerOpen(false)} className="w-1/2 rounded-xl">
                Hủy
              </Button>
              <Button type="submit" disabled={submitting} className="w-1/2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl">
                {submitting ? "Đang lưu..." : "Ghi sổ"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
