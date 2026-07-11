"use client"

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { PieChart as PieChartIcon, TrendingUp, Wallet, BarChart3, ArrowLeftRight } from "lucide-react"
import {
  ChartEmpty,
  ChartShell,
  ChartTooltipBox,
  LOAN_CHART_PALETTE,
  formatChartAxisValue,
} from "./chart-primitives"

type StatusDatum = { name: string; value: number }
type AmountDatum = { name: string; amount: number }
type InterestDatum = { name: string; interest: number }
type CashFlowDatum = { name: string; inflow: number; outflow: number }

export function LoanStatusChart({ data }: { data: StatusDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const filtered = data.filter((d) => d.value > 0)

  if (filtered.length === 0) {
    return (
      <ChartShell
        title="Trạng thái đơn vay"
        description="Phân bổ hợp đồng theo trạng thái"
        icon={<PieChartIcon className="w-4 h-4" />}
        accent="purple"
      >
        <ChartEmpty label="Chưa có đơn vay" />
      </ChartShell>
    )
  }

  return (
    <ChartShell
      title="Trạng thái đơn vay"
      description="Phân bổ hợp đồng theo trạng thái"
      icon={<PieChartIcon className="w-4 h-4" />}
      accent="purple"
      headerExtra={
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tổng đơn</p>
          <p className="text-sm font-bold text-purple-700 tabular-nums">{total}</p>
        </div>
      }
    >
      <div className="flex flex-col gap-4 flex-1">
        <div className="relative mx-auto w-full max-w-[200px]">
          <ResponsiveContainer width="100%" height={188}>
            <PieChart>
              <Pie
                data={filtered}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
                stroke="none"
              >
                {filtered.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={LOAN_CHART_PALETTE[index % LOAN_CHART_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload as StatusDatum
                  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0"
                  return (
                    <ChartTooltipBox>
                      <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.value} đơn · {pct}%
                      </p>
                    </ChartTooltipBox>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">{total}</p>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Đơn vay</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {filtered.map((entry, index) => {
            const color = LOAN_CHART_PALETTE[index % LOAN_CHART_PALETTE.length]
            const pct = total > 0 ? (entry.value / total) * 100 : 0
            return (
              <div key={entry.name}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-medium text-slate-700 truncate">{entry.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 tabular-nums shrink-0">{entry.value}</span>
                </div>
                <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </ChartShell>
  )
}

export function LoanCapitalChart({
  data,
  formatPrice,
}: {
  data: AmountDatum[]
  formatPrice: (n: number) => string
}) {
  const filtered = data.filter((d) => d.amount > 0)
  const total = filtered.reduce((sum, d) => sum + d.amount, 0)

  if (filtered.length === 0) {
    return (
      <ChartShell
        title="Vốn theo trạng thái"
        description="Dư nợ phân theo trạng thái hợp đồng"
        icon={<Wallet className="w-4 h-4" />}
        accent="purple"
      >
        <ChartEmpty label="Chưa có dữ liệu vốn" />
      </ChartShell>
    )
  }

  return (
    <ChartShell
      title="Vốn theo trạng thái"
      description="Dư nợ phân theo trạng thái hợp đồng"
      icon={<Wallet className="w-4 h-4" />}
      accent="purple"
      headerExtra={
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tổng vốn</p>
          <p className="text-sm font-bold text-purple-700 tabular-nums">{formatPrice(total)}</p>
        </div>
      }
    >
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filtered} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap="28%">
            <defs>
              <linearGradient id="loanCapitalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A78BFA" />
                <stop offset="100%" stopColor="#6D28D9" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={formatChartAxisValue}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ fill: "rgba(248, 250, 252, 0.8)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <ChartTooltipBox>
                    <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
                    <p className="text-sm font-bold text-purple-700 tabular-nums">
                      {formatPrice(payload[0].value as number)}
                    </p>
                  </ChartTooltipBox>
                )
              }}
            />
            <Bar dataKey="amount" fill="url(#loanCapitalGrad)" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  )
}

export function LoanProfitChart({
  data,
  formatPrice,
}: {
  data: AmountDatum[]
  formatPrice: (n: number) => string
}) {
  const filtered = data.filter((d) => d.amount !== 0)

  if (filtered.length === 0) {
    return (
      <ChartShell
        title="Lợi nhuận"
        description="Lãi thu, chi phí và lợi nhuận ròng"
        icon={<BarChart3 className="w-4 h-4" />}
        accent="purple"
      >
        <ChartEmpty label="Chưa có dữ liệu lợi nhuận" />
      </ChartShell>
    )
  }

  const barColors = ["#6D28D9", "#F59E0B", "#EF4444", "#3B82F6"]

  return (
    <ChartShell
      title="Lợi nhuận"
      description="Lãi thu, chi phí và lợi nhuận ròng"
      icon={<BarChart3 className="w-4 h-4" />}
      accent="purple"
    >
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filtered} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap="32%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={formatChartAxisValue}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ fill: "rgba(248, 250, 252, 0.8)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <ChartTooltipBox>
                    <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
                    <p className="text-sm font-bold text-purple-700 tabular-nums">
                      {formatPrice(payload[0].value as number)}
                    </p>
                  </ChartTooltipBox>
                )
              }}
            />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={44}>
              {filtered.map((entry, index) => (
                <Cell key={entry.name} fill={barColors[index % barColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  )
}

export function MonthlyCashFlowChart({
  data,
  formatPrice,
}: {
  data: CashFlowDatum[]
  formatPrice: (n: number) => string
}) {
  if (data.length === 0) {
    return (
      <ChartShell
        title="Dòng tiền theo tháng"
        description="Tiền ra & tiền vào 6 tháng gần nhất"
        icon={<ArrowLeftRight className="w-4 h-4" />}
        accent="purple"
      >
        <ChartEmpty label="Chưa có giao dịch" />
      </ChartShell>
    )
  }

  const totalInflow = data.reduce((s, d) => s + d.inflow, 0)
  const totalOutflow = data.reduce((s, d) => s + d.outflow, 0)

  return (
    <ChartShell
      title="Dòng tiền theo tháng"
      description="Tiền ra & tiền vào 6 tháng gần nhất"
      icon={<ArrowLeftRight className="w-4 h-4" />}
      accent="purple"
      headerExtra={
        <div className="text-right shrink-0 hidden sm:block space-y-0.5">
          <p className="text-[10px] font-semibold text-emerald-600 tabular-nums">+{formatPrice(totalInflow)}</p>
          <p className="text-[10px] font-semibold text-red-500 tabular-nums">-{formatPrice(totalOutflow)}</p>
        </div>
      }
    >
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap="28%" barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickFormatter={formatChartAxisValue}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ fill: "rgba(248, 250, 252, 0.8)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <ChartTooltipBox>
                    <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
                    {payload.map((p, i) => (
                      <p key={i} className={`text-xs font-bold tabular-nums ${p.dataKey === "inflow" ? "text-emerald-600" : "text-red-500"}`}>
                        {p.dataKey === "inflow" ? "Tiền vào" : "Giải ngân"}: {formatPrice(p.value as number)}
                      </p>
                    ))}
                  </ChartTooltipBox>
                )
              }}
            />
            <Bar dataKey="inflow" name="Tiền vào" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="outflow" name="Giải ngân" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" />
          <span className="text-[10px] text-slate-500">Tiền vào (lãi + gốc)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />
          <span className="text-[10px] text-slate-500">Giải ngân</span>
        </div>
      </div>
    </ChartShell>
  )
}
