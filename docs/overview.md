# Project Overview

## What Spends Does

Spends is a mobile app for splitting shared expenses between friends. Core flow:

1. Users sign up / log in with email + password (Supabase Auth).
2. They add friends by email.
3. They log expenses — who paid, how much, and how to split it (equally, exact amount, or by percentage).
4. The app computes each person's net balance across all expenses and settlements.
5. The debt-simplification engine reduces the debt graph to the minimum number of transactions needed to fully settle everyone.
6. Any person can record a settlement (cash payment) which zeroes out their debt.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Expo | 54.0.0 |
| UI Runtime | React Native | 0.81.5 |
| Language | React | 19.1.0 |
| Type safety | TypeScript | 5.9.2 |
| Routing | Expo Router | 6.0.24 |
| Styling | NativeWind | 4.2.5 |
| CSS engine | Tailwind CSS | 3.3.2 |
| Animations | React Native Reanimated | 3.16.1 |
| Backend | Supabase JS | 2.107.0 |
| Auth storage | AsyncStorage | (via @react-native-async-storage) |
| Icons | @expo/vector-icons (Ionicons) | bundled with Expo |
| Web support | React Native Web | 0.21.2 |

---

## Folder Structure

```
Spends/
├── app/                         # Expo Router — all screens live here
│   ├── _layout.tsx              # Root Stack navigator + session guard
│   ├── index.tsx                # Landing screen (auth check → redirect)
│   ├── add-expense.tsx          # Modal: create an expense
│   ├── settle-up.tsx            # Modal: record a payment
│   ├── (auth)/
│   │   ├── _layout.tsx          # Auth group Stack layout
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   └── (tabs)/
│       ├── _layout.tsx          # Bottom tab bar config
│       ├── index.tsx            # Dashboard (balances)
│       ├── friends.tsx          # Friend & group management
│       ├── activity.tsx         # Expense history
│       └── account.tsx          # Profile & settings
│
├── lib/
│   ├── supabase.ts              # Supabase client singleton
│   ├── api.ts                   # All database read/write operations
│   └── debt-engine.ts           # Pure debt-simplification algorithm
│
├── types/
│   └── database.ts              # TypeScript types mirroring DB schema
│
├── assets/                      # App icon, splash screen images
├── docs/                        # This documentation
├── global.css                   # NativeWind global Tailwind entry point
├── tailwind.config.js           # Tailwind theme (custom color palette)
├── babel.config.js              # Babel presets (expo + nativewind)
├── metro.config.js              # Metro bundler (withNativeWind wrapper)
├── tsconfig.json                # TypeScript config (extends expo/tsconfig.base)
├── app.json                     # Expo app config (name, slug, plugins)
└── supabase_schema.sql          # Full Postgres DDL + RLS policies
```

---

## Architecture Decisions

### File-based Routing (Expo Router)
Every file inside `app/` becomes a route. Grouped folders like `(auth)` and `(tabs)` provide shared layouts without appearing in the URL. Modal screens (`add-expense.tsx`, `settle-up.tsx`) use `presentation: 'modal'` in the parent Stack config.

### Supabase as the Sole Backend
There is no custom server. Supabase handles:
- **Authentication** — email/password with JWT sessions stored in AsyncStorage.
- **Database** — Postgres with Row Level Security on every table.
- **Realtime** — not yet used, but available for future live balance updates.

### Separation of Concerns
```
Screen (app/) → API layer (lib/api.ts) → Supabase client (lib/supabase.ts)
Screen (app/) → Debt Engine (lib/debt-engine.ts)  ← pure function, no I/O
```
Screens never import `supabase` directly. All DB calls go through `lib/api.ts`.

### NativeWind (Tailwind for React Native)
All styling uses `className` props with Tailwind utility classes. There are **no** `StyleSheet.create` calls in this codebase. Custom colors are defined in `tailwind.config.js` and referenced as `bg-background`, `text-primary`, etc.

### TypeScript Types
`types/database.ts` mirrors every Supabase table. These types are used throughout `lib/api.ts` and screens to provide compile-time safety for DB shapes.

---

## Navigation Flow

```
app/index.tsx (Landing)
    │
    ├── Has session? ──── YES ──► (tabs)/index (Dashboard)
    │
    └── NO
         ├── "Get Started" ──────► (auth)/sign-up
         └── "Already have account" ► (auth)/sign-in

(auth)/sign-in or sign-up ──► (tabs)/index on success

(tabs)/ (persistent bottom tab bar)
    ├── index       Dashboard
    ├── friends     Network
    ├── activity    Activity
    └── account     Profile

(tabs)/index ──► /add-expense  (modal)
(tabs)/index ──► /settle-up    (modal)
```

---

## Data Flow Summary

```
User action on screen
    │
    ▼
lib/api.ts function called
    │
    ▼
Supabase query (INSERT / SELECT)
    │
    ▼
Raw data returned to screen
    │
    ▼ (for balance display only)
lib/debt-engine.ts simplifyDebts()
    │
    ▼
Simplified debt array → render
```
