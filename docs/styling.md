# Design System & Styling Guide

Spends uses **NativeWind 4** — Tailwind CSS utility classes in React Native via `className` props. There are **no** `StyleSheet.create` calls in this codebase. All styling must use Tailwind classes.

---

## Setup

NativeWind requires three things (already configured):

1. **`babel.config.js`** — `nativewind/babel` preset and `jsxImportSource: 'nativewind'`.
2. **`metro.config.js`** — `withNativeWind(config, { input: './global.css' })`.
3. **`global.css`** — imported in `app/_layout.tsx` to activate Tailwind.

If you add a new entry-point layout, import `global.css` at the top of that file too.

---

## Color Palette

Defined in `tailwind.config.js` under `theme.extend.colors`:

| Token | Hex | Usage |
|---|---|---|
| `background` | `#0D0D12` | App/screen background |
| `surface` | `#1A1A24` | Cards, tab bar, modals |
| `primary` | `#FF4B4B` | CTAs, active state, positive balance |
| `textPrimary` | `#FFFFFF` | Headings, primary text |
| `textSecondary` | `#A0A0AB` | Labels, subtitles, empty states |
| `accent` | `#262636` | Borders, dividers, subtle highlights |

**Usage in className**:
```tsx
<View className="bg-background">
  <View className="bg-surface border border-accent rounded-2xl">
    <Text className="text-textPrimary font-bold">Hello</Text>
    <Text className="text-textSecondary">subtitle</Text>
    <TouchableOpacity className="bg-primary">...</TouchableOpacity>
  </View>
</View>
```

In addition to custom tokens, standard Tailwind colors are also available:
- `text-white`, `text-red-500`, `bg-green-500` are used in the codebase.
- Prefer custom tokens over raw Tailwind colors for consistency.

---

## Typography

No custom font is configured — the app uses the system default font (San Francisco on iOS, Roboto on Android).

| Class pattern | Use |
|---|---|
| `text-3xl font-bold` | Page headings (`Dashboard`, section titles) |
| `text-4xl font-extrabold` | Large balance figures |
| `text-lg font-bold` | Section sub-headings ("You are owed") |
| `text-base font-medium` | Body text, list items |
| `text-textSecondary` | Secondary / helper text |
| `text-xs` | Small labels (e.g., tab bar labels) |

---

## Spacing

The app follows a 4-unit base grid (Tailwind default: 1 unit = 4px).

| Class | Value |
|---|---|
| `p-4` | 16px padding — standard card padding |
| `p-6` | 24px padding — outer screen padding |
| `mb-2` | 8px bottom margin — between list items |
| `mb-4` | 16px margin |
| `mb-6` | 24px margin — between sections |
| `mt-4`, `mt-8` | Top margin for screen content below header |

---

## Border Radius

| Class | Value | Use |
|---|---|---|
| `rounded-lg` | 8px | Small elements (buttons, inputs) |
| `rounded-xl` | 12px | Cards, list items |
| `rounded-2xl` | 16px | Large cards (balance card) |
| `rounded-full` | 50% | Circular elements (FAB, avatar) |

---

## Card Pattern

Used for the balance card, list items, and modals:

```tsx
<View className="bg-surface p-4 rounded-xl border border-accent mb-2">
  <Text className="text-white font-medium">Card content</Text>
</View>
```

For the primary balance card (more prominent):
```tsx
<View className="bg-surface p-6 rounded-2xl border border-accent shadow-lg">
  ...
</View>
```

---

## Buttons

### Primary CTA
```tsx
<TouchableOpacity className="bg-primary py-3 px-6 rounded-xl items-center">
  <Text className="text-white font-bold text-lg">Action</Text>
</TouchableOpacity>
```

### Secondary / Outline
```tsx
<TouchableOpacity className="border border-accent py-3 px-6 rounded-xl items-center">
  <Text className="text-textSecondary font-medium">Cancel</Text>
</TouchableOpacity>
```

### Destructive (sign out)
```tsx
<TouchableOpacity className="bg-primary/20 py-3 px-6 rounded-xl items-center border border-primary/30">
  <Text className="text-primary font-bold">Sign Out</Text>
</TouchableOpacity>
```

### Floating Action Button (FAB)
```tsx
<TouchableOpacity className="absolute bottom-6 right-6 bg-primary w-16 h-16 rounded-full items-center justify-center shadow-lg">
  <Text className="text-white text-3xl font-light leading-none mb-1">+</Text>
</TouchableOpacity>
```

---

## Text Inputs

```tsx
<TextInput
  className="bg-accent text-white p-4 rounded-xl text-base border border-accent"
  placeholder="Enter value..."
  placeholderTextColor="#A0A0AB"
/>
```

Always pass `placeholderTextColor="#A0A0AB"` (textSecondary hex) since NativeWind cannot style placeholder text via className.

---

## Animations

Screens use `react-native-reanimated` for entry animations:

```tsx
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

// Card slides in from below
<Animated.View entering={FadeInDown.duration(600).springify()}>
  ...
</Animated.View>

// Content slides in from above
<Animated.View entering={FadeInUp.duration(400)}>
  ...
</Animated.View>
```

Keep animations subtle — use only on hero elements (balance card, primary content blocks), not on individual list items.

---

## Screen Layout Pattern

Every screen follows the same outer shell:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background p-6">
      {/* Header row */}
      <View className="flex-row justify-between items-center mt-4">
        <Text className="text-white text-3xl font-bold">Screen Title</Text>
      </View>

      {/* Scrollable content */}
      <ScrollView className="mt-8 flex-1" showsVerticalScrollIndicator={false}>
        ...
      </ScrollView>
    </SafeAreaView>
  );
}
```

- Always use `SafeAreaView` from `react-native-safe-area-context` (not the built-in one).
- `flex-1 bg-background` on the root view.
- `p-6` for outer screen padding.
- `mt-4` below the header text to create breathing room.

---

## Tab Bar

Configured in `app/(tabs)/_layout.tsx`:

```typescript
tabBarStyle: { backgroundColor: '#1A1A24' }
tabBarActiveTintColor: '#FF4B4B'
tabBarInactiveTintColor: '#A0A0AB'
tabBarShowLabel: false   // icons only
```

---

## Icons

Use **Ionicons** from `@expo/vector-icons`:

```tsx
import { Ionicons } from '@expo/vector-icons';

<Ionicons name="person" size={24} color="#FFFFFF" />
<Ionicons name="people" size={24} color="#A0A0AB" />
<Ionicons name="pie-chart" size={24} color="#FF4B4B" />
<Ionicons name="receipt" size={24} color="#FFFFFF" />
```

Icon names follow the Ionicons naming convention. Browse all icons at [ionic.io/ionicons](https://ionic.io/ionicons).

---

## Dark Mode

The app is dark-mode-only by default. There is a dark mode toggle in the Account screen, but it does not currently apply any changes. When implementing it:
- Store the preference in AsyncStorage.
- Use a React Context to propagate the theme.
- Switch between a dark and light Tailwind config (or use NativeWind's `dark:` variant with a class on the root view).
