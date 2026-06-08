import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Create client with schema validation disabled
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Types
export interface Vehicle {
  id: string
  name: string
  licensePlate: string
  color: string
  pricePerDay: number
  status: "available" | "rented" | "maintenance"
  current_km: number
  purchasePrice: number
  notes: string
  vehicleImages: string[]
  documentImages: string[]
  totalRentalDays?: number
  totalRevenue?: number
  profit?: number
  created_at?: string
  category?: "car" | "bike" // Dual category support
}

export interface Customer {
  id: string
  name: string
  phone: string
  facebook: string
  address: string
  idcard: string
  totalrentals: number
  status: "active" | "inactive"
  customerphoto: string[]
  cccdfront: string[]
  cccdback: string[]
  licensefront: string[]
  licenseback: string[]
  createdAt?: string
  created_at?: string
}

export interface Rental {
  id: string
  customerId: string
  customerName: string
  vehicleId: string
  vehicleName: string
  licensePlate: string
  startDate: string
  endDate: string
  totalDays: number
  pricePerDay: number
  totalPrice: number
  deposit: number
  extraFees: number
  notes: string
  revenue: number
  status: "pending" | "active" | "completed" | "cancelled"
  createdAt: string
  created_at?: string
  rentalCode?: string
}

export interface Transaction {
  id: string
  type: "income" | "expense"
  description: string
  amount: number
  user: string
  timestamp: string
  created_at?: string
  created_by?: string
}

// Initial Mock Seed Data
const MOCK_VEHICLES: Vehicle[] = [
  {
    id: "v-1",
    name: "Mazda 3 Premium",
    licensePlate: "75A-123.45",
    color: "Đỏ Pha Lê",
    pricePerDay: 800000,
    status: "available",
    current_km: 15400,
    purchasePrice: 720000000,
    notes: "Xe gia đình sạch sẽ, đầy đủ tiện nghi, số tự động",
    vehicleImages: ["/sedan.jpg"],
    documentImages: [],
    category: "car",
    created_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "v-2",
    name: "Hyundai SantaFe Premium",
    licensePlate: "75A-555.55",
    color: "Trắng Ngọc Trai",
    pricePerDay: 1300000,
    status: "available",
    current_km: 24500,
    purchasePrice: 1150000000,
    notes: "Dòng SUV 7 chỗ rộng rãi, phù hợp đi gia đình, ngoại tỉnh",
    vehicleImages: ["/suv.jpg"],
    documentImages: [],
    category: "car",
    created_at: "2026-01-02T00:00:00.000Z"
  },
  {
    id: "v-3",
    name: "VinFast VF8 Plus",
    licensePlate: "75A-888.88",
    color: "Xanh Dương",
    pricePerDay: 1000000,
    status: "available",
    current_km: 12000,
    purchasePrice: 1250000000,
    notes: "Xe điện vận hành êm ái, công nghệ thông minh ADAS",
    vehicleImages: ["/luxury.jpg"],
    documentImages: [],
    category: "car",
    created_at: "2026-01-03T00:00:00.000Z"
  },
  {
    id: "v-4",
    name: "VinFast VF3",
    licensePlate: "75A-333.33",
    color: "Vàng Năng Động",
    pricePerDay: 500000,
    status: "available",
    current_km: 3000,
    purchasePrice: 240000000,
    notes: "Xe điện mini siêu gọn nhẹ, dễ đi trong phố",
    vehicleImages: ["/luxury.jpg"],
    documentImages: [],
    category: "car",
    created_at: "2026-01-04T00:00:00.000Z"
  },
  {
    id: "v-5",
    name: "Honda SH 150i ABS",
    licensePlate: "75F1-123.45",
    color: "Đen Bóng",
    pricePerDay: 250000,
    status: "available",
    current_km: 8500,
    purchasePrice: 110000000,
    notes: "Xe ga cao cấp sạch sẽ, phanh ABS an toàn",
    vehicleImages: ["/suv.jpg"],
    documentImages: [],
    category: "bike",
    created_at: "2026-01-05T00:00:00.000Z"
  },
  {
    id: "v-6",
    name: "Honda Air Blade 150",
    licensePlate: "75F1-678.90",
    color: "Đỏ Đen",
    pricePerDay: 150000,
    status: "available",
    current_km: 18000,
    purchasePrice: 55000000,
    notes: "Xe ga thể thao chạy êm, tiết kiệm xăng",
    vehicleImages: ["/sedan.jpg"],
    documentImages: [],
    category: "bike",
    created_at: "2026-01-06T00:00:00.000Z"
  },
  {
    id: "v-7",
    name: "Honda Vision Smartkey",
    licensePlate: "75F1-555.79",
    color: "Xanh Nhám",
    pricePerDay: 120000,
    status: "available",
    current_km: 14000,
    purchasePrice: 38000000,
    notes: "Dòng xe quốc dân, nhẹ nhàng, dễ di chuyển",
    vehicleImages: ["/sedan.jpg"],
    documentImages: [],
    category: "bike",
    created_at: "2026-01-07T00:00:00.000Z"
  }
]

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "c-1",
    name: "Nguyễn Văn Hùng",
    phone: "0905 123 456",
    facebook: "fb.com/hungnguyen.99",
    address: "12 Lê Lợi, TP Huế",
    idcard: "046099001234",
    totalrentals: 5,
    status: "active",
    customerphoto: [],
    cccdfront: [],
    cccdback: [],
    licensefront: [],
    licenseback: []
  },
  {
    id: "c-2",
    name: "Trần Thị Lan",
    phone: "0914 999 888",
    facebook: "fb.com/lantran.hue",
    address: "9/38 Hồ Đắc Di, TP Huế",
    idcard: "046195005678",
    totalrentals: 2,
    status: "active",
    customerphoto: [],
    cccdfront: [],
    cccdback: [],
    licensefront: [],
    licenseback: []
  }
]

const MOCK_RENTALS: Rental[] = [
  {
    id: "r-1",
    customerId: "c-1",
    customerName: "Nguyễn Văn Hùng",
    vehicleId: "v-1",
    vehicleName: "Mazda 3 Premium",
    licensePlate: "75A-123.45",
    startDate: "01/06/2026",
    endDate: "05/06/2026",
    totalDays: 4,
    pricePerDay: 800000,
    totalPrice: 3200000,
    deposit: 2000000,
    extraFees: 0,
    notes: "Khách trả xe đúng hẹn, xe sạch sẽ.",
    revenue: 3200000,
    status: "completed",
    createdAt: "2026-06-01T10:00:00.000Z"
  },
  {
    id: "r-2",
    customerId: "c-2",
    customerName: "Trần Thị Lan",
    vehicleId: "v-5",
    vehicleName: "Honda SH 150i ABS",
    licensePlate: "75F1-123.45",
    startDate: "06/06/2026",
    endDate: "08/06/2026",
    totalDays: 2,
    pricePerDay: 250000,
    totalPrice: 500000,
    deposit: 0,
    extraFees: 0,
    notes: "Thuê xe máy vi vu quanh thành phố.",
    revenue: 0,
    status: "active",
    createdAt: "2026-06-06T08:00:00.000Z"
  }
]

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "t-1",
    type: "income",
    description: "Nhận thanh toán hợp đồng thuê xe Mazda 3",
    amount: 3200000,
    user: "admin",
    timestamp: "2026-06-05T17:00:00.000Z"
  },
  {
    id: "t-2",
    type: "expense",
    description: "Thay nhớt xe Hyundai SantaFe",
    amount: 800000,
    user: "admin",
    timestamp: "2026-06-04T09:00:00.000Z"
  }
]

// Check if running on client side
const isClient = typeof window !== 'undefined'

// LocalStorage Helper functions
function getLocal<T>(key: string, defaults: T[]): T[] {
  if (!isClient) return defaults
  try {
    const item = localStorage.getItem(`quy79_${key}`)
    if (!item) {
      localStorage.setItem(`quy79_${key}`, JSON.stringify(defaults))
      return defaults
    }
    return JSON.parse(item)
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e)
    return defaults
  }
}

function setLocal<T>(key: string, data: T[]) {
  if (!isClient) return
  try {
    localStorage.setItem(`quy79_${key}`, JSON.stringify(data))
  } catch (e) {
    console.error(`Error writing ${key} to localStorage`, e)
  }
}

// Check if we should use fallback
const isPlaceholderUrl = false // Always use Supabase as requested by the user


// Database Fallback Layer
export const fetchVehicles = async (): Promise<Vehicle[]> => {
  if (isPlaceholderUrl) {
    console.log("⚡ Using Local Storage Fallback for vehicles")
    const vehicles = getLocal("vehicles", MOCK_VEHICLES)
    const rentals = getLocal("rentals", MOCK_RENTALS)
    const activeVehicleIds = new Set(
      rentals.filter(r => r.status === 'active').map(r => r.vehicleId)
    )
    return vehicles.map(vehicle => {
      let status = vehicle.status
      if (status !== 'maintenance') {
        status = activeVehicleIds.has(vehicle.id) ? 'rented' : 'available'
      }
      return {
        ...vehicle,
        status,
        totalRentalDays: vehicle.totalRentalDays ?? 0,
        totalRevenue: vehicle.totalRevenue ?? 0,
        profit: vehicle.profit ?? 0,
        category: vehicle.category || (vehicle.name.toLowerCase().includes('sh') || vehicle.name.toLowerCase().includes('vision') || vehicle.name.toLowerCase().includes('blade') || vehicle.name.toLowerCase().includes('exciter') ? 'bike' : 'car')
      }
    })
  }

  try {
    const [vehiclesResult, rentalsResult] = await Promise.all([
      supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('rentals')
        .select('vehicleId')
        .eq('status', 'active')
    ])
    
    if (vehiclesResult.error) throw vehiclesResult.error
    
    const activeVehicleIds = new Set(
      (rentalsResult.data || []).map((r: any) => r.vehicleId)
    )
    
    return (vehiclesResult.data || []).map(vehicle => {
      let status = vehicle.status
      if (status !== 'maintenance') {
        status = activeVehicleIds.has(vehicle.id) ? 'rented' : 'available'
      }
      return {
        ...vehicle,
        status,
        totalRentalDays: vehicle.totalRentalDays ?? 0,
        totalRevenue: vehicle.totalRevenue ?? 0,
        profit: vehicle.profit ?? 0,
        category: vehicle.category || (vehicle.name.toLowerCase().includes('sh') || vehicle.name.toLowerCase().includes('vision') || vehicle.name.toLowerCase().includes('blade') || vehicle.name.toLowerCase().includes('exciter') ? 'bike' : 'car')
      }
    })
  } catch (error) {
    console.warn("⚠️ Supabase error. Falling back to localStorage.", error)
    return getLocal("vehicles", MOCK_VEHICLES)
  }
}

export const fetchCustomers = async (): Promise<Customer[]> => {
  if (isPlaceholderUrl) {
    return getLocal("customers", MOCK_CUSTOMERS)
  }
  try {
    const { data, error } = await supabase
      .from('customers')
      .select()
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("⚠️ Supabase error. Falling back to localStorage.", error)
    return getLocal("customers", MOCK_CUSTOMERS)
  }
}

export const fetchRentals = async (): Promise<Rental[]> => {
  if (isPlaceholderUrl) {
    return getLocal("rentals", MOCK_RENTALS)
  }
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("⚠️ Supabase error. Falling back to localStorage.", error)
    return getLocal("rentals", MOCK_RENTALS)
  }
}

export const fetchAccessLogs = async () => {
  if (isPlaceholderUrl) {
    return getLocal("access_logs", [])
  }
  try {
    const { data, error } = await supabase
      .from('access_logs')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("⚠️ Supabase error. Falling back to localStorage.", error)
    return getLocal("access_logs", [])
  }
}

export const insertRental = async (rental: Omit<Rental, 'id' | 'created_at' | 'createdAt'>) => {
  if (isPlaceholderUrl) {
    const rentals = getLocal("rentals", MOCK_RENTALS)
    const newRental: Rental = {
      ...rental,
      id: `r-${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    rentals.unshift(newRental)
    setLocal("rentals", rentals)
    return newRental
  }
  try {
    const { data, error } = await supabase
      .from('rentals')
      .insert([rental])
      .select()
    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.warn("⚠️ Supabase error. Writing to localStorage.", error)
    const rentals = getLocal("rentals", MOCK_RENTALS)
    const newRental: Rental = {
      ...rental,
      id: `r-${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    rentals.unshift(newRental)
    setLocal("rentals", rentals)
    return newRental
  }
}

export const updateRental = async (id: string, rental: Partial<Rental>) => {
  if (isPlaceholderUrl) {
    const rentals = getLocal("rentals", MOCK_RENTALS)
    const idx = rentals.findIndex(r => r.id === id)
    if (idx !== -1) {
      rentals[idx] = { ...rentals[idx], ...rental }
      setLocal("rentals", rentals)
      return rentals[idx]
    }
    throw new Error("Rental not found")
  }
  try {
    const { data, error } = await supabase
      .from('rentals')
      .update(rental)
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.warn("⚠️ Supabase error. Updating in localStorage.", error)
    const rentals = getLocal("rentals", MOCK_RENTALS)
    const idx = rentals.findIndex(r => r.id === id)
    if (idx !== -1) {
      rentals[idx] = { ...rentals[idx], ...rental }
      setLocal("rentals", rentals)
      return rentals[idx]
    }
    throw new Error("Rental not found")
  }
}

export const deleteRental = async (id: string) => {
  if (isPlaceholderUrl) {
    const rentals = getLocal("rentals", MOCK_RENTALS)
    const updated = rentals.filter(r => r.id !== id)
    setLocal("rentals", updated)
    return
  }
  try {
    const { error } = await supabase
      .from('rentals')
      .delete()
      .eq('id', id)
    if (error) throw error
  } catch (error) {
    console.warn("⚠️ Supabase error. Deleting in localStorage.", error)
    const rentals = getLocal("rentals", MOCK_RENTALS)
    const updated = rentals.filter(r => r.id !== id)
    setLocal("rentals", updated)
  }
}

export const insertVehicle = async (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => {
  if (isPlaceholderUrl) {
    const vehicles = getLocal("vehicles", MOCK_VEHICLES)
    const newVehicle: Vehicle = {
      ...vehicle,
      id: `v-${Date.now()}`,
      created_at: new Date().toISOString()
    }
    vehicles.unshift(newVehicle)
    setLocal("vehicles", vehicles)
    return newVehicle
  }
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .insert([vehicle])
      .select()
    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.warn("⚠️ Supabase error. Writing to localStorage.", error)
    const vehicles = getLocal("vehicles", MOCK_VEHICLES)
    const newVehicle: Vehicle = {
      ...vehicle,
      id: `v-${Date.now()}`,
      created_at: new Date().toISOString()
    }
    vehicles.unshift(newVehicle)
    setLocal("vehicles", vehicles)
    return newVehicle
  }
}

export const updateVehicle = async (id: string, vehicle: Partial<Vehicle>) => {
  if (isPlaceholderUrl) {
    const vehicles = getLocal("vehicles", MOCK_VEHICLES)
    const idx = vehicles.findIndex(v => v.id === id)
    if (idx !== -1) {
      vehicles[idx] = { ...vehicles[idx], ...vehicle }
      setLocal("vehicles", vehicles)
      return vehicles[idx]
    }
    throw new Error("Vehicle not found")
  }
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .update(vehicle)
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.warn("⚠️ Supabase error. Updating in localStorage.", error)
    const vehicles = getLocal("vehicles", MOCK_VEHICLES)
    const idx = vehicles.findIndex(v => v.id === id)
    if (idx !== -1) {
      vehicles[idx] = { ...vehicles[idx], ...vehicle }
      setLocal("vehicles", vehicles)
      return vehicles[idx]
    }
    throw new Error("Vehicle not found")
  }
}

export const deleteVehicle = async (id: string) => {
  if (isPlaceholderUrl) {
    const vehicles = getLocal("vehicles", MOCK_VEHICLES)
    const updated = vehicles.filter(v => v.id !== id)
    setLocal("vehicles", updated)
    return
  }
  try {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id)
    if (error) throw error
  } catch (error) {
    console.warn("⚠️ Supabase error. Deleting in localStorage.", error)
    const vehicles = getLocal("vehicles", MOCK_VEHICLES)
    const updated = vehicles.filter(v => v.id !== id)
    setLocal("vehicles", updated)
  }
}

export const insertCustomer = async (customer: Omit<Customer, 'id' | 'created_at' | 'createdAt'>) => {
  if (isPlaceholderUrl) {
    const customers = getLocal("customers", MOCK_CUSTOMERS)
    const newCustomer: Customer = {
      ...customer,
      id: `c-${Date.now()}`,
      created_at: new Date().toISOString()
    }
    customers.unshift(newCustomer)
    setLocal("customers", customers)
    return newCustomer
  }
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select()
    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.warn("⚠️ Supabase error. Writing to localStorage.", error)
    const customers = getLocal("customers", MOCK_CUSTOMERS)
    const newCustomer: Customer = {
      ...customer,
      id: `c-${Date.now()}`,
      created_at: new Date().toISOString()
    }
    customers.unshift(newCustomer)
    setLocal("customers", customers)
    return newCustomer
  }
}

export const updateCustomer = async (id: string, customer: Partial<Customer>) => {
  if (isPlaceholderUrl) {
    const customers = getLocal("customers", MOCK_CUSTOMERS)
    const idx = customers.findIndex(c => c.id === id)
    if (idx !== -1) {
      customers[idx] = { ...customers[idx], ...customer }
      setLocal("customers", customers)
      return customers[idx]
    }
    throw new Error("Customer not found")
  }
  try {
    const { data, error } = await supabase
      .from('customers')
      .update(customer)
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.warn("⚠️ Supabase error. Updating in localStorage.", error)
    const customers = getLocal("customers", MOCK_CUSTOMERS)
    const idx = customers.findIndex(c => c.id === id)
    if (idx !== -1) {
      customers[idx] = { ...customers[idx], ...customer }
      setLocal("customers", customers)
      return customers[idx]
    }
    throw new Error("Customer not found")
  }
}

export const deleteCustomer = async (id: string) => {
  if (isPlaceholderUrl) {
    const customers = getLocal("customers", MOCK_CUSTOMERS)
    const updated = customers.filter(c => c.id !== id)
    setLocal("customers", updated)
    return
  }
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
    if (error) throw error
  } catch (error) {
    console.warn("⚠️ Supabase error. Deleting in localStorage.", error)
    const customers = getLocal("customers", MOCK_CUSTOMERS)
    const updated = customers.filter(c => c.id !== id)
    setLocal("customers", updated)
  }
}

export const insertAccessLog = async (action: string, module: string, details: string, userId?: string) => {
  const newLog = {
    action,
    module,
    details,
    userId,
    timestamp: new Date().toISOString()
  }
  if (isPlaceholderUrl) {
    const logs = getLocal("access_logs", [])
    logs.unshift({ ...newLog, id: `l-${Date.now()}` })
    setLocal("access_logs", logs)
    return
  }
  try {
    await supabase
      .from('access_logs')
      .insert([newLog])
  } catch (error) {
    console.warn("⚠️ Supabase logging error. Saving locally.", error)
    const logs = getLocal("access_logs", [])
    logs.unshift({ ...newLog, id: `l-${Date.now()}` })
    setLocal("access_logs", logs)
  }
}

export const fetchTransactions = async (): Promise<Transaction[]> => {
  if (isPlaceholderUrl) {
    return getLocal("transactions", MOCK_TRANSACTIONS)
  }
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (error) {
    console.warn("⚠️ Supabase error. Falling back to localStorage.", error)
    return getLocal("transactions", MOCK_TRANSACTIONS)
  }
}

export const insertTransaction = async (transaction: Omit<Transaction, 'id' | 'created_at'>) => {
  if (isPlaceholderUrl) {
    const txs = getLocal("transactions", MOCK_TRANSACTIONS)
    const newTx: Transaction = {
      ...transaction,
      id: `t-${Date.now()}`,
      created_at: new Date().toISOString()
    }
    txs.unshift(newTx)
    setLocal("transactions", txs)
    return newTx
  }
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        type: transaction.type,
        description: transaction.description,
        amount: transaction.amount,
        user: transaction.user,
        timestamp: transaction.timestamp,
        created_by: transaction.user,
      }])
      .select()
    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.warn("⚠️ Supabase error. Writing transaction locally.", error)
    const txs = getLocal("transactions", MOCK_TRANSACTIONS)
    const newTx: Transaction = {
      ...transaction,
      id: `t-${Date.now()}`,
      created_at: new Date().toISOString()
    }
    txs.unshift(newTx)
    setLocal("transactions", txs)
    return newTx
  }
}

export const deleteTransaction = async (id: string) => {
  if (isPlaceholderUrl) {
    const txs = getLocal("transactions", MOCK_TRANSACTIONS)
    const updated = txs.filter(t => t.id !== id)
    setLocal("transactions", updated)
    return
  }
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
    if (error) throw error
  } catch (error) {
    console.warn("⚠️ Supabase error. Deleting transaction locally.", error)
    const txs = getLocal("transactions", MOCK_TRANSACTIONS)
    const updated = txs.filter(t => t.id !== id)
    setLocal("transactions", updated)
  }
}

export const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
  if (isPlaceholderUrl) {
    const txs = getLocal("transactions", MOCK_TRANSACTIONS)
    const idx = txs.findIndex(t => t.id === id)
    if (idx !== -1) {
      txs[idx] = { ...txs[idx], ...updates }
      setLocal("transactions", txs)
      return txs[idx]
    }
    throw new Error("Transaction not found")
  }
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.warn("⚠️ Supabase error. Updating transaction locally.", error)
    const txs = getLocal("transactions", MOCK_TRANSACTIONS)
    const idx = txs.findIndex(t => t.id === id)
    if (idx !== -1) {
      txs[idx] = { ...txs[idx], ...updates }
      setLocal("transactions", txs)
      return txs[idx]
    }
    throw new Error("Transaction not found")
  }
}