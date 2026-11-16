# 🚀 Quick Start Guide - Bingo Online Multijugador

## ✅ Issues Fixed

1. **TypeScript Build Error** - Fixed duplicate export declarations in shared-types ✅
2. **Missing uuid Dependency** - Added uuid package to backend ✅
3. **Environment Variables** - Created .env files with placeholders ✅

---

## 📋 Current Status

**Project is initialized and ready for development!**

- ✅ All dependencies installed
- ✅ Shared-types package built successfully
- ✅ Backend configured with Express + Socket.IO
- ✅ Frontend configured with React 19 + Vite
- ✅ Environment files created (need Supabase credentials)

---

## 🔧 Next Steps to Run the Project

### 1. Setup Supabase (Required)

You need a Supabase project to run this application:

**Option A: Create a new Supabase project**

1. Go to https://supabase.com
2. Create a new project
3. Wait for it to provision (~2 minutes)
4. Go to **Settings → API** to get your credentials:
   - Project URL
   - Anon/Public key
   - Service Role key (secret!)

**Option B: Use existing Supabase project**

- Get credentials from your existing project

### 2. Update Environment Variables

**Backend (.env):**

```bash
# Edit: apps/backend/.env
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_KEY=your-actual-service-key
```

**Frontend (.env):**

```bash
# Edit: apps/frontend/.env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
```

### 3. Run Database Migration

Apply the database schema to your Supabase project:

**Option A: Using Supabase Dashboard**

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Open `supabase/migrations/001_initial_schema.sql`
4. Copy and paste the entire SQL content
5. Click **Run**

**Option B: Using Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR-PROJECT-REF

# Run migrations
supabase db push
```

### 4. Start Development Servers

```bash
# Option 1: Start both servers (recommended)
pnpm dev

# Option 2: Start separately
pnpm dev:backend   # http://localhost:3000
pnpm dev:frontend  # http://localhost:5173
```

---

## 🎯 What You'll See

### Backend (Port 3000)

```
🚀 Server running on port 3000
📡 Socket.IO ready for connections
🌍 Environment: development
```

### Frontend (Port 5173)

```
VITE v5.0.8  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

Open http://localhost:5173 in your browser - you should see the welcome screen!

---

## 🐛 Common Issues & Solutions

### Issue: "Missing Supabase environment variables"

**Solution:** Update the `.env` files with your actual Supabase credentials (see step 2 above)

### Issue: "Cannot connect to database"

**Solution:**

- Verify your Supabase credentials are correct
- Make sure you ran the database migration (step 3)
- Check your Supabase project is active

### Issue: "Port already in use"

**Solution:**

- Backend: Change `PORT=3000` to another port in `apps/backend/.env`
- Frontend: Change port in `apps/frontend/vite.config.ts`

### Issue: CORS errors in browser

**Solution:** Make sure `CORS_ORIGIN` in backend .env matches your frontend URL exactly

---

## 📚 Documentation

- **README.md** - Full project documentation
- **CLAUDE.md** - Development reference
- **IMPLEMENTATION-SUMMARY.md** - What was built
- **SPECS.md** - Feature specifications (Spanish)

---

## 🛠️ Development Commands

```bash
# Install dependencies (if needed)
pnpm install

# Build shared types (required before running)
pnpm --filter @bingo/shared-types build

# Development
pnpm dev              # Both servers
pnpm dev:backend      # Backend only
pnpm dev:frontend     # Frontend only

# Building
pnpm build            # Build all packages
pnpm build:backend    # Backend only
pnpm build:frontend   # Frontend only

# Code quality
pnpm lint             # Run ESLint
pnpm format           # Format with Prettier
pnpm type-check       # TypeScript check

# Testing
pnpm test             # Run unit tests
pnpm test:e2e         # Run E2E tests
pnpm test:coverage    # Coverage report

# Docker
docker-compose up -d  # Start with Docker
```

---

## ✨ Project Features

**Implemented:**

- ✅ Complete monorepo structure
- ✅ TypeScript strict mode
- ✅ Shared types package
- ✅ Express + Socket.IO server
- ✅ React 19 + Vite frontend
- ✅ Database schema (6 tables)
- ✅ Authentication system structure
- ✅ Payment system foundation (5 methods)
- ✅ Docker deployment configs
- ✅ Testing infrastructure

**To Implement:**

- 🔨 Frontend pages (Login, Register, Dashboards, GameRoom)
- 🔨 Socket.IO full event handlers
- 🔨 Payment verification UI
- 🔨 Real-time game room functionality
- 🔨 Admin controls
- 🔨 WhatsApp notifications (Evolution API)
- 🔨 N8N workflow automations
- 🔨 Tests (unit + integration + E2E)

---

## 🎮 Game Architecture

**Backend:**

- GameManager service (singleton)
- Ball drawing every 5 seconds
- Pattern validation (9 patterns)
- Room management

**Frontend:**

- Socket.IO client integration
- Real-time state updates
- Visual card selection
- Payment forms (5 methods)

**Database:**

- PostgreSQL with Row Level Security
- Users (admin + players)
- Sessions, Cards, Payments
- Ball history, Winners

---

## 🚀 Ready to Code!

Once you complete steps 1-4 above, you'll have:

- ✅ Backend API running on port 3000
- ✅ Frontend app running on port 5173
- ✅ Database schema ready
- ✅ Development servers with hot reload

You can now start implementing features! 🎯

---

**Need Help?**

- Check `README.md` for detailed documentation
- Review `CLAUDE.md` for development guidelines
- See `IMPLEMENTATION-SUMMARY.md` for what's been built

**Happy Coding! 🎉**
