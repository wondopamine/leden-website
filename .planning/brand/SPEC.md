# Cafe Le Den — Brand Expression Spec

**Locked:** 2026-05-02
**Consumed by:** Phase 1 tokens (Typography Decision → `--text-*`; Motion Decision → `--duration-*` / `--ease-*` in `src/app/globals.css`); Phases 3 + 4 page rebuilds reference all 5 Decisions as locked brand intent.

## Typography

DNA: Monte Cafe editorial display + Superr clean body. ![Monte Cafe sample](https://montecafe.com.au)
Concrete pairing — display serif for hero/h1; body sans for paragraph + UI; caption sans for labels and meta.
**Decision:** Display — "Editorial New" serif, weight 500, 56–64px / 1.05; H1–H3 — Editorial New 40 / 32 / 24px, weights 500/500/600; body — Inter sans 16px / 1.5; caption — Inter 13px / 1.4 weight 500; label — Inter 12px / 1.3 weight 600 uppercase tracking 0.05em.

## Photography

DNA: Graza warm/playful + Monte Cafe editorial. ![Graza imagery](https://graza.co)
Concrete style — warm-tone product + ambient cafe shots, natural light, mid-shadow, food-forward; no stock smiles, no Unsplash filler.
**Decision:** Warm-tone product photography on cream/forest backdrops; natural daylight, mid-shadow, in-store ambient; aspect 4:5 portrait or 16:9 landscape; no human-face hero shots in v1.

## Voice

DNA: Graza warm/playful + Craft artisan. ![Craft sample](https://craft-design.co)
Concrete tone — first-person plural, short sentences, food-forward nouns, light humour without slang.
**Decision:** Friendly-direct, first-person plural ("we"), 8–14 word sentences, food-forward nouns, no exclamation marks, EN/FR parity (FR copy ≤ 1.15× EN length).

## Motion

DNA: Superr clean + Craft restraint. ![Superr motion sample](https://www.superr.studio)
Concrete budget — three durations, three easings; staggered hero fade-ups; no parallax, no scroll-jacking.
**Decision:** Durations — fast 150ms, base 300ms, slow 500ms; eases — in cubic-bezier(0.4,0,1,1), out cubic-bezier(0,0,0.2,1), spring cubic-bezier(0.34,1.56,0.64,1); hero fade-up uses slow + out; respects `prefers-reduced-motion`.

## Mascot

DNA: Graza playful illustrative mark. ![Watermelon mascot context](https://graza.co)
Concrete usage — watermelon mascot appears as a small accent (≤ 64px) in hero, footer, and confirmation; never as a primary CTA, never animated > 500ms.
**Decision:** Watermelon mascot — accent role only, max 64px square, allowed in hero corner / footer / confirmation success state; never inside buttons, never as logo replacement, never animated longer than `--duration-slow`.
