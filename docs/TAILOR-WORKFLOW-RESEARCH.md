# Tailor workflows and Dressify digitization

Research date: 7 October 2026. This is desk research, not interviews or a claim that every Pakistani shop operates identically. Actual shop habits should be validated with independent, home-based and multi-worker tailors before automating messages or changing financial policy.

## What happens in a shop

A typical job begins with a conversation about the garment, occasion, design and fit. The tailor records measurements and cloth details, quotes a price, accepts an advance and promises trial/delivery dates. Work moves through cutting, stitching, fitting, alterations and finishing; collection closes the job and usually settles the balance. A customer may return months later, so measurements and pattern references need to be findable while old orders retain their original specifications.

Chokman, a practicing bespoke tailor, describes consultation, stored measurements, in-house construction and fitting/collection, including design details and pattern retention. This supports the core workflow; its bespoke suit timings should not be generalized to Pakistani everyday stitching. [Source: Chokman process](https://www.chokman.com.au/process).

TailorMan's official product tour documents garment bookings with advances and delivery dates, customer measurements, delivery schedules, alterations, outstanding payments, production stages, inventory, staff wages, expenses and audit logs. This is evidence of workflows software vendors support, rather than an independent survey of how often shops use paper. [Source: TailorMan product tour](https://tailorman.in/product-tour/).

Fastora's official guide describes booking, measurement slips, assignment, advance/balance payments and printouts for workshop staff; TailorSync documents named measurement sets, partial payments and fabric/trims inventory. [Fastora guide](https://fastora.io/docs/fast-tailor), [TailorSync guides](https://tailorsync.pro/guides).

## Manual record → useful digital replacement

The manual artifacts below are inferred from these workflows and should be confirmed locally.

| Record / manual task | What it contains or entails | Dressify coverage |
|---|---|---|
| Counter order register | Customer, phone, garments, pieces, quote and promised date | Added: persistent workshop book; no online customer account needed |
| Measurement notebook | Named dimensions, units, garment type and fitting preferences | Existing online profiles; added order-specific written snapshot with inches/cm for counter jobs |
| Design notes | Neckline, pockets, cuffs, fit, embroidery and reference details | Existing portfolio; added counter style/fitting notes |
| Customer cloth handover | Length, colour, number of pieces, lining and condition | Added cloth description and shelf/bundle label |
| Finding a fabric bundle | Match paper slip to a physical bag/shelf | Added searchable job reference and printable slip; attaching labels remains physical |
| Worker assignment | Who cuts or stitches each garment | Added assigned worker field and search; no staff login or payroll yet |
| Production notebook | Received → cutting → stitching → trial → alteration → ready | Added validated stages, including fitting/alteration loops |
| Trial diary | Trial date and adjustments to make | Existing online appointments; added counter fitting date and editable instructions |
| Delivery diary | Due dates, delayed jobs, ready jobs waiting for collection | Added today/overdue/ready filters and dashboard counts |
| Advance receipt | Agreed total, initial cash deposit, outstanding amount | Added cash advance and computed balance |
| Part-payment ledger | Each later payment, date and method | Added cash/bank/Easypaisa records with duplicate and overpayment protection |
| Collection slip | Identify job and check balance before release | Added printable job slip and paid-before-collection guard |
| Customer calls | Answer “is it ready?” repeatedly | Existing online order tracking/chat; counter notifications remain a future integration |
| Material stock book | Thread, lining, zips, buttons, quantities and reorders | Existing inventory and low-stock alerts |
| Supplier notebook | Purchase costs, suppliers, bills and credit owed | Future: supplier purchasing/payables |
| Worker wage notebook | Piece rates, completed work, advances and wages owed | Future: wage ledger linked to assignments |
| Daily expense diary | Rent, electricity, transport, repairs and consumables | Future: shop expense and cash reconciliation ledger |
| Repeat-order copying | Find old measurements and copy the design | Existing online profile reuse; counter customer profile/reorder reuse is future work |
| Quality checklist | Fit, seams, stains, buttons, pressing and packaging | Future: per-garment checklist and sign-off |
| Machine maintenance diary | Service date, faults and repair cost | Future: maintenance log and reminders |
| Seasonal rush planning | Count unfinished work and limit promises around Eid/weddings | Existing online capacity; counter deadlines added, but counter intake does not reserve online slots |
| Lost notebook / manual totals | Reconstruct orders, income and dues | Counter records now in PostgreSQL; CSV register export added; normal deployment backups still need configuring |

## Implemented flows

Open **Tailor → Workshop**, add a counter order, record the original measurements, fabric description, bundle location and advance, then search/filter the register. Open a job to print the slip, record another payment or move production forward. Update worker, bundle label, fitting date and instructions as the work progresses. Original measurements remain unchanged. Fully paid ready jobs can be marked collected. All queries and updates are scoped to the authenticated shop.

Payment methods here are bookkeeping records of money the tailor says they received; they do not charge a wallet or trigger a bank transfer. Amounts use whole PKR. The advance field is explicitly cash. A job holds one garment description with a piece count; multi-garment line items, payment refunds/cancellations and full accounting exports need a subsequent implementation. Counter jobs and online orders are separate ledgers and do not share capacity reservations. Export register downloads the authenticated shop's jobs as CSV, including balances and measurements; spreadsheet formulas in customer-entered text are escaped.

## Next priorities

1. Interview 5–8 shops (women-led home ateliers, everyday shalwar-kameez shops, alterations shops and multi-worker studios). Observe an order from intake through collection and compare actual paper slips.
2. Add a reusable counter customer/measurement history, multiple garment lines and explicit correction/cancellation/refund workflows.
3. Link counter intake to capacity, then add wage and expense ledgers and daily cash reconciliation.
4. Add opt-in customer reminders through a configured provider, with preview, consent and delivery logs. No automated WhatsApp/SMS sending is implemented in this change.
5. Add structured measurement templates, photos of supplied cloth, quality checks and label printing after validating shop hardware and connectivity.

## Validation

`npm run typecheck` and `npm run build` verify route/action compilation. `npm run test:workshop` uses isolated synthetic fixture shops in the configured migrated database, deletes only its own fixtures, and runs original unit checks plus workflow validation, ownership isolation, duplicate payments, concurrent payment races, stale stage transitions and collection settlement checks. It never drops or resets the configured database. The original `npm test` still needs its separate local/TEST_DATABASE_URL database.

Completed checks for this change: TypeScript passed; production build passed with the workshop and export routes; 17 tests passed across three test files. Browser checks covered demo-tailor sign-in, order creation, worker search/no-results state, partial payment and ledger updates, moving to cutting, fitting-note editing, Urdu/RTL, desktop and 390px phone layouts, and CSV download. The synthetic browser job and integration fixture shops were removed. The print action invoked the native print flow, but printed output could not be reliably inspected through browser automation. Full existing order-service regression tests remain unrun because the separate local PostgreSQL test database was unavailable.
