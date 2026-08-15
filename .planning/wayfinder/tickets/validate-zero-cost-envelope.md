---
title: Validate the zero-additional-cost operating envelope
label: wayfinder:research
status: closed
parent: ../maps/cafe-le-den-zero-cost-platform.md
assignee: zero-cost-researcher
blocked_by: []
---

## Question

Can the customer site, guest pickup ordering, images, admin authentication,
database, realtime updates, and notifications operate legally and reliably at the
stated volume with no new recurring software cost; what current free-tier or
commercial-use constraints apply; and what hard limits or degraded modes must the
product specification acknowledge?

## Resolution comment

Resolved in [Zero-additional-cost operating envelope](../research/zero-cost-operating-envelope.md).
More than 100 orders/day fits the numerical capacity of a Cloudflare Workers Free
+ Supabase Free pilot, but not the current Vercel Hobby, one-Resend-email-per-order,
or cached/scraped Google-review assumptions. The accepted envelope is best effort,
not SLA-backed: it requires static-first Cloudflare hosting, protected server-only
order writes, bounded media, external self-hosted backups, Realtime plus polling,
verified-destination or omitted per-order email, owned testimonials, and explicit
order-unavailable/manual fallback states. A custom domain/mailbox must already
exist; guaranteed uptime, managed recovery, and zero data loss are incompatible
with the hard no-new-spend constraint.
