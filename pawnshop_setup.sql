-- =========================================================================
-- SQL SETUP SCRIPT FOR PAWNSHOP FEATURE (LAVIECAR)
-- Run this script in the Supabase SQL Editor of your Laviecar project
-- =========================================================================

-- 1. Alter Customers table to add birthday column
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday DATE;

-- 2. Create pawn_assets table
CREATE TABLE IF NOT EXISTS pawn_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'car' | 'bike' | 'phone' | 'laptop' | 'gold' | 'other'
  brand TEXT,
  model TEXT,
  "serialNumber" TEXT, -- Số khung, số máy, IMEI...
  condition TEXT, -- Trạng thái xước, móp...
  "sealCode" TEXT, -- Mã tem niêm phong
  "warehouseName" TEXT DEFAULT 'Kho A', -- 'Kho A' | 'Kho B'...
  "warehouseLocation" TEXT, -- Kệ -> Tủ -> Mã Hộp
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT DEFAULT 'sealed', -- 'sealed' | 'waiting_liquidation' | 'liquidated' | 'returned'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pawn_assets_status ON pawn_assets(status);
CREATE INDEX IF NOT EXISTS idx_pawn_assets_category ON pawn_assets(category);

-- 3. Create pawn_contracts table
CREATE TABLE IF NOT EXISTS pawn_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "contractCode" TEXT NOT NULL UNIQUE,
  "customerId" UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "customerCCCD" TEXT NOT NULL,
  "assetId" UUID NOT NULL REFERENCES pawn_assets(id) ON DELETE CASCADE,
  "assetName" TEXT NOT NULL,
  "loanAmount" INTEGER NOT NULL, -- Tiền gốc giải ngân
  "interestRateType" TEXT NOT NULL DEFAULT 'fixed_daily', -- 'fixed_daily' | 'percentage'
  "interestRate" NUMERIC(10, 2) NOT NULL, -- Lãi suất
  "interestPeriod" TEXT DEFAULT 'day', -- 'day' | 'week' | 'month'
  "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
  "endDate" TIMESTAMP WITH TIME ZONE NOT NULL,
  "nextPaymentDate" TIMESTAMP WITH TIME ZONE NOT NULL,
  "gracePeriodDays" INTEGER DEFAULT 7,
  status TEXT DEFAULT 'active', -- 'active' | 'overdue' | 'bad_debt' | 'completed' | 'cancelled'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pawn_contracts_status ON pawn_contracts(status);
CREATE INDEX IF NOT EXISTS idx_pawn_contracts_next_payment ON pawn_contracts("nextPaymentDate");
CREATE INDEX IF NOT EXISTS idx_pawn_contracts_code ON pawn_contracts("contractCode");

-- 4. Create pawn_ledger table
CREATE TABLE IF NOT EXISTS pawn_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "contractId" UUID REFERENCES pawn_contracts(id) ON DELETE SET NULL,
  "contractCode" TEXT,
  type TEXT NOT NULL, -- 'CASH_OUT_LOAN' | 'CASH_IN_INTEREST' | 'CASH_IN_PRINCIPAL' | 'CASH_IN_LIQUIDATION' | 'OPERATIONAL_EXPENSE'
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  "paymentMethod" TEXT NOT NULL DEFAULT 'cash', -- 'cash' | 'bank_transfer'
  "user" TEXT NOT NULL, -- Người thực hiện
  "vietqrCode" TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pawn_ledger_type ON pawn_ledger(type);
CREATE INDEX IF NOT EXISTS idx_pawn_ledger_timestamp ON pawn_ledger(timestamp);

-- Enable RLS for newly created tables if needed (matching Allow SELECT for public/active queries)
-- ALTER TABLE pawn_assets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pawn_contracts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pawn_ledger ENABLE ROW LEVEL SECURITY;
