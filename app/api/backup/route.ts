import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const TABLES = [
  "customers",
  "vehicles",
  "rentals",
  "transactions",
  "access_logs",
  "pawn_assets",
  "pawn_contracts",
  "pawn_ledger",
  "loan_borrowers",
  "loan_agreements",
  "loan_ledger",
  "auth_users",
] as const

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const url = new URL(request.url)
  const secretParam = url.searchParams.get("secret")

  const isAuthorized =
    (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) ||
    (process.env.CRON_SECRET && secretParam === process.env.CRON_SECRET) ||
    (process.env.NODE_ENV === "development" && (url.hostname === "localhost" || url.hostname === "127.0.0.1"))

  if (!isAuthorized) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const backupData: Record<string, unknown> = { timestamp: new Date().toISOString() }
    const counts: string[] = []

    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select("*")
      if (error) {
        console.error(`Backup skip ${table}:`, error.message)
        backupData[table] = []
        continue
      }
      backupData[table] = data || []
      counts.push(`${(data || []).length} ${table}`)
    }

    const fileName = `auto-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    const jsonString = JSON.stringify(backupData, null, 2)
    const blob = new Blob([jsonString], { type: "application/json" })

    const { error: uploadError } = await supabase.storage.from("backups").upload(fileName, blob, { upsert: false })
    if (uploadError) throw uploadError

    await supabase.from("access_logs").insert({
      username: "system",
      displayName: "Tự động sao lưu",
      action: "Tự động sao lưu",
      module: "settings",
      details: `Tự động sao lưu thành công: ${counts.join(", ")}`,
      timestamp: new Date().toISOString(),
    })

    const { data: files, error: listError } = await supabase.storage.from("backups").list()
    if (listError) throw listError

    if (files && files.length > 0) {
      const thresholdDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const filesToDelete = files
        .filter((file) => file.created_at && new Date(file.created_at) < thresholdDate)
        .map((file) => file.name)

      if (filesToDelete.length > 0) {
        await supabase.storage.from("backups").remove(filesToDelete)
        await supabase.from("access_logs").insert({
          username: "system",
          displayName: "Tự động dọn dẹp",
          action: "Xoá dữ liệu",
          module: "settings",
          details: `Xoá tự động ${filesToDelete.length} file sao lưu cũ hết hạn 30 ngày`,
          timestamp: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({ success: true, message: "Backup and cleanup completed successfully", file: fileName })
  } catch (error: any) {
    console.error("❌ [Auto-Backup] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
