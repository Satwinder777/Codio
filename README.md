# 🚀 Codio (CODENEST) — Real-Time Collaborative Code Editor

A high-performance, browser-based collaborative code editor inspired by the core use cases of CodeShare.io. Users create a room, share a unique URL, and collaborate with other developers concurrently with zero friction, instant CRDT synchronization, and Monaco IDE tooling.

---

## ✨ Features

- **⚡ Instant Zero-Friction Rooms:** Create an unlisted or public coding session with one click. No mandatory sign-up required for guests.
- **🔄 Conflict-Free CRDT Collaboration:** Powered by Yjs CRDTs. Edits from multiple concurrent developers merge deterministically without data loss or document clobbering.
- **💻 Monaco IDE Engine:** The code editor that powers VS Code:
  - 17 supported programming languages (TypeScript, JavaScript, Python, Rust, Go, C++, C#, Java, HTML, CSS, SQL, JSON, Markdown, Dart, Swift, Kotlin, PHP).
  - Custom luxury developer theme: **Codio Obsidian Dark**, plus VS Dark and Light themes.
  - Bracket pair colorization, line numbers, indentation guides, format code action, code minimap, and word wrap.
- **👥 Ephemeral Live Presence:** Live collaborator avatar stack with dynamic participant counter and cursor tracking.
- **🛡️ Granular Permissions & RLS:**
  - Public, Unlisted (Shareable link), and Private rooms.
  - Role-based access modes: **Editor** vs. **Viewer** (read-only for tech interviews and presentations).
  - PostgreSQL Row-Level Security (RLS) policies enforcing database security.
- **💾 Debounced Monotonic Snapshot Persistence:** Automatic saves to PostgreSQL with monotonic revision counters preventing race conditions or out-of-order writes.
- **📁 Room Dashboard & Lifecycle:**
  - Search, filter, and sort rooms.
  - Rename, copy link, close/archive rooms.
- **🎨 Ultra-Sleek Design:** Dark-mode-first aesthetic with glowing cyan and indigo neon accents, glassmorphic panels, and smooth micro-animations.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, React 19, TypeScript strict mode) |
| **Styling** | Tailwind CSS with custom glassmorphism and obsidian tokens |
| **Code Editor** | Monaco Editor via `@monaco-editor/react` |
| **Collaboration Engine** | Yjs CRDT (`yjs`) with custom `SupabaseYjsProvider` and `MonacoBinding` |
| **Database & Auth** | Supabase PostgreSQL, Supabase Realtime, and Supabase Auth |
| **Icons & Notifications** | Lucide React & Sonner |
| **Validation** | Zod schemas |
| **Testing** | Vitest for unit tests, Browser subagent for end-to-end multi-tab verification |

---

## 📁 Repository Structure

```
codio/
├── src/
│   ├── app/
│   │   ├── page.tsx                     # Landing page with interactive hero & Monaco preview
│   │   ├── layout.tsx                   # Root layout with Navbar, Footer, and Toaster
│   │   ├── globals.css                  # Design system tokens and glassmorphism utilities
│   │   ├── room/[roomId]/page.tsx       # Dynamic collaborative room page
│   │   ├── dashboard/page.tsx           # User rooms dashboard
│   │   ├── settings/page.tsx            # Profile & Monaco IDE preferences
│   │   ├── login/page.tsx               # Supabase sign-in + guest quick-join
│   │   ├── signup/page.tsx              # Account registration
│   │   ├── forgot-password/page.tsx     # Password recovery
│   │   ├── terms/page.tsx               # Terms of service
│   │   ├── privacy/page.tsx             # Privacy policy
│   │   └── api/rooms/                   # API route handlers (create, get, update, snapshot)
│   ├── components/
│   │   ├── editor/CollaborativeEditor.tsx # Monaco editor + Yjs binding + presence toolbar
│   │   └── layout/                      # Navbar and Footer components
│   ├── lib/
│   │   ├── languages.ts                 # Supported languages registry & starter templates
│   │   ├── rooms/store.ts               # Room persistence with Supabase & local fallback
│   │   ├── supabase/                    # Client, server, and admin Supabase helpers
│   │   ├── validation/schemas.ts        # Zod input validation schemas
│   │   └── yjs/                         # SupabaseYjsProvider, MonacoBinding, and CRDT utils
│   └── types/index.ts                   # Domain TypeScript interfaces
├── supabase/
│   ├── migrations/
│   │   └── 20261024000001_initial_schema.sql # Core tables & RLS policies
│   └── tests/
│       └── rls_policies.test.sql        # Automated SQL RLS verification tests
├── .env.example                         # Environment variable documentation
├── DEVELOPMENT_STATUS.md                # Implementation progress & checklist
└── vitest.config.ts                     # Test runner configuration
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure your Supabase credentials:

```ini
# Supabase Project Configuration (From Supabase Dashboard -> Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key

# Server-Only Secret (Optional: for administrative server functions)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-role-key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note on Local Prototype Mode:** If Supabase environment variables are left blank or contain placeholder values, Codio will automatically operate in **Local Offline/Prototype Mode** using in-memory room storage and browser `BroadcastChannel` for multi-tab collaboration testing.

---

## 🗄️ Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in the Supabase Dashboard.
3. Open `supabase/migrations/20261024000001_initial_schema.sql` and execute the SQL script.
4. This creates:
   - Tables: `profiles`, `rooms`, `room_members`, `documents`, `room_invitations`, `room_events`.
   - Security functions: `is_room_active`, `is_room_owner`, `can_edit_room`.
   - Row-Level Security (RLS) policies for owner, editor, viewer, and anonymous guest access.
5. In **Project Settings -> API**, copy your **URL** and **anon public key** into `.env.local`.

---

## 🚀 Running Locally

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Run Unit Tests:**
   ```bash
   npm test
   ```

4. **Verify TypeScript Strict Check:**
   ```bash
   npx tsc --noEmit
   ```

5. **Build for Production:**
   ```bash
   npm run build
   ```

---

## 🌐 Deploying to Vercel

1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), click **Add New Project** and select this repository.
3. Add the environment variables from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel deployment URL)
4. Click **Deploy**. Next.js will automatically compile and optimize your serverless routes.

---

## 📋 PRD Acceptance Criteria Checklist

- [x] **Original branding and responsive UI:** Designed from scratch with custom theme tokens, glowing typography, and responsive controls.
- [x] **Room creation and shareable URLs:** Generates cryptographically secure, unguessable IDs with copy-to-clipboard feedback.
- [x] **Monaco editor and language selector:** 17 supported languages with syntax highlighting, custom theme, formatting, and download actions.
- [x] **Two-client Yjs collaboration:** Verified in multi-tab browser tests and Vitest unit tests. Concurrent edits converge deterministically.
- [x] **Supabase persistence and revision-safe snapshots:** Debounced server writes with monotonic revision conflict rejection.
- [x] **Supabase Auth and dashboard:** Sign-in, sign-up, password reset, guest quick-continue, and room management dashboard.
- [x] **RLS and private-room authorization:** Comprehensive SQL migration with explicit SELECT/INSERT/UPDATE/DELETE policies and SQL test suite.
- [x] **Guest access design:** Permitted on public and unlisted rooms; private rooms require owner/member access.
- [x] **Reconnect, error, expiry, and deletion flows:** Resilient reconnection states, expired/closed room error boundaries.
- [x] **Automated tests:** Vitest test suite running and passing with 100% success rate.
