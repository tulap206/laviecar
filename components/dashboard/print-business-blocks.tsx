import { LAVIECAR_BUSINESS } from "@/lib/business-info"

export function PrintBusinessHeader({
  documentTitle,
  metaLine,
}: {
  documentTitle: string
  metaLine?: string
}) {
  return (
    <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
      <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">
        {LAVIECAR_BUSINESS.brandName}
      </h1>
      {LAVIECAR_BUSINESS.branches.map((branch, index) => (
        <p key={branch} className="text-xs text-slate-600 mt-1">
          Cơ sở {index + 1}: {branch}
        </p>
      ))}
      <p className="text-xs text-slate-600">Hotline: {LAVIECAR_BUSINESS.hotline}</p>
      <h2 className="text-xl font-bold uppercase mt-4 tracking-wide text-slate-800">{documentTitle}</h2>
      {metaLine ? <p className="text-xs text-slate-500 font-mono mt-1">{metaLine}</p> : null}
    </div>
  )
}

export function PrintShopPartyBlock({
  title,
  variant = "rental",
}: {
  title: string
  variant?: "rental" | "sales" | "pawn"
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-2 uppercase text-xs">
        {title}
      </h3>
      <div className="space-y-1.5 text-sm">
        <p>
          <span className="text-slate-500">{variant === "pawn" ? "Tên đơn vị:" : "Đại diện:"}</span>{" "}
          <span className="font-bold">{LAVIECAR_BUSINESS.brandName}</span>
        </p>
        <p>
          <span className="text-slate-500">Chủ cơ sở:</span> Lê Phan Tự Lập
        </p>
        {variant === "sales" ? (
          <p>
            <span className="text-slate-500">Người lập phiếu:</span> Lê Phan Tự Lập
          </p>
        ) : null}
        <p>
          <span className="text-slate-500">{variant === "pawn" ? "Số điện thoại:" : "Điện thoại:"}</span>{" "}
          {LAVIECAR_BUSINESS.hotline}
        </p>
        {LAVIECAR_BUSINESS.branches.map((branch, index) => (
          <p key={branch}>
            <span className="text-slate-500">Địa chỉ CS{index + 1}:</span> {branch}
          </p>
        ))}
        <p>
          <span className="text-slate-500">
            {variant === "sales" ? "Số tài khoản:" : "Tài khoản thanh toán:"}
          </span>{" "}
          {variant === "sales"
            ? `${LAVIECAR_BUSINESS.bank.accountNumber} - ${LAVIECAR_BUSINESS.bank.name}`
            : `${LAVIECAR_BUSINESS.bank.name} - ${LAVIECAR_BUSINESS.bank.accountNumber}`}
        </p>
        <p>
          <span className="text-slate-500">Chủ tài khoản:</span> {LAVIECAR_BUSINESS.bank.accountHolder}
        </p>
      </div>
    </div>
  )
}
