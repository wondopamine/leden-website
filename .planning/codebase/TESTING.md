# Testing Patterns

**Analysis Date:** 2026-04-26

## Test Framework

**Status: NOT DETECTED**

This codebase has **zero testing infrastructure**. No test runner, test files, or testing libraries found.

**No installations of:**
- Vitest
- Jest
- Playwright
- Cypress
- React Testing Library
- Testing Library DOM
- Any assertion library (Chai, Expect, etc.)

**No configuration files:**
- `vitest.config.ts/js`
- `jest.config.js`
- `playwright.config.ts`
- `cypress.config.ts`

**No test files:**
- Zero `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx` files anywhere in codebase
- No `__tests__` directories
- No `tests/` directory

## CI/CD Configuration

**Status: NOT DETECTED**

No continuous integration pipeline configured:
- No `.github/workflows/` directory
- No `.gitlab-ci.yml`
- No `azure-pipelines.yml`
- No Makefile with test commands
- No pre-commit hooks that run tests

**Package.json scripts:**
Only development and build commands present:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

No `test`, `test:watch`, `test:coverage`, or `ci` scripts.

## Testing GAP — Critical Issue

**This is a production codebase with zero automated tests.**

### What's Not Being Tested

**Critical Business Logic (at risk):**
- Order validation logic (`src/app/api/order/route.ts`, lines 34-107)
  - Business hours validation with edge cases (closed days, timezone handling)
  - Item availability checks against database
  - Price verification from database
  - Phone number validation regex
  - Tax calculation (GST + QST rates)
- Cart state management (`src/lib/cart-store.ts`)
  - Item add/remove/update operations
  - Tax calculation functions
  - Customer info persistence
  - Cart total computations
- Form submissions in admin panel (`src/components/admin/menu-item-form.tsx`)
  - File upload handling
  - Form validation before submission
  - Error handling on API failures

**Components Without Tests:**
- All UI components (`src/components/ui/*`) - no coverage
- Layout components (`src/components/layout/*`) - no coverage
- Admin components (`src/components/admin/*`) - no coverage
- Order/menu components - no coverage

**API Routes Without Tests:**
- `/api/order` (POST) - accepts customer orders, validates, persists to Supabase, sends emails
- `/api/upload-menu-image` - file upload endpoint (permissions unknown)

**External Integrations Not Verified:**
- Supabase client initialization and queries
- Resend email API integration
- Sanity CMS data fetching
- Google Places API integration

### Current Risks

1. **Silent failures** - Order validation bugs would hit production users
2. **Regression prone** - Refactoring any core logic (cart, validation) has no safety net
3. **Deploys unverified** - No automated checks before pushing to production
4. **Data inconsistencies** - Tax rate changes, price updates could silently break orders
5. **Integration issues** - External service failures (Supabase, Resend) have no test coverage

## Recommended Testing Strategy

### Phase 1: Unit Tests (Highest ROI)
**Start with:** `src/lib/cart-store.ts` and `src/app/api/order/route.ts`

**Framework recommendation:** Vitest (Next.js native, fast, minimal config)

**Installation:**
```bash
npm install -D vitest @vitest/ui happy-dom
```

**Test file locations (suggest):**
- `src/lib/cart-store.test.ts` - co-locate with implementation
- `src/app/api/order/order.validation.test.ts` - test pure validation functions
- `src/lib/utils.test.ts` - utility functions

**Example test structure (cart-store):**
```typescript
import { describe, it, expect } from 'vitest';
import { useCartStore } from '@/lib/cart-store';

describe('Cart Store', () => {
  it('should calculate subtotal correctly', () => {
    // Test tax calculations with known values
  });
  
  it('should handle item quantity updates', () => {
    // Test add, remove, update
  });
});
```

### Phase 2: Integration Tests
**Framework:** Vitest + Supabase local (if available)
**Target:** Order API route with mocked Supabase

```typescript
describe('POST /api/order', () => {
  it('should validate phone number format', async () => {
    const res = await POST(mockRequest({ phone: '12' }));
    expect(res.status).toBe(400);
  });
  
  it('should calculate taxes correctly', async () => {
    // Test with real tax rates, verify response total
  });
});
```

### Phase 3: E2E Tests
**Framework:** Playwright (if needed for user flows)
**Target:** Order placement end-to-end
```bash
npm install -D @playwright/test
```

## Current Lint-Only Verification

**Only automated check in place:** ESLint

Run manually:
```bash
npm run lint
```

Covers:
- Next.js-specific issues (image elements, server function rules)
- TypeScript type errors (via strict tsconfig)
- Code style consistency

**This is NOT sufficient for testing application logic.**

## Setting Up Testing (Quick Start)

**Step 1: Install Vitest**
```bash
npm install -D vitest @vitest/ui happy-dom
```

**Step 2: Create `vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
  },
});
```

**Step 3: Add test script to `package.json`**
```json
"scripts": {
  "test": "vitest",
  "test:watch": "vitest --watch",
  "test:coverage": "vitest --coverage"
}
```

**Step 4: Create first test**
```bash
touch src/lib/cart-store.test.ts
```

## Test File Locations (Recommended Structure)

```
src/
├── lib/
│   ├── cart-store.ts
│   ├── cart-store.test.ts          # ← Unit test
│   ├── utils.ts
│   └── utils.test.ts               # ← Unit test
├── app/
│   └── api/
│       └── order/
│           ├── route.ts
│           ├── validation.ts       # ← Extract functions
│           └── validation.test.ts  # ← Unit test
└── components/
    └── admin/
        ├── menu-item-form.tsx
        └── __tests__/
            └── menu-item-form.test.tsx  # ← Component test
```

Prefer **co-located tests** (same directory as source) over `__tests__/` directories.

## What Should Be Tested First (Priority Order)

1. **Tax calculations** - `useCartStore().getTax()` - financial correctness required
2. **Order validation** - `validatePhone()`, `validateItems()`, `validateBusinessHours()` - catches bad data early
3. **Cart operations** - add/remove/update items - core user interaction
4. **API error responses** - 400 vs 500 status codes - user-facing messaging
5. **Component interactions** - form submission, modal state (lower priority, harder to test)

---

*Testing analysis: 2026-04-26*

## Summary

**CRITICAL GAP:** Production application with zero automated tests. Business-critical order processing logic has no test coverage. Immediate recommendation: Install Vitest and create unit tests for `cart-store.ts` and order validation functions before adding new features.
