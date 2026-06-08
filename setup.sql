-- 🏍️ 3L Moto - SQL Setup Script
-- Chạy script này trong SQL Editor của Supabase để khởi tạo database hoàn chỉnh.

-- Bật extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. BẢNG KHÁCH HÀNG (customers)
-- =========================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  facebook TEXT,
  address TEXT,
  idcard TEXT,
  totalrentals INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active' | 'inactive'
  customerphoto TEXT[] DEFAULT ARRAY[]::TEXT[],
  cccdfront TEXT[] DEFAULT ARRAY[]::TEXT[],
  cccdback TEXT[] DEFAULT ARRAY[]::TEXT[],
  licensefront TEXT[] DEFAULT ARRAY[]::TEXT[],
  licenseback TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- =========================================================================
-- 2. BẢNG PHƯƠNG TIỆN (vehicles)
-- =========================================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  "licensePlate" TEXT NOT NULL UNIQUE,
  color TEXT,
  "pricePerDay" INTEGER NOT NULL,
  status TEXT DEFAULT 'available', -- 'available' | 'rented' | 'maintenance'
  current_km INTEGER DEFAULT 0,
  "purchasePrice" INTEGER,
  notes TEXT,
  "vehicleImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "documentImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
  category TEXT DEFAULT 'car', -- 'car' | 'bike'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles("licensePlate");

-- =========================================================================
-- 3. BẢNG ĐƠN THUÊ XE (rentals)
-- =========================================================================
CREATE TABLE IF NOT EXISTS rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "customerId" UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  "customerName" TEXT NOT NULL,
  "vehicleId" UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  "vehicleName" TEXT NOT NULL,
  "licensePlate" TEXT NOT NULL,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT NOT NULL,
  "totalDays" INTEGER NOT NULL,
  "pricePerDay" INTEGER NOT NULL,
  "totalPrice" INTEGER NOT NULL,
  deposit INTEGER DEFAULT 0,
  "extraFees" INTEGER DEFAULT 0,
  notes TEXT,
  revenue INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending' | 'active' | 'completed' | 'cancelled'
  "rentalCode" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rentals_customer ON rentals("customerId");
CREATE INDEX IF NOT EXISTS idx_rentals_vehicle ON rentals("vehicleId");
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);

-- =========================================================================
-- 4. BẢNG LỊCH SỬ TRUY CẬP (access_logs)
-- =========================================================================
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  details TEXT,
  "userId" TEXT,
  username TEXT,
  "displayName" TEXT,
  "ipAddress" TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_access_logs_module ON access_logs(module);

-- =========================================================================
-- 5. BẢNG GIAO DỊCH (transactions)
-- =========================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'income' | 'expense'
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  "user" TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- =========================================================================
-- 6. BẢNG TÀI KHOẢN HỆ THỐNG (auth_users)
-- =========================================================================
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL, -- Trong thực tế nên hash mật khẩu
  displayname TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff', -- 'admin' | 'mod' | 'staff'
  can_delete BOOLEAN DEFAULT FALSE,
  can_backup BOOLEAN DEFAULT FALSE,
  can_view_access_history BOOLEAN DEFAULT FALSE,
  can_manage_users BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Thêm các tài khoản mặc định
INSERT INTO auth_users (username, password, displayname, role, can_delete, can_backup, can_view_access_history, can_manage_users)
VALUES 
  ('admin', 'admin', 'Admin', 'admin', TRUE, TRUE, TRUE, TRUE),
  ('mod', 'mod123', 'Mod', 'mod', FALSE, FALSE, FALSE, FALSE),
  ('loca', 'admin', 'Lộc A', 'staff', FALSE, FALSE, FALSE, FALSE),
  ('locb', 'admin', 'Lộc B', 'staff', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (username) DO NOTHING;

-- Tự động cập nhật totalrentals cho khách hàng khi có rental mới được thêm hoặc xóa
CREATE OR REPLACE FUNCTION update_customer_rentals_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE customers 
    SET totalrentals = (SELECT count(*) FROM rentals WHERE "customerId" = NEW."customerId")
    WHERE id = NEW."customerId";
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE customers 
    SET totalrentals = (SELECT count(*) FROM rentals WHERE "customerId" = OLD."customerId")
    WHERE id = OLD."customerId";
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD."customerId" <> NEW."customerId" THEN
      UPDATE customers 
      SET totalrentals = (SELECT count(*) FROM rentals WHERE "customerId" = NEW."customerId")
      WHERE id = NEW."customerId";
      UPDATE customers 
      SET totalrentals = (SELECT count(*) FROM rentals WHERE "customerId" = OLD."customerId")
      WHERE id = OLD."customerId";
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_customer_rentals_count
AFTER INSERT OR UPDATE OR DELETE ON rentals
FOR EACH ROW EXECUTE FUNCTION update_customer_rentals_count();
