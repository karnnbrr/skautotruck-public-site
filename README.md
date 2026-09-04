# S.K.AUTOTRUCK — Public Customer Website (V1)

A **separate project** from the internal admin dashboard (`skautotruck-vite`)
— different audience (real customers, not staff), no login, deployed as its
own site (e.g. `skautotruck.com`), calling a **new public, read-only** slice
of the same backend.

## What's here (V1 scope)

- **หน้าแรก (Home)** — hero + 3 featured trucks
- **รถทั้งหมด (Truck Listing)** — search by model/brand, real stock only
- **รายละเอียดรถ (Truck Detail)** — full price/down-payment/installment
  breakdown, photo gallery, "สนใจคันนี้" CTA
- **ติดต่อเรา (Contact)** — placeholder contact card (see below)
- Demo Mode toggle (top nav) — clearly labeled, for showing the site before
  the backend is deployed

## Backend requirement — new, additive-only

This calls **new** `/api/public/*` routes added to the existing backend
(`somkiat-backend`), which require **zero changes to any existing route,
service, or test** — confirmed by re-running the full 176-test suite after
adding them (171 pass, 0 fail, 5 skip, same as before this addition).

**Before this site can show real data, the backend needs:**
```
PUBLIC_DEALER_ID=DEALER_SOMKIAT
```
set in its environment. Without it, `/api/public/*` fails closed with a
generic error (never leaks *why* to a public caller) — see
`tests/publicApi.test.js` in the backend project for the exact behavior.

## Honest gaps — do not treat as "ready to publish"

1. **Contact info is placeholder text**, not real data — I don't have your
   actual phone number, address, or hours, and won't invent them. Every
   contact field in `ContactPage` and the footer says exactly that; fill in
   real values before publishing.
2. **"สอบถามผ่าน Facebook Messenger" button doesn't link anywhere yet** —
   it's disabled (`preventDefault`) with a note underneath. Wire it to your
   real Facebook Page URL once one exists — this project doesn't invent a
   fake link.
3. **No public write/inquiry form in V1** — by design: this project's
   existing architecture already has a dedicated contact channel (the AI
   Messenger integration from Steps 20–32). Adding a second, separate
   "contact form → creates a Customer" write path would duplicate that and
   introduce a new public write surface without the same Safety Gate
   protections. If a simple inquiry form turns out to be wanted anyway,
   that should be a deliberate follow-up, not something added silently here.

## Test commands (run these yourself)

Same honest limitation as the admin dashboard project — **I could not run
`npm install`/`npm run build` myself** (no network access in the
environment that built this). Checked instead: brace/paren balance
(334/334, 184/184 — matched).

```bash
npm install
npm run build
npm run preview   # check http://localhost:4173 looks right
npm run deploy     # once you're ready
```
