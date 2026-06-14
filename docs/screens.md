# Screens Reference

All screens live in the `app/` directory and follow Expo Router's file-based conventions. This document describes every screen: its purpose, state, navigation, and key implementation details.

---

## Root Layout — `app/_layout.tsx`

**Type**: Stack navigator (root)  
**Role**: Wraps the entire app. Hosts the `Stack` with two named groups: `(auth)` and `(tabs)`, plus two modal routes.

Key Stack screen options:
```
(auth)       → headerShown: false
(tabs)       → headerShown: false
add-expense  → presentation: 'modal', title: 'Add Expense'
settle-up    → presentation: 'modal', title: 'Settle Up'
```

No session-guard logic lives here — routing is handled per-screen using `useEffect` + `supabase.auth.getSession()`.

---

## Landing Screen — `app/index.tsx`

**Route**: `/`  
**Purpose**: Entry point. Checks auth session and redirects accordingly.

**State**:
- No local state.

**Behavior**:
- On mount, calls `supabase.auth.getSession()`.
- If session exists → `router.replace('/(tabs)')`.
- If no session → renders the landing UI.

**Landing UI elements**:
- App name / branding text.
- **"Get Started"** button → navigates to `/(auth)/sign-up`.
- **"I already have an account"** button → navigates to `/(auth)/sign-in`.

**When adding features**: If you add new onboarding steps, gate them here before the redirect.

---

## Sign Up — `app/(auth)/sign-up.tsx`

**Route**: `/(auth)/sign-up`  
**Purpose**: New user registration.

**State**:
```typescript
fullName: string
email: string
password: string
loading: boolean
error: string | null
```

**On submit**:
1. Calls `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`.
2. On success → `router.replace('/(tabs)')`.
3. On error → sets `error` state, shown in red below the form.

**Note**: The `full_name` passed as metadata is picked up by the database trigger `handle_new_user()` which auto-inserts a row into `profiles`. See [database.md](./database.md#triggers).

---

## Sign In — `app/(auth)/sign-in.tsx`

**Route**: `/(auth)/sign-in`  
**Purpose**: Returning user authentication.

**State**:
```typescript
email: string
password: string
loading: boolean
error: string | null
```

**On submit**:
1. Calls `supabase.auth.signInWithPassword({ email, password })`.
2. On success → `router.replace('/(tabs)')`.
3. On error → sets `error` state.

---

## Tab Layout — `app/(tabs)/_layout.tsx`

**Type**: Bottom tab navigator  
**Role**: Persistent bottom navigation bar shared across all tab screens.

**Tab configuration**:
| Tab | Icon | File |
|---|---|---|
| Dashboard | `pie-chart` (Ionicons) | `(tabs)/index.tsx` |
| Network | `people` (Ionicons) | `(tabs)/friends.tsx` |
| Activity | `receipt` (Ionicons) | `(tabs)/activity.tsx` |
| Account | `person` (Ionicons) | `(tabs)/account.tsx` |

**Tab bar styles**:
- Background: `#1A1A24` (surface color)
- Active tint: `#FF4B4B` (primary red)
- Inactive tint: `#A0A0AB` (textSecondary gray)
- No labels — icons only

---

## Dashboard — `app/(tabs)/index.tsx`

**Route**: `/(tabs)/` (default tab)  
**Purpose**: Shows net balance, money owed to user, money user owes, and quick actions.

**State**:
```typescript
netBalance: number       // positive = owed, negative = owes
debts: Debt[]            // simplified debt array from debt engine
session: Session | null
```

**Data loading**:
- `useEffect` fetches the session on mount.
- `useFocusEffect` (from expo-router) calls `fetchDebts()` every time the tab is focused — ensures balance is fresh after returning from a modal.

**`fetchDebts()` flow**:
```
getAllDebtsForUser(userId)      ← lib/api.ts
    → simplifyDebts(rawDebts)  ← lib/debt-engine.ts
    → setDebts(simplified)
    → compute netBalance
```

**UI sections**:

### Balance Card
- Shows `netBalance` formatted as `+$X.XX` (green) or `-$X.XX` (red).
- Status text: "You are owed money.", "You owe money.", or "You are all settled up!".
- **Settle Up** button → `router.push('/settle-up')`.
- Animated with `FadeInDown` from `react-native-reanimated`.

### "You are owed" list
- Debts where `creditor === currentUserId`.
- Shows debtor user ID (TODO: resolve to name) and amount in green.

### "You owe" list
- Debts where `debtor === currentUserId`.
- Shows creditor user ID (TODO: resolve to name) and amount in red.

### Floating Action Button (FAB)
- Positioned `absolute bottom-6 right-6`.
- `+` button → `router.push('/add-expense')`.

**Demo mode**: When `session` is null, an "Exit Demo" button appears in the header. The balance list shows empty state.

---

## Friends / Network — `app/(tabs)/friends.tsx`

**Route**: `/(tabs)/friends`  
**Purpose**: Manage friendships and groups.

**State**:
```typescript
activeTab: 'friends' | 'groups'
showAddFriend: boolean
showAddGroup: boolean
friendEmail: string
groupName: string
```

**UI**:

### Tab switcher
- "Friends" and "Groups" pills — updates `activeTab`.

### Friends tab
- Empty state with a placeholder (friend list not yet rendered from DB).
- **"+ Add Friend"** button → sets `showAddFriend: true`.

### Groups tab
- Empty state (group list not yet rendered from DB).
- **"+ Create Group"** button → sets `showAddGroup: true`.

### Add Friend Modal
- Text input for friend's email address.
- **"Send Request"** button → currently a stub; `addFriend` API call needs wiring here.
- Uses `KeyboardAvoidingView` for iOS/Android compatibility.

### Add Group Modal
- Text input for group name.
- **"Create"** button → stub.

**What needs implementation**: The friend/group lists are not fetched from Supabase yet. See [roadmap.md](./roadmap.md).

---

## Activity — `app/(tabs)/activity.tsx`

**Route**: `/(tabs)/activity`  
**Purpose**: Chronological log of all expenses involving the current user.

**State**:
```typescript
activities: ActivityItem[]
session: Session | null
```

**`ActivityItem` shape** (returned by `getActivityForUser`):
```typescript
{
  id: string
  type: 'expense' | 'settlement'
  text: string          // e.g. 'You paid for "Dinner"'
  amount: string        // e.g. '$45.00'
  date: string          // e.g. '6/14/2026'
  timestamp: number     // for sorting newest-first
}
```

**Data loading**:
- `useFocusEffect` → `getActivityForUser(userId)` from `lib/api.ts`.

**UI**:
- Flat list of activity rows, each showing icon (🍽️ for expenses, 💸 for settlements), text, amount, and date.
- Empty state if no activities.

---

## Account — `app/(tabs)/account.tsx`

**Route**: `/(tabs)/account`  
**Purpose**: View and edit user profile, manage preferences, sign out.

**State**:
```typescript
session: Session | null
profile: Profile | null
fullName: string          // editable field
loading: boolean
notifications: boolean    // toggle state (not persisted yet)
darkMode: boolean         // toggle state (not persisted yet)
```

**Data loading**:
- Session fetched on mount.
- `getProfile(userId)` called → populates `fullName`.

**Sections**:

### Profile Header
- Placeholder avatar (Ionicons `person` icon in a circle).
- Displays `profile.full_name` and user email from session.

### Profile Settings
- Editable `TextInput` for full name.
- **"Save Changes"** button → calls `supabase.from('profiles').update({ full_name })`.

### Preferences
- Notifications toggle (UI only, no push notification wiring yet).
- Dark mode toggle (UI only, app is always dark).

### Sign Out
- Calls `supabase.auth.signOut()` → `router.replace('/')`.

---

## Add Expense Modal — `app/add-expense.tsx`

**Route**: `/add-expense`  
**Presentation**: Modal (slides up over the current tab).  
**Purpose**: Create a new shared expense.

**State**:
```typescript
description: string
amount: string            // numeric string
splitType: 'equal' | 'exact' | 'percent'
saving: boolean
```

**UI elements**:
- **"Select Friend or Group"** button — stub, opens selection UI (not yet implemented).
- `TextInput` for description (multiline, large).
- `TextInput` for amount with `$` prefix, `keyboardType="decimal-pad"`.
- Split type selector: three buttons — Equal (`=`), Exact (`$`), Percent (`%`).
  - Selected type gets `bg-primary` background.
  - Info text below explains the selected mode.
- **"Save Expense"** button → calls `addExpense()` from `lib/api.ts`.
- **"Cancel"** text button → `router.back()`.

**What's missing**: Friend/group selection UI is a stub — the actual friend picker needs to be built. Without it, `addExpense` is called without splits. See [roadmap.md](./roadmap.md).

---

## Settle Up Modal — `app/settle-up.tsx`

**Route**: `/settle-up`  
**Presentation**: Modal.  
**Purpose**: Record that the current user has paid someone.

**State**:
```typescript
amount: string
saving: boolean
```

**UI elements**:
- **"Select Friend"** button — stub.
- `TextInput` for amount with `$` prefix.
- **"Record Payment"** button → should call a settlement insert via `lib/api.ts` (not yet fully wired).
- **"Cancel"** text button → `router.back()`.

**What's missing**: The settlement insert and friend selection. See [roadmap.md](./roadmap.md).
