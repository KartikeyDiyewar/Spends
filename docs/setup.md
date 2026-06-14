# Setup & Development Guide

## Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 18+ |
| npm or yarn | any recent version |
| Expo CLI | installed globally or via `npx` |
| iOS Simulator (optional) | Xcode 14+ on macOS |
| Android Emulator (optional) | Android Studio |
| Expo Go app (optional) | latest on physical device |

---

## 1. Clone and Install

```bash
git clone https://github.com/kartikeydiyewar/spends.git
cd spends
npm install
```

---

## 2. Supabase Project Setup

You need a Supabase project. Create one at [supabase.com](https://supabase.com) (free tier is sufficient).

### Apply the database schema

In the Supabase Dashboard → SQL Editor, run the entire contents of `supabase_schema.sql`. This creates all tables, RLS policies, and the profile auto-creation trigger.

### Get your credentials

From Supabase Dashboard → Settings → API:
- **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
- **anon / public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## 3. Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Important**: Variables must be prefixed with `EXPO_PUBLIC_` to be available in the Expo client bundle. Never put secret keys (service role key) in this file.

The Supabase client reads these in `lib/supabase.ts`:
```typescript
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
```

---

## 4. Running the App

```bash
# Start Metro bundler and show QR code
npx expo start

# Run on iOS Simulator directly
npx expo run:ios

# Run on Android Emulator directly
npx expo run:android

# Run in browser (limited — React Native Web)
npx expo start --web
```

Scan the QR code with the **Expo Go** app on your phone for the fastest dev loop.

---

## 5. Key Configuration Files

### `app.json`
```json
{
  "expo": {
    "name": "Spends",
    "slug": "spends",
    "scheme": "spends",
    "version": "1.0.0",
    "orientation": "portrait",
    "plugins": ["expo-router"]
  }
}
```
- `scheme` is required for deep linking and Expo Router.
- `orientation: "portrait"` — do not change; layouts are not designed for landscape.

### `babel.config.js`
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```
NativeWind requires its Babel preset to transform `className` props at build time.

### `metro.config.js`
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```
NativeWind wraps the Metro config to process the Tailwind CSS file.

### `tailwind.config.js`
```js
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background:    '#0D0D12',
        surface:       '#1A1A24',
        primary:       '#FF4B4B',
        textPrimary:   '#FFFFFF',
        textSecondary: '#A0A0AB',
        accent:        '#262636',
      },
    },
  },
};
```

### `tsconfig.json`
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```
Strict mode is on — all types must be explicit.

---

## 6. Supabase Auth Configuration

By default this project expects email confirmation to be **disabled** (for quick development). In the Supabase Dashboard:

- Authentication → Providers → Email → disable "Confirm email"

If you want email confirmation, you'll need to handle the `email_confirmed` state in the auth screens.

---

## 7. Adding a New Dependency

```bash
npx expo install <package-name>
```

Always use `npx expo install` instead of `npm install` for React Native packages — it pins the version compatible with the current Expo SDK.

---

## 8. TypeScript

```bash
npx tsc --noEmit
```

Run this to check for type errors without building. The project uses strict TypeScript throughout.
