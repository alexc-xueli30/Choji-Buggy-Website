# Choji Buggy Website

Choji is an **intentionally bug-riddled** Next.js 14 team-collaboration SaaS demo. It serves as a bug-finding challenge environment — every feature contains planted defects for developers and AI agents to discover, diagnose, and fix.

> **This is not a production application.** All 28 bugs are deliberate. The codebase is designed to test bug-detection skills, not to be deployed.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| UI | [React 18](https://react.dev/), [Tailwind CSS 3](https://tailwindcss.com/) |
| Language | [TypeScript 5](https://www.typescriptlang.org/) (strict mode off, `noImplicitAny` off) |
| Client State | [Zustand](https://zustand-demo.pmnd.rs/) |
| Server State | [React Query 3](https://tanstack.com/query/v3) |
| Validation | [Zod](https://zod.dev/) |
| HTTP Client | [axios](https://axios-http.com/) (file uploads), native `fetch` (everything else) |
| WebSocket | [Socket.IO Client](https://socket.io/) |
| Charts | [Recharts](https://recharts.org/) |
| Auth (JWT) | [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) (note: `next-auth` and `bcryptjs` are in dependencies but unused) |
| Utilities | [date-fns](https://date-fns.org/), [lodash](https://lodash.com/), [uuid](https://github.com/uuidjs/uuid) |

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** (or your preferred package manager)

### Install Dependencies

```bash
npm install
```

### Environment Variables

The project includes a `.env.local` file with development-only placeholder values. The key variables are:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Application URL (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL (default: `ws://localhost:3001`) |
| `NEXT_PUBLIC_API_URL` | API base URL (default: `http://localhost:3000/api`) |
| `JWT_SECRET` | Secret used for signing JWTs |

> **Note:** All secrets in `.env.local` are placeholder/dev values. There is no real database, payment processor, or email service connected.

### Run the Dev Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Other Scripts

| Command | Description |
|---|---|
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Jest tests |

## Architecture

The project uses the **Next.js App Router** with two route groups:

- **`app/(auth)/`** — Login and signup pages (public)
- **`app/(dashboard)/`** — All authenticated pages, behind a client-side auth guard in `app/(dashboard)/layout.tsx`

**API routes** live under `app/api/` as plain Next.js Route Handlers. There is no shared middleware — each handler independently decides whether to check authentication (most do not, which is one of the planted bugs).

**Client-side auth** is managed by a `useAuth` hook (`hooks/useAuth.ts`) backed by `localStorage` and a non-httpOnly cookie for SSR.

### Key Directories

```
app/
├── (auth)/           # Login, signup pages
├── (dashboard)/      # Dashboard, team, billing, settings, bugs, etc.
├── api/              # Route handlers (auth, billing, notifications, etc.)
├── layout.tsx        # Root layout
└── page.tsx          # Landing page
components/           # Reusable UI components
hooks/                # Custom React hooks (useAuth, useBilling, useSearch, etc.)
lib/                  # Shared utilities (auth, API client, helpers)
types/                # TypeScript type definitions
```

## In-Memory Backend

**All backend state is in-memory and resets on cold starts.** There is no persistent database. Mock data (users, notifications, team members, billing plans) is defined directly in the API route handlers. Every serverless function restart returns the app to its initial state.

This means:
- User accounts created via signup are lost on restart
- Settings changes do not persist across cold starts
- Notification read states reset
- Billing upgrades are not durable

## Bug Board

The app includes a dedicated **Bug Challenge Board** at [`app/(dashboard)/bugs/page.tsx`](app/(dashboard)/bugs/page.tsx) that catalogs all **28 intentionally planted defects**. Each bug entry documents:

- **Symptom** — what the user sees
- **Root cause** — the underlying code issue
- **Expected fix** — how to resolve it
- **Affected files** — which source files contain the bug

### Bug Categories

| Category | Count | Description |
|---|---|---|
| **Authentication** | 3 | Login failures, race conditions, incomplete logout |
| **API / Data** | 4 | Wrong endpoints, missing validation, destructive operations, duplicate invites |
| **State Management** | 5 | Stale closures, desynchronized state, double-fetching, non-persistent settings |
| **WebSocket** | 3 | Duplicate connections, zombie reconnects, stale message handlers |
| **TypeScript / Types** | 4 | Field name mismatches (snake_case vs camelCase), missing type variants, duplicate identity fields |
| **Security** | 2 | JWT in localStorage (XSS vulnerable), API endpoints lacking authentication |
| **Performance** | 3 | Duplicate polling + WebSocket, uncancelled uploads, broken debounce |
| **UI / UX** | 4 | Inert password form, non-functional dark mode toggle, dead buttons, incorrect sidebar active state |

### Severity Breakdown

- **Critical:** 2 bugs (login always fails, mark-all-read deletes notifications)
- **High:** 10 bugs
- **Medium:** 12 bugs
- **Low:** 4 bugs

## Contributing

1. **Find a bug** — Use the Bug Board as a reference, or discover issues by exploring the app.
2. **Diagnose** — Identify the root cause in the source code.
3. **Fix** — Make the smallest change that resolves the defect.
4. **Verify** — Confirm the fix resolves the symptom without introducing regressions.

When submitting fixes, reference the bug ID (e.g., `BUG-001`) in your commit message or PR description.

## License

This project is for internal use as a bug-finding challenge environment.
