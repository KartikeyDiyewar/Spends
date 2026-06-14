@AGENTS.md

# Spends — Claude/Agent Instructions

## Project Documentation

Full documentation lives in the `docs/` folder. **Always read the relevant doc before making changes.**

| Doc | When to read it |
|---|---|
| [docs/overview.md](./docs/overview.md) | Starting any task — architecture, folder structure, data flow |
| [docs/setup.md](./docs/setup.md) | Environment setup, config files, running the app |
| [docs/screens.md](./docs/screens.md) | Changing or adding any screen |
| [docs/database.md](./docs/database.md) | Any Supabase query, schema change, or RLS policy |
| [docs/api.md](./docs/api.md) | Adding or modifying `lib/api.ts` functions |
| [docs/debt-engine.md](./docs/debt-engine.md) | Touching `lib/debt-engine.ts` |
| [docs/styling.md](./docs/styling.md) | Any UI change — colors, layout, components |
| [docs/roadmap.md](./docs/roadmap.md) | Finding what's stubbed and how to complete it |

---

## Non-Negotiable Rules

1. **Never call `supabase` directly from a screen.** All DB access goes through `lib/api.ts`.
2. **Never use `StyleSheet.create`.** All styling is NativeWind `className` props only.
3. **Never add a screen outside `app/`.** Expo Router requires file-based routing.
4. **Always use `npx expo install` for new packages**, not `npm install`.
5. **The debt engine (`lib/debt-engine.ts`) must stay pure** — no I/O, no Supabase calls inside it.
6. **Types live in `types/database.ts`.** Import from there; do not redeclare DB shapes inline.

---

## Tech Stack (quick reference)

- **Framework**: Expo 54 / React Native 0.81 / React 19
- **Routing**: Expo Router v6 (file-based, `app/` directory)
- **Backend**: Supabase (Postgres + Auth + Row Level Security)
- **Styling**: NativeWind 4 — Tailwind utility classes via `className`
- **Language**: TypeScript (strict mode)
- **Animations**: react-native-reanimated (`FadeInDown`, `FadeInUp`)
- **Icons**: Ionicons via `@expo/vector-icons`

---

## Key File Locations

```
app/(tabs)/index.tsx      ← Dashboard (balances, FAB, settle-up button)
app/(tabs)/friends.tsx    ← Friends & groups management
app/(tabs)/activity.tsx   ← Expense history feed
app/(tabs)/account.tsx    ← Profile settings, sign out
app/add-expense.tsx       ← Modal: create expense
app/settle-up.tsx         ← Modal: record payment
lib/api.ts                ← ALL Supabase read/write operations
lib/debt-engine.ts        ← Pure debt simplification algorithm
lib/supabase.ts           ← Supabase client singleton
types/database.ts         ← TypeScript types for every DB table
supabase_schema.sql       ← Full Postgres DDL + RLS policies
tailwind.config.js        ← Custom color tokens (background, surface, primary…)
```

---

## Color Tokens (Tailwind)

| Token | Hex | Use |
|---|---|---|
| `background` | `#0D0D12` | Screen backgrounds |
| `surface` | `#1A1A24` | Cards, tab bar |
| `primary` | `#FF4B4B` | CTAs, active tab, positive balance |
| `textPrimary` | `#FFFFFF` | Headings |
| `textSecondary` | `#A0A0AB` | Labels, subtitles |
| `accent` | `#262636` | Borders, dividers |

---

## What's Not Done Yet

See [docs/roadmap.md](./docs/roadmap.md) for the full list. The biggest gaps:

- Friend picker UI (needed by both add-expense and settle-up modals)
- `searchProfilesByEmail` is a stub — email not stored in `profiles`
- Settlements not factored into balance calculation
- Dashboard shows raw UUIDs instead of user names
- Group expense flows not built (schema ready, UI not)

---

## Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

Both are required. The app will fall back to placeholder strings and all DB calls will fail without them.
