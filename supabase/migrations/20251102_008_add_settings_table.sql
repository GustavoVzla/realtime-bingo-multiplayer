-- Migration: Add settings table for dynamic payment method configuration
-- Description: Stores payment method credentials editable from admin UI (replaces .env)

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Insert initial payment method configurations (from current .env values)
INSERT INTO settings (key, value, description) VALUES
  ('payment_pago_movil',
   '{"phone": "+58 412 0000000", "cedula": "00000000", "banco": "Banesco", "titular": "Titular de Cuenta"}'::jsonb,
   'Credenciales para Pago Móvil Venezuela'),
  ('payment_zelle',
   '{"email": "payments@example.com", "titular": "Jane Doe"}'::jsonb,
   'Credenciales para Zelle (USA)'),
  ('payment_usdt_binance',
   '{"email": "payments@example.com", "network": "TRC20", "wallet": ""}'::jsonb,
   'Credenciales para USDT vía Binance'),
  ('payment_bizum',
   '{"phone": "+34 600 000 000", "titular": "Titular de Cuenta"}'::jsonb,
   'Credenciales para Bizum (España)'),
  ('payment_efectivo',
   '{"nota": "Contactar al administrador para coordinar pago en efectivo"}'::jsonb,
   'Instrucciones para pago en efectivo')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view settings (needed for payment instructions)
CREATE POLICY "Anyone can view settings"
  ON settings FOR SELECT
  USING (true);

-- RLS Policy: Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_settings_timestamp
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();
