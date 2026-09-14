/**
 * Thông tin cơ sở kinh doanh Laviecar
 */
export const LAVIECAR_BUSINESS = {
  brandName: "LAVIECAR",
  shopName: "Laviecar Rental & Financial Services",
  branches: [
    "Huế, Việt Nam",
  ] as const,
  hotline: "0363.077.775",
  hotlineRaw: "0363077775",
  zalo: "0363077775",
  facebookUrl: "https://facebook.com/thuexeototulaihue",
  website: "laviecar.com",
  bank: {
    name: "Techcombank",
    accountNumber: "Updating",
    accountHolder: "Lê Phan Tự Lập",
    accountHolderLatin: "LE PHAN TU LAP",
  },
  operators: "Laviecar",
  representative: "Lê Phan Tự Lập",
} as const

export const SOFTWARE_ABOUT = {
  productName: "Laviecar",
  productLine: "Phần mềm quản lý vận hành cho thuê xe ô tô và dịch vụ tài chính",
  author: "Phan Lê Tự Lập",
  email: "phanletulap@gmail.com",
  phone: "0967611112",
  phoneDisplay: "0967 611 112",
} as const

export function formatLaviecarBankLine(): string {
  const { bank } = LAVIECAR_BUSINESS
  return `${bank.name} - ${bank.accountNumber}`
}

export function formatLaviecarBankLineFull(): string {
  const { bank } = LAVIECAR_BUSINESS
  return `${bank.name} - ${bank.accountNumber} - ${bank.accountHolder}`
}
