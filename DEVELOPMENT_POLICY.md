# Development Policy: Zero Initiative & Visual Freeze

## 🚫 Core Constraint: No Visual Changes
**You are strictly forbidden from modifying the frontend visually.**

1.  **UI/UX Staticity**: The visual design, layout, spacing, colors, and animations are considered FINAL. Do not change CSS, Tailwind classes, or HTML structures that impact the visual representation.
2.  **No "AI Improvements"**: Never attempt to "improve", "polish", or "beautify" the interface. Even if you think a change would look better, it is a violation of this policy.
3.  **Strict Parity**: All work must maintain 100% visual parity with the existing state or the provided reference screenshots/scraped code.

## 🛠️ Allowed Actions
1.  **Backend Integration**: Writing Supabase hooks, database queries, and connecting existing UI elements to real data.
2.  **Logic & State**: Managing Zustand stores, form validation logic, and event handling, provided they do not alter the appearance.
3.  **Bug Fixes**: Fixing functional bugs (e.g., a button not clicking, a form not submitting).
4.  **Documentation**: Updating `.md` files or internal guides.

## ⚠️ Violation Protocol
If a requested logic change *requires* a visual change (e.g., adding a new field that isn't in the design), you **MUST** ask for explicit permission before touching any CSS/Layout code.

---
*Applied: 2026-04-09*
