# Coding Conventions

**Analysis Date:** 2026-04-26

## Naming Patterns

**Files:**
- UI components: kebab-case (e.g., `button.tsx`, `dropdown-menu.tsx`, `announcement-banner.tsx`)
- Hooks: kebab-case with `use-` prefix (e.g., `use-fade-in.ts`)
- Server actions and utilities: kebab-case (e.g., `actions.ts`, `google-places.ts`, `menu-images.ts`)
- Store files: kebab-case (e.g., `cart-store.ts`)
- Type definition files inherit from their purpose (e.g., `types.ts` in `src/lib/sanity/types.ts`)

**Functions and Components:**
- React components: PascalCase (e.g., `Header`, `MenuContent`, `MenuItemForm`, `Button`)
- Regular functions: camelCase (e.g., `validateBusinessHours`, `validateItems`, `getLocalizedString`, `formatPrice`)
- Event handlers: camelCase with `handle` prefix (e.g., `handleImageUpload`, `handleItemAdded`, `handleClickOutside`)
- Store actions: camelCase (e.g., `addItem`, `removeItem`, `updateQuantity`, `setCustomerInfo`)
- Custom hooks: camelCase starting with `use` (e.g., `useFadeIn`, `useCartStore`, `useTranslations`)

**Variables and Constants:**
- Local variables: camelCase (e.g., `subtotal`, `taxGst`, `orderNumber`, `imageUrl`)
- Component props: camelCase (e.g., `categories`, `items`, `locale`, `isVisible`)
- State management: camelCase (e.g., `activeCategory`, `selectedItem`, `uploading`, `isPending`)
- Constants: UPPER_SNAKE_CASE (e.g., `GST_RATE`, `QST_RATE`, `NEXT_PUBLIC_SUPABASE_URL`)

**Types:**
- Type names: PascalCase (e.g., `CartItem`, `CartItemModifier`, `OrderItem`, `OrderBody`, `MenuItem`, `Category`)
- Type file exports: `type` prefix not used in type name, just the name itself (e.g., `type CartState`, `type CustomerInfo`)
- Inline types in props: Omit patterns used (e.g., `Omit<CartItem, "id">`)

## Code Style

**Formatting:**
- No explicit Prettier config detected; follows Next.js/TypeScript defaults
- Indentation: 2 spaces (consistent across all files)
- Line length: Appears to target reasonable lengths with wrapped lines in complex JSX
- Semicolons: Required (used consistently)
- Quotes: Double quotes for strings (no single quotes detected)
- Trailing commas: Used in objects and arrays

**Linting:**
- ESLint configured via `eslint.config.mjs` (new flat config format)
- Extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Key rules enforced:
  - `@next/next/no-img-element` disabled where justified (see `header.tsx` line 55 comment)
  - Explicit `@typescript-eslint/no-explicit-any` disables used sparingly when type safety waived (see `route.ts` lines 33, 43, 76)

## TypeScript Strictness

**Configuration (`tsconfig.json`):**
- `"strict": true` - Full strict mode enabled
- `"noEmit": true` - Type checking without emitting
- `"isolatedModules": true` - Each file treated as separate module
- `"jsx": "react-jsx"` - Modern React 19 JSX transform
- `"target": "ES2017"` - Target ES2017 compatibility
- `"moduleResolution": "bundler"` - Bundler module resolution strategy
- `"skipLibCheck": true` - Skip type checking of declaration files

**Enforcement:**
- Explicit type annotations required for function parameters and return types in API routes (see `route.ts` line 77 and 116)
- Type imports used where available (e.g., `import type { MenuItem, Category }` in `menu-content.tsx` line 18)
- Type guards for union/unknown types (e.g., line 44 in `route.ts` casts with assertions)

## Import Organization

**Order (observed pattern):**
1. React/Next.js core imports (`import { useState, useRef } from "react"`)
2. Next.js-specific imports (`import { useTranslations } from "next-intl"`, `import { Link, useRouter }`)
3. Local utility/lib imports (`import { useCartStore }`, `import { cn }`)
4. Component imports (`import { Button } from "@/components/ui/button"`)
5. Type imports separated (e.g., `import type { MenuItem, Category }`)
6. Icon imports last (`import { Plus, Trash2, Upload }`)

**Path Aliases:**
- `@/*` maps to `./src/*` (declared in `tsconfig.json`)
- Used consistently throughout codebase (e.g., `@/components/ui/button`, `@/lib/cart-store`, `@/i18n/navigation`)
- No relative imports (`../`) used in samples reviewed

**Example (from `menu-content.tsx`):**
```typescript
"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/lib/cart-store";
import { getLocalizedString, formatPrice } from "@/lib/utils/format";
import { getItemImageUrl } from "@/lib/menu-images";
import type { MenuItem, Category } from "@/lib/sanity/types";
```

## Component Patterns

**Server vs Client Components:**
- Client components marked with `"use client"` directive at top of file (e.g., `button.tsx`, `header.tsx`, `menu-content.tsx`, `menu-item-form.tsx`)
- Directive appears universally across interactive/stateful components
- No "use server" detected (actions appear to be server functions in app directory)

**Client Component Structure:**
- Props receive types via Props interface (e.g., `type Props = { categories: Category[]; items: MenuItem[]; locale: string }`)
- Default exports or named exports both used (Button exports named: `export { Button, buttonVariants }`)
- Hooks called at top level before JSX returns
- Inline state for UI-only concerns (e.g., modal open state, form inputs)
- Complex state logic delegated to Zustand stores (`useCartStore`)

**UI Component API:**
- Use CVA (class-variance-authority) for component variants (see `button.tsx` lines 8-43)
- Variants support `variant` and `size` props with defaults
- Merged classNames via `cn()` utility combining clsx + tailwind-merge
- Data attributes used for styling hooks (e.g., `data-slot="button"`, `aria-` attributes for accessibility)

## Styling Approach

**Tailwind CSS:**
- All styling inline via Tailwind classes (no external CSS files detected)
- Config: `tailwindcss` v4 with `@tailwindcss/postcss` plugin
- No CSS modules or styled-components
- Dark mode supported (classes like `dark:hover:bg-input/50`)
- Custom design tokens implied (e.g., `--radius-md`, CSS variables for colors)

**Class Composition:**
- Classes extracted conditionally in template literals (e.g., `header.tsx` lines 51-56)
- `cn()` utility merges conflicting Tailwind classes using `tailwind-merge`
- CVA (class-variance-authority) used for component variants instead of manual conditionals
- Responsive design via Tailwind breakpoints (`hidden md:flex`)

**Example (from `header.tsx`):**
```tsx
<header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
  <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
```

## Error Handling

**API Route Pattern (from `route.ts`):**
- Validation-first approach: check inputs before database operations
- Returns `NextResponse.json()` with error object and HTTP status code
- Example error responses:
  ```typescript
  return NextResponse.json({ error: "No items in order" }, { status: 400 });
  return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  ```
- Specific error messages returned to client (e.g., "Phone number is required", "Price has changed")
- Try-catch wrapping entire POST handler with generic fallback (lines 269-275)
- Logging via `console.error()` for server-side issues (e.g., database save failures)

**Async Operations (in client components):**
- `useTransition()` hook for async state (e.g., `const [isPending, startTransition] = useTransition()` in `menu-item-form.tsx`)
- Toast notifications via `sonner` package for user feedback (e.g., `toast.error()`, implicit in form patterns)
- `alert()` fallback for upload errors (line 80 in `menu-item-form.tsx`)

**Type Safety in Error Contexts:**
- Explicit any casts when Supabase types unavailable (lines 33, 43, 76 in `route.ts`)
- Comments justify disabling rules: `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
- Return `null` to indicate "couldn't validate" scenarios (e.g., line 41: `if (!cafeInfo) return null`)

## Form Handling

**Client-Side Forms:**
- Controlled components with state (e.g., `const [available, setAvailable] = useState()`)
- Zustand store used for cross-component form data (cart, customer info)
- Server actions passed as async functions (e.g., `action: (formData: FormData) => Promise<void>`)
- `useTransition()` for managing async submission state (prevents duplicate submits)
- File uploads via FormData + fetch to API route (lines 73-76 in `menu-item-form.tsx`)

**Store-Based Form State (from `cart-store.ts`):**
```typescript
setCustomerInfo: (info) => {
  set((state) => ({
    customerInfo: { ...state.customerInfo, ...info },
  }));
},
```

## Validation Patterns

**Input Validation (from `route.ts`):**
- Phone number: regex digits extraction + length check (lines 109-112)
- Business hours: string parsing and time range validation (lines 54-73)
- Database validation: price comparison with floating-point tolerance (line 102)
- Trim whitespace on strings: `customerInfo.name.trim()`

**Type-Level Validation:**
- TypeScript strict mode catches missing properties
- Type aliases define expected shapes (e.g., `OrderItem`, `OrderBody`, `CartState`)

## Comments and Documentation

**When to Comment:**
- Line 55 in `header.tsx`: ESLint rule disable with reason
- Lines 33, 43 in `route.ts`: TypeScript any-cast justifications
- Inline comments sparse; code is self-documenting via naming
- No JSDoc observed (functions self-evident from types)

**Observed Style:**
- Minimal comments (preferred: clear naming)
- Comments for non-obvious ESLint/TypeScript workarounds only

## Logging

**Framework:** `console` object (no logging library)

**Patterns:**
- `console.error()` for failures (database saves, API calls)
- `console.log()` for informational events (order submission)
- Example (from `route.ts` lines 264-266):
  ```typescript
  console.log(
    `[Order ${orderNumber}] ${customerInfo.name} (${customerInfo.phone}) — Pickup: ${pickupTime || "ASAP"} — $${total.toFixed(2)}`
  );
  ```

---

*Convention analysis: 2026-04-26*
