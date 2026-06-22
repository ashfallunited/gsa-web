-- Run this against Supabase to create tables

CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  country VARCHAR(2),
  message TEXT,
  ip_address INET,

  amount_usd DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  cover_fees BOOLEAN DEFAULT false,
  fee_usd DECIMAL(10, 2) DEFAULT 0,
  total_usd DECIMAL(10, 2) NOT NULL,

  reference_id VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  dollr_status VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  email_sent BOOLEAN DEFAULT false,
  admin_notes TEXT,

  CONSTRAINT email_valid CHECK (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX idx_donations_email ON donations(email);
CREATE INDEX idx_donations_reference_id ON donations(reference_id);

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  email_type VARCHAR(20) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  admin_email VARCHAR(255),
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent',
  error_message TEXT
);

CREATE INDEX idx_email_logs_donation ON email_logs(donation_id);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
