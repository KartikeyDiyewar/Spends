# Roadmap & Known Gaps

This document tracks features that are partially implemented or planned, and describes the exact steps to complete each one. It is intended for AI agents and developers picking up the project.

---

## Status Legend

| Symbol | Meaning |
|---|---|
| ✅ | Complete and working |
| 🔧 | Partially implemented / UI present, logic missing |
| ❌ | Not started |

---

## Core Features

### ✅ Authentication (Email + Password)
- Sign up, sign in, sign out — fully working.
- Auto-create `profiles` row via DB trigger on signup.
- Session persisted in AsyncStorage.

### ✅ Dashboard Balances
- Net balance calculated from Supabase data.
- Debt simplification engine producing minimal transactions.
- Refetches on tab focus.

### ✅ Activity Feed
- Shows expenses the user paid and expenses they were split into.
- Sorted newest first.

### 🔧 Add Expense Modal
**What exists**: Description input, amount input, split type selector (equal/exact/percent) UI.

**What's missing**:
1. **Friend/group picker** — the "Select Friend or Group" button is a stub. Needs a bottom sheet or modal that lists the user's friends (from `getFriends`) and groups (from Supabase), lets the user select one, and stores the selection in state.
2. **Split calculation** — once a payer and participants are known, calculate `amount_owed` per person based on `splitType`:
   - `equal`: `amount / participantCount` for each participant.
   - `exact`: show one input per participant, validate sum == total.
   - `percent`: show one `%` input per participant, validate sum == 100.
3. **Call `addExpense`** with the computed splits array.
4. **Navigate back** on success and refresh the dashboard.

**Files to touch**: `app/add-expense.tsx`, potentially a new `components/FriendPicker.tsx`.

---

### 🔧 Settle Up Modal
**What exists**: Amount input UI.

**What's missing**:
1. **Friend picker** — same as above, needs a friend selection UI.
2. **Call settlement insert** — add a `createSettlement(payerId, payeeId, amount)` function to `lib/api.ts` that inserts into the `settlements` table.
3. **Navigate back** on success and refresh the dashboard.

**Files to touch**: `app/settle-up.tsx`, `lib/api.ts`.

---

### 🔧 Friends Screen
**What exists**: Tab UI (Friends / Groups), "Add Friend" modal with email input, "Create Group" modal with name input.

**What's missing**:
1. **Friend search by email** — `searchProfilesByEmail` in `lib/api.ts` is a stub. Implement it using a Supabase Edge Function or by adding `email` to the `profiles` table.
2. **Render friend list** — call `getFriends(userId)` and render the results.
3. **Send friend request / accept** — wire up the "Send Request" button to call `addFriend`.
4. **Pending requests** — query `friends WHERE user_id_2 = userId AND status = 'pending'` and show accept/reject buttons.
5. **Create Group** — call Supabase to insert into `groups` and `group_members`.
6. **Render group list** — query groups the user belongs to and display them.

---

### 🔧 Settle Up in Activity Feed
**What exists**: `getActivityForUser` fetches expenses but not settlements.

**What's missing**:
- Query the `settlements` table in `getActivityForUser` and merge settlement items into the activity feed with `type: 'settlement'`.

---

### 🔧 Profile Name Resolution in Dashboard
**What exists**: Dashboard shows raw UUIDs for debtors/creditors.

**What's missing**:
- After calling `simplifyDebts`, collect all unique user IDs and batch-fetch their profiles.
- Replace UUIDs with `full_name` in the rendered list.

---

### ❌ Push Notifications
The toggle exists in the Account screen but does nothing.

To implement:
1. `npx expo install expo-notifications`.
2. Register for push token on the account screen toggle.
3. Store token in a new `push_tokens` Supabase table.
4. Create a Supabase Edge Function that sends notifications when an expense is added or settled.

---

### ❌ Avatar Upload
`avatar_url` column exists in `profiles` but is never set from the app.

To implement:
1. `npx expo install expo-image-picker`.
2. Add avatar tap handler in `app/(tabs)/account.tsx`.
3. Upload to Supabase Storage bucket.
4. Update `profiles.avatar_url` with the public URL.

---

### ❌ Group Expenses
The schema supports groups, but no group expense flows are built.

To implement:
1. Complete the "Create Group" flow (Friends screen).
2. In Add Expense modal, allow selecting a group.
3. Auto-populate all group members as split participants.
4. Show group balances on the dashboard.

---

### ❌ Expense Detail View
Tapping an activity item does nothing. Should navigate to an expense detail screen showing all splits and who has settled.

---

### ❌ Dark/Light Mode Toggle
The toggle in Account settings updates local state but does not persist or apply theming.

---

### ❌ Settlements in Balance Calculation
`getAllDebtsForUser` only queries expenses/splits. It should also query `settlements` and offset balances accordingly, so settled payments reduce the displayed balances.

**Files to touch**: `lib/api.ts → getAllDebtsForUser`.

---

## Technical Debt

### Expense Insert Is Not Transactional
`addExpense` does two sequential inserts (expense, then splits). If the splits insert fails, a ghost expense row remains. Fix: move to a Supabase RPC (stored procedure) that wraps both inserts in a Postgres transaction.

### `searchProfilesByEmail` Is a Stub
The `profiles` table has no `email` column. Either add one and populate via trigger, or write a Supabase Edge Function to query `auth.users`.

### Raw UUIDs in UI
Dashboard shows `From <uuid>` instead of `From Jane`. Fix: batch-fetch profiles after `simplifyDebts` and pass a `names: Record<string, string>` map to the render.

### No Error UI on API Failures
API errors are silently logged. Add user-facing error toasts or inline error messages.

### No Loading Skeletons
Screens show blank content while data loads. Add skeleton placeholders or a loading spinner.

---

## Suggested Implementation Order

For a developer or agent starting from scratch on the remaining features:

1. **Profile name resolution** in dashboard (small, high impact).
2. **Settlements in balance calculation** in `getAllDebtsForUser`.
3. **Friend list rendering** on friends screen.
4. **Friend search by email** (requires schema or edge function decision).
5. **Friend picker component** (shared between add-expense and settle-up).
6. **Complete add-expense flow** (equal split first, then exact/percent).
7. **Complete settle-up flow**.
8. **Settlements in activity feed**.
9. **Group creation and expense flow**.
10. **Push notifications** (requires Supabase Edge Function setup).
