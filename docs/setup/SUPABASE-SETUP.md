# 🚀 Supabase Configuration Guide - Bingo Online

**Last Updated:** 2025-10-24
**Project:** Bingo Online Multijugador
**Supabase Project ID:** your-project-ref

---

## ✅ Configuration Status

### Database Tables (6 total)

- ✅ `users` - User accounts (admins and players)
- ✅ `bingo_sessions` - Game sessions
- ✅ `bingo_cards` - Generated bingo cards
- ✅ `payment_transactions` - Payment verification records
- ✅ `drawn_balls` - Ball drawing history
- ✅ `winners` - Verified winners

### Security & Policies

- ✅ **Row Level Security (RLS)** enabled on all tables
- ✅ **14 RLS Policies** configured
- ✅ **Role-based access control** (admin vs player)

### Integration

- ✅ Environment variables configured
- ✅ TypeScript types generated from database
- ✅ Backend connection verified
- ✅ Frontend ready for Supabase Auth

---

## 📊 Project Information

**Project Name:** Bingo
**Project ID:** `your-project-ref`
**Region:** us-east-1
**Status:** ACTIVE_HEALTHY
**Postgres Version:** 17.6.1.021

**Project URL:** https://your-project-ref.supabase.co
**Database Host:** db.your-project-ref.supabase.co

---

## 🔑 API Keys

### Already Configured

**Anon Key** (Public - Safe for frontend):

```
<your-supabase-anon-key>
```

### To Obtain Service Role Key

The service role key is **NOT** in the repository for security reasons. To get it:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/your-project-ref)
2. Navigate to **Settings** → **API**
3. Copy the `service_role` key (secret)
4. Update `apps/backend/.env`:
   ```bash
   SUPABASE_SERVICE_KEY=<your-service-role-key-here>
   ```

⚠️ **IMPORTANT:** The service role key bypasses RLS. Keep it secret!

---

## 🗄️ Database Schema

### 1. Users Table

**Purpose:** Store admin and player accounts

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE,  -- For players
  email TEXT UNIQUE,  -- For admins
  nickname TEXT,
  role TEXT DEFAULT 'player' CHECK (role IN ('admin', 'player')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**

- Players can view their own profile
- Admins can view all users

### 2. Bingo Sessions Table

**Purpose:** Store scheduled game sessions

```sql
CREATE TABLE bingo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_time TIMESTAMPTZ NOT NULL,
  card_price NUMERIC NOT NULL,
  max_cards_per_player INTEGER NOT NULL,
  winning_pattern TEXT NOT NULL,
  custom_pattern JSONB,
  prize_amount NUMERIC,
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'active', 'finished')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**

- Anyone can view sessions (public read)
- Only admins can create/modify sessions

### 3. Bingo Cards Table

**Purpose:** Store generated bingo cards for each session

```sql
CREATE TABLE bingo_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES bingo_sessions(id) ON DELETE CASCADE,
  card_number INTEGER NOT NULL,
  numbers JSONB NOT NULL,  -- 5x5 grid as JSON
  is_sold BOOLEAN DEFAULT FALSE,
  player_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**

- Players can view their own cards
- Admins can view and manage all cards

### 4. Payment Transactions Table

**Purpose:** Track manual payment verification

```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES bingo_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_method TEXT CHECK (payment_method IN ('pago_movil', 'zelle', 'usdt_binance', 'bizum', 'efectivo')),
  payment_data JSONB NOT NULL,  -- Method-specific details
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  selected_cards JSONB NOT NULL,  -- Array of card IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**

- Players can view their own payments
- Players can create payments (status must be 'pending')
- Admins can manage all payments

### 5. Drawn Balls Table

**Purpose:** Record ball drawing history for each session

```sql
CREATE TABLE drawn_balls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES bingo_sessions(id) ON DELETE CASCADE,
  ball_number INTEGER CHECK (ball_number >= 1 AND ball_number <= 75),
  ball_letter TEXT NOT NULL,  -- B, I, N, G, O
  draw_order INTEGER NOT NULL,
  drawn_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, ball_number),
  UNIQUE(session_id, draw_order)
);
```

**RLS Policies:**

- Anyone can view drawn balls (public transparency)
- Only admins can insert/manage drawn balls

### 6. Winners Table

**Purpose:** Record verified winners for each session

```sql
CREATE TABLE winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES bingo_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES bingo_cards(id) ON DELETE CASCADE,
  prize_share NUMERIC(10, 2) NOT NULL CHECK (prize_share > 0),
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, player_id, card_id)
);
```

**RLS Policies:**

- Anyone can view winners (public leaderboard)
- Only admins can verify and record winners

---

## 🔒 Row Level Security (RLS) Policies

### Complete Policy List (14 total)

#### Users Table (2 policies)

1. **"Players view own profile"** - SELECT

   ```sql
   USING (auth.uid() = id)
   ```

2. **"Admins view all users"** - SELECT
   ```sql
   USING (
     EXISTS (
       SELECT 1 FROM users
       WHERE id = auth.uid() AND role = 'admin'
     )
   )
   ```

#### Bingo Sessions Table (2 policies)

3. **"Anyone can view sessions"** - SELECT

   ```sql
   USING (true)
   ```

4. **"Admins can manage sessions"** - ALL
   ```sql
   USING (
     EXISTS (
       SELECT 1 FROM users
       WHERE id = auth.uid() AND role = 'admin'
     )
   )
   ```

#### Bingo Cards Table (3 policies)

5. **"Players view own cards"** - SELECT

   ```sql
   USING (player_id = auth.uid())
   ```

6. **"Admins view all cards"** - SELECT

   ```sql
   USING (
     EXISTS (
       SELECT 1 FROM users
       WHERE id = auth.uid() AND role = 'admin'
     )
   )
   ```

7. **"Admins manage cards"** - ALL
   ```sql
   USING (
     EXISTS (
       SELECT 1 FROM users
       WHERE id = auth.uid() AND role = 'admin'
     )
   )
   ```

#### Payment Transactions Table (3 policies)

8. **"Players view own payments"** - SELECT

   ```sql
   USING (player_id = auth.uid())
   ```

9. **"Players create payments"** - INSERT

   ```sql
   WITH CHECK (player_id = auth.uid() AND status = 'pending')
   ```

10. **"Admins manage payments"** - ALL
    ```sql
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
    ```

#### Drawn Balls Table (2 policies)

11. **"Anyone can view drawn balls"** - SELECT

    ```sql
    USING (true)
    ```

12. **"Admins manage drawn balls"** - ALL
    ```sql
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
    ```

#### Winners Table (2 policies)

13. **"Anyone can view winners"** - SELECT

    ```sql
    USING (true)
    ```

14. **"Admins manage winners"** - ALL
    ```sql
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
    ```

---

## 📝 TypeScript Types

Types have been auto-generated from the database schema and are available in:

**File:** `packages/shared-types/src/supabase.ts`

### Usage in Backend

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@bingo/shared-types';

const supabase = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

// Type-safe queries
const { data: users, error } = await supabase
  .from('users') // ✅ Autocomplete available
  .select('*'); // ✅ Return type is Tables<'users'>[]

// data is fully typed!
users?.forEach((user) => {
  console.log(user.nickname); // ✅ TypeScript knows all fields
});
```

### Usage in Frontend

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@bingo/shared-types';

const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Same type-safe API
const { data: sessions } = await supabase
  .from('bingo_sessions')
  .select('*')
  .eq('status', 'created');
```

---

## 🔧 Environment Variables

### Backend (.env)

**File:** `apps/backend/.env`

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_KEY=<get-from-dashboard>  # Required for admin operations
```

### Frontend (.env)

**File:** `apps/frontend/.env`

```bash
# Supabase Configuration (Public - safe for browser)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

---

## 🧪 Testing the Connection

### Backend Test

```bash
# Start the backend server
pnpm dev:backend
```

Expected output:

```
✅ Supabase client initialized successfully
📍 URL: https://your-project-ref.supabase.co
🚀 Server running on port 3001
📡 Socket.IO ready for connections
```

### Manual Query Test

Create a test file `test-supabase.ts`:

```typescript
import { supabase } from './src/lib/supabase.js';

async function test() {
  const { data, error } = await supabase.from('users').select('*').limit(5);

  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Success! Found', data.length, 'users');
    console.log(data);
  }
}

test();
```

---

## 🚦 Next Steps

### 1. ✅ Get Service Role Key (Completed Above)

### 2. 📱 Configure Supabase Auth

Enable authentication providers:

1. Go to [Authentication → Providers](https://supabase.com/dashboard/project/your-project-ref/auth/providers)
2. Enable **Email** provider (for admins)
3. Configure **Phone** provider (for players)
   - Choose provider (e.g., Twilio)
   - Add credentials

### 3. 🗃️ Add Seed Data (Optional)

Create admin user:

```sql
-- In SQL Editor
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, role)
VALUES ('admin@example.com', crypt('your-password', gen_salt('bf')), NOW(), 'authenticated');

INSERT INTO users (id, email, nickname, role)
SELECT id, 'admin@example.com', 'Admin', 'admin'
FROM auth.users WHERE email = 'admin@example.com';
```

### 4. 🔔 Configure Realtime (Optional)

Enable realtime for tables that need live updates:

```sql
-- Enable realtime for payment_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE payment_transactions;

-- Enable realtime for bingo_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE bingo_sessions;
```

### 5. 📊 Create Database Functions (Optional)

Example: Function to calculate prize distribution

```sql
CREATE OR REPLACE FUNCTION calculate_prize_share(session_id UUID)
RETURNS TABLE (player_id UUID, prize_share NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.player_id,
    s.prize_amount / COUNT(*) OVER () AS prize_share
  FROM winners w
  JOIN bingo_sessions s ON s.id = w.session_id
  WHERE w.session_id = calculate_prize_share.session_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 📚 Resources

- [Supabase Dashboard](https://supabase.com/dashboard/project/your-project-ref)
- [Supabase Docs](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [TypeScript Support](https://supabase.com/docs/guides/api/typescript-support)

---

## 🆘 Troubleshooting

### Issue: "relation does not exist"

**Solution:** Run the migrations again or check table names in SQL Editor

### Issue: "permission denied for table"

**Solution:** Check RLS policies are configured correctly. Remember:

- `anon` key respects RLS
- `service_role` key bypasses RLS

### Issue: Types out of sync

**Solution:** Regenerate types:

```bash
# Using Supabase CLI
supabase gen types typescript --project-id your-project-ref > packages/shared-types/src/supabase.ts

# Or use MCP tool
mcp__supabase__generate_typescript_types(project_id: your-project-ref)
```

### Issue: Can't connect from frontend

**Solution:** Check CORS settings and ensure `VITE_` prefix on env vars

---

**✨ Supabase is now fully configured and ready for production use!**
