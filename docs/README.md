# Spends — Project Documentation

**Spends** is a mobile expense-splitting app built with Expo and React Native. Users can track shared expenses with friends, split costs, and settle debts. The app computes a minimal number of transactions needed to settle all balances using an optimized debt-simplification algorithm.

---

## Documentation Index

| File | Contents |
|---|---|
| [overview.md](./overview.md) | Tech stack, project structure, high-level architecture |
| [setup.md](./setup.md) | Local setup, environment variables, running the app |
| [screens.md](./screens.md) | Screen-by-screen feature breakdown |
| [database.md](./database.md) | Supabase schema, RLS policies, triggers |
| [api.md](./api.md) | All API functions and data-flow patterns |
| [debt-engine.md](./debt-engine.md) | Debt simplification algorithm (deep dive) |
| [styling.md](./styling.md) | Design system — colors, typography, component patterns |
| [roadmap.md](./roadmap.md) | Known gaps, planned features, extension points |

---

## Quick Reference

### Running the app
```bash
npx expo start
```

### Key environment variables
```
EXPO_PUBLIC_SUPABASE_URL=<your-project-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### Tech stack at a glance
- **Framework**: Expo 54 / React Native 0.81 / React 19
- **Routing**: Expo Router v6 (file-based)
- **Backend**: Supabase (Postgres + Auth + RLS)
- **Styling**: NativeWind 4 (Tailwind CSS for React Native)
- **Language**: TypeScript

### Folder structure
```
app/          ← Expo Router pages (screens)
lib/          ← Business logic (Supabase client, API, debt engine)
types/        ← TypeScript types for the database schema
assets/       ← Images, icons, splash
docs/         ← This documentation
```

---

## For AI Agents

When making changes to this project, always:

1. Read [overview.md](./overview.md) first to understand architecture decisions.
2. Check [database.md](./database.md) before touching Supabase queries — RLS policies are strict.
3. Follow the NativeWind-only styling convention described in [styling.md](./styling.md). Do **not** use `StyleSheet.create`.
4. All new screens go in `app/` using the Expo Router file-based convention described in [screens.md](./screens.md).
5. All data access must go through `lib/api.ts` — never call `supabase` directly from a screen file.
6. The debt engine in `lib/debt-engine.ts` must remain pure (no Supabase calls inside it).
