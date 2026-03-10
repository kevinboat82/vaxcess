-- VaxCess Database Schema (PostgreSQL)

DROP TABLE IF EXISTS Payments CASCADE;
DROP TABLE IF EXISTS Visits CASCADE;
DROP TABLE IF EXISTS Schedules CASCADE;
DROP TABLE IF EXISTS Vaccine_Meta CASCADE;
DROP TABLE IF EXISTS Children CASCADE;
DROP TABLE IF EXISTS Caregivers CASCADE;
DROP TABLE IF EXISTS Health_Workers CASCADE;

DROP TYPE IF EXISTS schedule_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;

CREATE TYPE schedule_status AS ENUM ('PENDING', 'COMPLETED', 'MISSED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- Trigger function for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION update_modified_column()   
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;   
END;
$$ language 'plpgsql';

CREATE TABLE Health_Workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    facility_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'WORKER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER update_health_workers_modtime BEFORE UPDATE ON Health_Workers FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TABLE Caregivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(100) UNIQUE NOT NULL,
    secondary_phone VARCHAR(100), -- For "Parent Number"
    address TEXT,
    contact_validation VARCHAR(100),
    language VARCHAR(50) DEFAULT 'English',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER update_caregivers_modtime BEFORE UPDATE ON Caregivers FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TABLE Children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id UUID NOT NULL REFERENCES Caregivers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR(20),
    address TEXT, -- per child address as requested
    health_facility_centre VARCHAR(255),
    airtable_id VARCHAR(100) UNIQUE,
    
    -- Incentive Parity Fields
    incentive_status VARCHAR(100),
    incentive_value DECIMAL(10, 2) DEFAULT 0,
    all_incentives_given VARCHAR(100),
    vaccination_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER update_children_modtime BEFORE UPDATE ON Children FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TABLE Vaccine_Meta (
    id VARCHAR(100) PRIMARY KEY,
    vaccine_name VARCHAR(100) NOT NULL UNIQUE,
    min_age_days INTEGER NOT NULL,       -- Minimum age the child must be to safely receive dose
    recommended_age_days INTEGER NOT NULL, -- The ideal target date
    max_age_days INTEGER,                -- When it becomes too late to administer (or requires a different catch-up schedule)
    dose_number INTEGER NOT NULL DEFAULT 1 
);

CREATE TABLE Schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES Children(id) ON DELETE CASCADE,
    vaccine_id VARCHAR(100) NOT NULL REFERENCES Vaccine_Meta(id),
    
    -- Calculated dates for this specific child
    due_date DATE NOT NULL,
    window_start DATE NOT NULL,
    window_end DATE NOT NULL,
    
    administered_date DATE,
    status schedule_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER update_schedules_modtime BEFORE UPDATE ON Schedules FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TABLE Visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES Children(id),
    visit_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    health_worker_id UUID REFERENCES Health_Workers(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER update_visits_modtime BEFORE UPDATE ON Visits FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TABLE Payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id UUID NOT NULL REFERENCES Caregivers(id),
    visit_id UUID NOT NULL REFERENCES Visits(id),
    
    -- Critical for fraud prevention
    idempotency_key VARCHAR(255) UNIQUE NOT NULL, 
    
    amount DECIMAL(10, 2) NOT NULL,
    status payment_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER update_payments_modtime BEFORE UPDATE ON Payments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Performance & Foreign Key Indexes
CREATE INDEX idx_schedules_child_id ON Schedules(child_id);
CREATE INDEX idx_schedules_status ON Schedules(status);
CREATE INDEX idx_payments_idempotency ON Payments(idempotency_key);

-- Initial Vaccine Metadata Seed
INSERT INTO Vaccine_Meta (id, vaccine_name, dose_number, min_age_days, recommended_age_days, max_age_days) VALUES
    ('v-bcg', 'BCG', 1, 0, 0, 365),
    ('v-opv0', 'OPV 0', 0, 0, 0, 13),
    
    -- 6 Weeks
    ('v-penta1', 'Pentavalent 1', 1, 42, 42, 365),
    ('v-opv1', 'OPV 1', 1, 42, 42, 365),
    ('v-pcv1', 'PCV 1', 1, 42, 42, 365),
    ('v-rota1', 'Rotavirus 1', 1, 42, 42, 365),

    -- 10 Weeks
    ('v-penta2', 'Pentavalent 2', 2, 70, 70, 365),
    ('v-opv2', 'OPV 2', 2, 70, 70, 365),
    ('v-pcv2', 'PCV 2', 2, 70, 70, 365),
    ('v-rota2', 'Rotavirus 2', 2, 70, 70, 365),

    -- 14 Weeks
    ('v-penta3', 'Pentavalent 3', 3, 98, 98, 365),
    ('v-opv3', 'OPV 3', 3, 98, 98, 365),
    ('v-pcv3', 'PCV 3', 3, 98, 98, 365),
    ('v-ipv', 'IPV', 1, 98, 98, 365),

    -- 9 Months
    ('v-measles1', 'Measles-Rubella 1', 1, 270, 270, 730),
    ('v-yf', 'Yellow Fever', 1, 270, 270, 730),
    ('v-vita9m', 'Vitamin A (9m)', 1, 270, 270, NULL),

    -- 18 Months
    ('v-measles2', 'Measles-Rubella 2', 2, 548, 548, NULL),
    ('v-mena', 'Meningitis A', 1, 548, 548, NULL),
    ('v-opv-booster', 'OPV Booster', 4, 548, 548, NULL),
    ('v-vita18m', 'Vitamin A (18m)', 2, 548, 548, NULL)
ON CONFLICT (id) DO UPDATE SET
    vaccine_name = EXCLUDED.vaccine_name,
    min_age_days = EXCLUDED.min_age_days,
    recommended_age_days = EXCLUDED.recommended_age_days,
    max_age_days = EXCLUDED.max_age_days;

-- Initial Admin Seed (default password: 'password')
INSERT INTO Health_Workers (username, password_hash, facility_name, role)
VALUES ('admin', '$2a$10$C8.c7I3DOKx0yG.JvXQy7OgC1FkH8aC8k9J/A6Qz0kH0l8v6jV2yG', 'Main Clinic', 'ADMIN')
ON CONFLICT (username) DO NOTHING;
