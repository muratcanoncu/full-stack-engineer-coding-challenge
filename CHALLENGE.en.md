# Coding Challenge — Pricing Catalog Service

Welcome, and thanks for taking the time to work on this. The challenge is designed to fit in **10–12 hours** of focused work. It is intentionally a little larger than what we expect a polished submission to cover — we are more interested in **how you reason and prioritize** than in feature completeness.

If you have to choose between cutting scope and shipping unpolished code, **cut scope** and say so in your `DESIGN.md`.

---

## 1. Context

You are joining a platform team that builds tooling for a network of independent **craftsman businesses** ("partners"). The platform supports the full lifecycle of a construction-work order — from intake through planning, documentation, signing, and delivery.

The **pricing-service** in this sandbox is the home of *craftsman master data*: who the craftsmen are, which **trade categories** they cover, and the operational data they submit. It is a NestJS + TypeORM + PostgreSQL service.

The next epic is a **pricing engine**:

- Each craftsman has a **pricing catalog** of the work they do.
- The catalog varies dramatically between trade categories — a solar installer prices very differently from a window installer or a heat-pump installer.
- Today this catalog is maintained in spreadsheets. We want it in the platform.
- Later, our internal planners will use the catalog plus a configurator UI to **generate offers in the name of the craftsman**, exported as PDFs and shown as comparison tables in a separate customer-facing portal.

Your task is the **bootstrap step** of that pricing engine: the catalog itself, plus a minimal quote calculator that proves the data model can power the future offer generator.

---

## 2. Setup

You have been given a sandbox monorepo containing:

- `apps/services/auth-service` — an existing NestJS service that owns user identity, issues JWTs at `POST /auth/login`, and runs on port 3001. **You should not need to modify this service.**
- `apps/services/pricing-service` — an existing NestJS service with `craftsmen` and `trades` modules. Validates JWTs locally using the shared `JWT_SECRET` — there is no live call back to `auth-service` in the hot path. Runs on port 3000. **Your work goes here.**
- `apps/partner-portal` — an existing React + MUI + react-hook-form portal with theme, i18n (`de`/`en`), and a working *My Profile* page wired up. Calls `auth-service` for login and `pricing-service` for everything else.
- `libs/shared/{auth,types}` — shared guards, decorators, and types — use as-is.
- `docker-compose.yml` — Postgres + both services + both portals.
- Seeded test users:
  - `admin@example.com` / `admin123` — `ADMIN` role.
  - `partner@example.com` / `partner123` — `CRAFTSMAN` role, JWT scoped to a seeded craftsman with assignments to two trade categories.

User identity is the only thing `auth-service` owns. `pricing-service` reads the user out of the JWT claims. Each service owns their business domain.

See `README.md` for run instructions and `CONVENTIONS.md` for the coding conventions you must follow. **We score against those conventions.**

### AI usage policy

Using AI assistants (Claude, GPT, Copilot, Cursor, etc.) is **allowed and not penalized**, on two conditions:

1. **Document it in `DESIGN.md`.** State clearly where in the work you used AI — by area, not by prompt log. *"Used AI to scaffold the controllers and DTOs; wrote the calculator and the schema validator by hand; used AI to draft de/en i18n keys, reviewed line by line."* is the right level of detail.
2. **Document how you validated the output.** AI suggestions need the same scrutiny as code from a junior teammate. Tell us how you reviewed it — tests you added, edge cases you checked, places you rejected the suggestion and went a different way.

---

## 3. The brief

### 3.1 Backend (pricing-service) — primary focus

Design and implement a versioned pricing catalog and a quote calculator.

#### 3.1.1 Data model

- A **catalog version** belongs to `(craftsmanId, trade)`.
- A version has a status: `DRAFT` (mutable) or `PUBLISHED` (immutable).
- A version has an `effectiveFrom` date and the publishing user.
- Old published versions remain readable for audit. **You may not edit or delete a published version's positions, prices, or rules.**
- At most one `PUBLISHED` version per `(craftsmanId, trade)` may be *active at a given point in time*. Your design must make overlapping active intervals structurally impossible or explicitly resolved — explain which in `DESIGN.md`.

A version contains:

- **Positions** — each has a stable `key` (string), a human label, a `unit` (`piece | m2 | meter | hour | flat`), a net price, a `vatRate` (e.g. `0.19`), optional `minQuantity` / `maxQuantity`, and a **trade-specific attribute object** (e.g. for HVAC a `heatingPowerKw` number; for WINDOWS a `uValue`, `frameMaterial`, etc.). Pick the price's storage representation yourself and defend it in `DESIGN.md`.
- **Surcharges** — declared on the position; each has a `key`, a label, and either a flat-amount or a percentage. A line item may opt in to any subset of its position's surcharges when quoting.
- **Catalog-level discounts** — 0..n on the version. Each is either a flat amount or a percentage with an optional cap, and has `appliesTo: 'subtotal' | {positionKeys: string[]}`.

The trade-specific attribute object is **validated** against a per-trade schema. Add a `pricingSchema` field to `TradeConfig`. The validator must support:

- Field types `string | number | boolean | enum`.
- Numeric `min` / `max`.
- Required fields.
- Enum allowed values.
- A `dependsOn` rule: e.g. *"`woodTreatment` is required when `frameMaterial = 'wood'`"*.

The validator must be a **pure function** with its own spec file. Validation runs on every draft write — not only at publish time.

**The `pricingSchema` is configured by an admin via the admin-portal.** Section 3.3 below covers the admin-portal work. The partner-portal then reads the resulting schema via `GET /trades/:trade` and uses it to render dynamic form fields for craftsmen entering positions.

#### 3.1.2 REST endpoints

Under `/api/v1/pricing-catalogs`, follow the conventions visible in the existing `CraftsmenController`:

- `GET /pricing-catalogs?craftsmanId=&trade=` — list versions (newest first).
- `GET /pricing-catalogs/:versionId` — one version with positions, surcharges, discounts.
- `POST /pricing-catalogs` — create a new `DRAFT` for `(craftsmanId, trade)`.
- `PATCH /pricing-catalogs/:versionId` — edit a `DRAFT` (positions, surcharges, discounts, `effectiveFrom`).
- `POST /pricing-catalogs/:versionId/publish` — transition to `PUBLISHED`.
- `POST /pricing-catalogs/:versionId/quote` — quote against this exact version.
- `POST /craftsmen/:id/trades/:trade/quote` — quote against the version currently `PUBLISHED` and active for that craftsman+trade. (Time-travel — i.e. quoting against a *past* active version via `?at=<ISO>` — is in §3.4.3 and optional.)

Under `/api/v1/trades`, **add**:

- `PATCH /trades/:trade` (ADMIN only) — update `displayName` and / or `pricingSchema` on a trade.
- The handler must reject updates whose new `pricingSchema` would invalidate *existing* positions on any catalog version that references this trade. Either:
  - Reject the patch with `409 Conflict` and a list of offending positions, **or**
  - Accept the patch and mark affected published versions as `SCHEMA_DRIFTED` (or similar).
  - Either is fine — document the choice in `DESIGN.md`.

All endpoints documented with Swagger, validated with `class-validator` DTOs, guarded with the existing `JwtAuthGuard` + `RolesGuard`.

#### 3.1.3 Authorization

- `ADMIN`: full CRUD on any craftsman's catalog.
- `CRAFTSMAN` (partner-portal token): read/write **only** for catalogs whose `craftsmanId` matches the craftsman bound to their JWT (`craftsmanId` claim).
- Row-level checks belong in the service, not the controller.

#### 3.1.4 Quote calculator — the analytical core

The quote endpoint accepts a list of `{positionKey, quantity, appliedSurchargeKeys?}` and returns:

- Per-line: gross, net, applied surcharges, applied discounts.
- Per VAT rate: net subtotal, VAT amount, gross subtotal.
- Quote totals: net, total discount, VAT, gross.

Implementation rules:

1. **Money representation is your call.** Pick a representation that supports the math below without correctness surprises, and apply it consistently end-to-end. Document the choice — and the reasoning — in `DESIGN.md`. The same applies to the response shape: decide what's a number, what's a formatted string, and where formatting happens.
2. **Evaluation order is part of the contract.** Document the order in `DESIGN.md` and justify it. Our suggested order (you may deviate if you can defend it):
   1. `lineNet = quantity × netPrice`
   2. Apply per-line surcharges: flats sum; percents compound multiplicatively.
   3. Apply catalog-level discounts in declaration order. A percent discount with a cap applies the cap *before* the next discount stacks on top.
   4. Group surviving net by `vatRate`; compute VAT per group; sum.
3. **Rounding is part of the contract.** Whenever a percentage is applied, you will get fractional minor units somewhere. Decide on a rounding rule, state it in `DESIGN.md` with a worked example, and apply it consistently. A working implementation with an undocumented or inconsistent rounding rule is not acceptable.
4. **Mixed VAT rates in one quote are valid** and must be grouped and reported per rate.
5. **Quantities outside `[minQuantity, maxQuantity]`**, unknown `positionKey`, surcharge keys not declared on that position, and disabled craftsmen all yield `400` with a precise error message.

#### 3.1.5 Concurrency on publish

Two concurrent `POST .../publish` calls on different drafts for the same `(craftsmanId, trade)` must result in exactly one `PUBLISHED` version. Pick one of:

- A unique partial index `WHERE status = 'PUBLISHED' AND <interval-overlap>`.
- A `SELECT … FOR UPDATE` on a parent row.
- A Postgres advisory lock keyed on `(craftsmanId, trade)`.

Implement it. Justify the choice — and explicitly reject the other two — in `DESIGN.md`.


#### 3.1.6 Migrations

- Use the TypeORM migration API (no raw SQL `CREATE TABLE`).
- Reference tables with the `pricing_service.` schema prefix.
- Never edit a migration file that already exists in the repo. Always add a new one.

See `apps/services/pricing-service/src/migrations/1704067200000-Init.ts` for the pattern.

#### 3.1.7 Testing

Backend coverage is **mandatory**. Cover at minimum:

- Happy paths for every endpoint.
- Publishing a draft twice (second call fails).
- Editing a published version (rejected).
- Quote with: unknown position, quantity outside `[min, max]`, surcharge not declared, mixed VAT rates, percent discount with cap, multiple stacked discounts, zero-quantity line, empty line list.
- Authorization: craftsman A cannot read/write craftsman B's catalog under any endpoint.
- Concurrent publish: simulate two concurrent calls; exactly one wins.
- Schema validator: happy + each failure mode + the `dependsOn` rule + an unknown field.
- Idempotency tests — only if you implemented §3.4.1.
- **At least one property-style / invariant test on the calculator.** Pick whichever of the following is most natural in your design:
  - Gross ≥ net for any non-negative inputs.
  - Sum of per-rate VAT equals reported total VAT.
  - Applying a `0%`-surcharge or a `0`-flat surcharge is a no-op.
  - Doubling all quantities doubles the net subtotal exactly.

  More than one is welcome but not required. `fast-check` is fine; a hand-written loop over a generator is fine too.

### 3.2 Frontend (partner-portal) — secondary focus

Add **one page**: *My Pricing Catalog*. Reachable from the existing navigation.

- One MUI `Tab` per trade category the logged-in craftsman is assigned to.
- For each tab:
  - If a `DRAFT` exists for that trade, show it as the editable table. Otherwise, show a *"Start a new draft from the currently active version"* CTA (or, if there is no active version either, *"Start an empty draft"*).
  - The table lists positions with their key, label, unit, net price (formatted Euro), VAT rate, and a summary of trade-specific attributes.
  - Add/edit position opens an MUI `Dialog` containing a `react-hook-form`. The form **renders the trade-specific attribute fields from the backend's `pricingSchema`** — not hardcoded. This is the part we look at most.
  - Delete position with confirm.
  - **Publish** button with a confirmation `Dialog`.
- A *Try a quote* panel under the table: pick positions, enter quantities, hit *Calculate* — show the breakdown returned by the backend. This proves the end-to-end loop.

Conventions:

- MUI components and theme tokens only. No hardcoded colors, sizes, or raw `<div>` flexbox.
- All user-facing strings in `de.json` and `en.json`. German in **informal "du"** form.
- `react-hook-form` with MUI inputs and `helperText` / `error` for validation.
- Loading, empty, and error states are mandatory.
- Mutations show a `Snackbar` on success and on failure.

See `apps/partner-portal/src/pages/ProfilePage.tsx` for the conventions in action.

Tests: **data-handling only**. We do not want pixel-level or visual regression tests. Cover:

- Mapping from backend version response → table rows.
- Mapping from `pricingSchema` → form field definitions.
- Quote-response → breakdown rows.
- One small integration test of the dialog form's validation error display.

### 3.3 Frontend (admin-portal) — schema configuration

Add a **schema editor** to the existing *Trade configuration* page (or a child route at `/trades/:code`). The editor lets an admin manage a trade's `pricingSchema.fields[]` — *not* by hand-editing JSON, but through a structured form.

For each field in the schema, the admin can configure:

- **Name** (string, required, unique within the schema).
- **Type** (one of `string`, `number`, `boolean`, `enum`).
- **Required** (boolean).
- **Numeric range** (`min` / `max`) — visible only when type = `number`.
- **Allowed values** (list of strings) — visible only when type = `enum`.
- **`dependsOn`** (optional) — a `{ field, equals }` pair selecting another already-defined field and the value that activates this one.

The editor must support: adding a field, editing an existing field, removing a field, reordering fields (drag is not required — up/down buttons are fine), and saving the resulting schema via `PATCH /trades/:trade`.

UI requirements:

- MUI throughout, theme tokens only.
- `react-hook-form` for the field edit dialog, with `helperText` / `error` for validation.
- The "type" select is the source of truth: switching from `number` → `enum` clears `min`/`max` and reveals the allowed-values input.
- Loading, empty, error states (yes, also for the *no fields yet* case — show a CTA "Add the first field").
- Show a clear conflict banner if the backend rejects the patch with `409` (the existing-positions-invalidated case).
- i18n: both `de.json` and `en.json`, **informal "du"** form German.

See `apps/admin-portal/src/pages/TradesPage.tsx` for the seeded read-only list and a small data-handling test pattern. Your editor lives on top of (or replaces) that page's per-row interaction.

Tests: data-handling only. Cover:

- Schema → editor form-state mapping (and back).
- Validation: duplicate field names, numeric `min > max`, empty enum list, `dependsOn` referencing an unknown field.
- One small integration test asserting that switching type from `number` → `enum` clears the irrelevant inputs.

### 3.4 Optional — if you have time left

These items are **not required** for hire-bar. Skip them without penalty if your core work runs long. If you *do* tackle one, mention it in `DESIGN.md` with a short note on what you skipped to make room.

If both core tracks (backend §3.1 + both portals §3.2 / §3.3) are in good shape with at least a couple of hours to spare, pick **one** of the three below — not all of them. We are looking for breadth of signal, not breadth of half-finished features.

#### 3.4.1 Idempotency on quote

The two quote endpoints accept an optional `Idempotency-Key` header. Within a 24-hour window:

- Same key + same request body → return the cached response (byte-equivalent to the original).
- Same key + different request body → `409 Conflict`.
- No key → no caching.

Tests must cover both branches.

#### 3.4.2 Infrastructure-as-code — deploy the stack to AWS

Add a `terraform/` directory at the repo root with a Terraform configuration that provisions a working deployment of all four services on AWS:

- **Networking** — a VPC with public and private subnets across at least 2 AZs.
- **Database** — a single RDS PostgreSQL instance in the private subnets, secured by a dedicated security group reachable only from the ECS services.
- **Container registry** — an ECR repository per service image (`auth-service`, `pricing-service`, `partner-portal`, `admin-portal`).
- **Compute** — an ECS cluster running on Fargate, with one task definition + service per container.
- **Ingress** — an Application Load Balancer in the public subnets. Host- or path-based routing exposing:
  - `https://api.<your-domain>/auth/...` → auth-service
  - `https://api.<your-domain>/pricing/...` → pricing-service
  - `https://admin.<your-domain>` → admin-portal (or admin path on the same domain)
  - `https://app.<your-domain>` → partner-portal
- **Secrets** — `JWT_SECRET` and the RDS master password stored in AWS Secrets Manager (or SSM Parameter Store) and injected into task definitions via `secrets:` references; never hardcoded.
- **Observability** — CloudWatch Logs configured per service with a sane retention.

Requirements:

- The configuration must `terraform plan` cleanly with a few sandbox-specific variables (region, domain, image tags). **`terraform plan` is the deliverable; you do not need to run `terraform apply`.** Verify against LocalStack (recommended — setup below) or against a real AWS account, your choice.
- Use Terraform **modules** for reusable shapes (e.g. one `ecs_service` module called four times). Don't copy-paste four nearly-identical resources.
- State backend stubbed: `terraform { backend "local" {} }` is fine. We don't need a remote backend wired up.
- A short `terraform/README.md` covers: required variables, how to plan, and any caveats (e.g. ACM cert and DNS records are out-of-band).

We do not require this to be production-hardened (no WAF, no autoscaling, no blue/green). We are looking for the foundation of a deployment that an engineer fluent in AWS could ship from.

Verification:

- `terraform fmt -check` passes.
- `terraform validate` passes.
- `terraform plan` produces a plan with no errors and no obviously-wrong resources (e.g. publicly-exposed RDS).

##### Verification target — LocalStack

You don't need an AWS account. We ship an opt-in LocalStack compose plus a Terraform provider snippet so you can verify everything locally:

```bash
# Bring LocalStack up on http://localhost:4566.
docker compose -f infrastructure/localstack-compose.yml up -d

# Copy the example provider into your terraform/ workspace.
cp infrastructure/localstack-provider.tf.example terraform/localstack/provider.tf

# Plan against LocalStack.
cd terraform/localstack && terraform init && terraform plan

# Tear down.
docker compose -f infrastructure/localstack-compose.yml down -v
```

`terraform plan` is the deliverable — that's what we'll run. Don't worry about `apply`; we don't need the resources actually created. If your plan is clean against LocalStack's free Community image, you're done.

#### 3.4.3 Time-travel quote

Extend `POST /craftsmen/:id/trades/:trade/quote` to accept an optional `?at=<ISO>` query parameter that resolves the version that was active at that timestamp.

- No `at` (or `at = now`) → quote against the currently active version (this is already the mandatory behavior from §3.1.2).
- `at` in the past → quote against the version active at that moment.
- No version active at that date → `404` with a clear error.
- `at` in the future → quote against the version that *will* be active (or `404` if none is scheduled).
- Craftsman exists but is inactive → `403`.

A quote against a published version from 6 months ago must produce the same numbers it would have produced 6 months ago. The audit-replay property is non-negotiable — if you implement this, get the determinism right or skip the item.

Add tests for: a past date with multiple historical versions, a date before any version was effective, the boundary at `effectiveFrom` itself, an inactive craftsman, and a future date.

---

## 4. Out of scope — do not build

- The full offer-generator UI.
- PDF / document export of quotes or catalogs.
- A customer-portal comparison table.
- Other admin pages beyond the trades schema editor (no user management, no audit log UI, etc.).
- CRM / external sync.
- Realtime updates.
- A "history" view of past catalog versions (mention as future work in `DESIGN.md` if you want).
- Drag-and-drop reordering in the schema editor — up/down buttons are sufficient.
- A live "preview" of the rendered partner form inside the admin editor (it would be nice; it is not required).

If you find yourself wanting to build one of these, that is a signal to stop and write a paragraph in `DESIGN.md` instead.

---

## 5. Conventions you must follow

These are defined in `CONVENTIONS.md` at the repo root. Highlights:

- **Package manager:** sandbox ships with `yarn`; switch to `npm` / `pnpm` if you prefer, just keep it consistent.
- **Migrations:** TypeORM API, `pricing_service.` schema prefix, never edit existing migrations.
- **TypeScript:** no `any` outside test files; no `eslint-disable` without justification.
- **i18n:** no static user-facing strings; both `de.json` and `en.json`; **informal "du"** form in German.
- **Money:** pick a consistent representation, document it, apply it everywhere.
- **MUI:** components from `@mui/material`, styling via `sx` / theme tokens, no Tailwind / styled-components / hardcoded colors.
- **Forms:** `react-hook-form` + MUI inputs + `helperText` / `error`.
- **Loading / empty / error states are not optional.**
- **Test files** live next to the source file as `*.spec.ts(x)`.

---

## 6. Deliverables

1. Your code, runnable via `docker-compose up` (or `podman-compose up`).
2. `DESIGN.md` at the repo root, **maximum 2 pages**, covering:
   - Your data model — and specifically how you handle per-trade attribute variability.
   - Your money representation (storage + arithmetic) and why.
   - The quote evaluation order, with the rationale.
   - Your rounding rule, with a worked example.
   - Your concurrency-on-publish choice, with the two rejected alternatives and why.
   - Your behavior when an admin's schema patch would invalidate existing positions (reject vs. mark drift).
   - How this transitions toward the full pricing engine + offer generator. One paragraph.
   - What you cut and why.
   - **AI usage** — where you used AI assistance (by area, not by prompt log) and how you validated / reviewed the output. See the policy in §2.
3. An updated `README.md` (or a short section in `DESIGN.md`) describing how to run the migrations, the services, and the tests.

### Submission

When the work is complete:

1. Create a **private GitHub repository in your own account** and push your work to it.
2. Invite **`christopher.maeuer@deutsche-sanierungsberatung.de`** as a collaborator (GitHub → Settings → Collaborators → Add people, by email).
3. Reply to the email thread we used for scheduling to let us know your repo is ready, and include the repository URL.

### Commit hygiene

We expect the repo to ship with **incremental commit history** that reflects how the work actually progressed — not a single squashed "initial commit".

- Commit each logical chunk of work (entity + migration; calculator skeleton; calculator + tests; concurrency handling; etc.) as its own commit.
- Don't rewrite history before submitting. False starts, fixes, and small refactors are *good* signal — they're how engineers actually work.
- Commit messages in imperative present tense (*"Add quote calculator"*, *"Fix off-by-one in cap-stacking"*).
- Don't squash to a clean line; we'd rather see the real shape of the work.

Verify on a clean clone before submitting that `docker compose up --build` (or `podman-compose up --build`) brings the stack up end-to-end, and that `node_modules/` / `dist/` are gitignored.

---

## 7. Suggested time allocation

This is guidance, not a contract. Spend time where you think it matters most.

| Block | Hours |
|---|---|
| Read the repo, `CONVENTIONS.md`, existing `craftsmen` + `trades` patterns | 1 |
| `DESIGN.md` first draft | 0.5 |
| Entities + migrations + DTOs | 1.5 |
| Calculator + tests (the analytical core) | 2 |
| Publish concurrency + tests | 1 |
| Schema-driven attribute validator + `PATCH /trades/:trade` + tests | 1.5 |
| Admin-portal schema editor + data-handling tests | 2 |
| Partner-portal page + dynamic form + data-handling tests | 1.5 |
| `DESIGN.md` final pass + README + cleanup | 0.5 |

For the **optional** items in §3.4 (idempotency keys, Terraform/ECS/RDS), pick **at most one** if you have spare hours and want to extend your signal. Skipping the entire §3.4 has no penalty — note the choice in `DESIGN.md`.

Good luck — and have fun.
