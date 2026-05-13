# Conventions

These conventions are non-negotiable for this challenge. The scoring rubric checks adherence directly.

---

## 1. Package manager

The sandbox is set up for **yarn** — that's how the commands in `README.md` and the Docker entrypoints are written, and a `yarn.lock` ships in the repo. If you stay on yarn, everything works out of the box.

You may switch to `npm` or `pnpm` if you prefer; you're responsible for keeping the lockfile and scripts consistent (and for updating any docs/CI you change). We have no preference — pick whatever makes you productive. Don't mix package managers in the same project.

```bash
# Default — works as shipped.
yarn install
yarn nx serve auth-service
yarn nx serve pricing-service
yarn nx serve partner-portal
yarn nx test pricing-service
```

---

## 2. TypeScript

- No `any` outside test files. Use `unknown` and narrow.
- No `eslint-disable` without a one-line justification comment.
- No `@ts-ignore` / `@ts-expect-error` without a one-line justification comment.
- Prefer `readonly` and `as const` for invariant data.

---

## 3. Backend — NestJS + TypeORM

### 3.1 Module structure

Each domain module owns a folder:

```
src/app/<domain>/
├── <domain>.module.ts
├── <domain>.controller.ts
├── <domain>.controller.spec.ts
├── <domain>.service.ts
├── <domain>.service.spec.ts
├── dto/
│   └── *.dto.ts
└── entities/
    └── *.entity.ts
```

See `apps/services/pricing-service/src/app/craftsmen` for the canonical example.

### 3.2 Entities

- Class properties in `camelCase`.
- `@Column` decorator uses explicit `name: 'snake_case'`.
- Primary keys are UUID via `@PrimaryGeneratedColumn('uuid')`.
- `createdAt` / `updatedAt` via `@CreateDateColumn` / `@UpdateDateColumn` with explicit `snake_case` names.
- Foreign keys: both the scalar column (`@Column({ name: 'craftsman_id' })`) and the relation (`@ManyToOne(...) @JoinColumn(...)`).
- Optional fields use union with `null`, not `undefined`.

### 3.3 DTOs

- One DTO per direction (create / update / response / query).
- Validation via `class-validator` decorators.
- Swagger documentation via `@ApiProperty` decorators where the field is not self-descriptive.
- Response DTOs explicitly shape the response — do not return entities directly.

### 3.4 Controllers

- Controllers contain HTTP wiring only. No business logic. No queries.
- Every endpoint has `@ApiOperation` + `@ApiResponse` decorators.
- Every endpoint has explicit `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)` unless documented as public.
- Use `ParseUUIDPipe` for UUID path params.

### 3.5 Services

- Constructor-injected repositories via `@InjectRepository`.
- Throw `NotFoundException` / `BadRequestException` / `ForbiddenException` from `@nestjs/common` — never custom-shaped errors.
- Use `Logger` from `@nestjs/common`, not `console`.
- Authorization checks happen here, not in the controller.

### 3.6 Money handling

- Decide on a storage and arithmetic representation for monetary values, document it in `DESIGN.md`, and apply it consistently across entities, services, DTOs, and frontend.
- Whatever you pick: it must support correct VAT and percent-discount math without surprises across many lines and stacked operations. We will test it.
- Format prices for display only at the response boundary. Internal math stays in your chosen representation.
- For the formatted output, use `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })`.

### 3.7 Migrations

- Use the TypeORM migration API:
  - `queryRunner.createTable(...)` not `queryRunner.query('CREATE TABLE ...')`.
  - `queryRunner.addColumn(...)`, `queryRunner.dropColumn(...)`, etc.
- **All** table references include the `pricing_service.` schema prefix.
  - Correct: `queryRunner.createTable(new Table({ name: 'pricing_service.craftsmen', ... }))`
  - Wrong: `queryRunner.createTable(new Table({ name: 'craftsmen', ... }))`
- Both `up` and `down` paths implemented. `down` reverses `up` exactly.
- Never edit a migration file that already exists. Always add a new migration.

Generate a new migration:

```bash
yarn nx migration:generate pricing-service --args.name=AddPricingCatalogs
```

### 3.8 Authentication

- User identity lives in **`auth-service`**, not in `pricing-service`. `pricing-service` does not own a `users` table and must not add one.
- JWTs are validated locally in each service using the shared `JWT_SECRET`. No live call back to `auth-service` during request handling.
- All authenticated endpoints use `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`.
- Access the current user via the `@CurrentUser()` decorator — never read from `request.user` directly.
- For row-level scoping, compare `user.craftsmanId` (from the JWT claim) to the resource's `craftsmanId` inside the service.
- The partner-portal stores the JWT in `localStorage` and sends it as `Authorization: Bearer <jwt>` to **both** services. The same token works for both — they share the secret.

---

## 4. Frontend — React + MUI + react-hook-form + react-i18next

### 4.1 Components

- Functional components only. No class components.
- One component per file. The file name matches the component name.
- Co-locate small helpers used only by one component in the same file.

### 4.2 Styling — MUI only

- All visual primitives from `@mui/material`: `Button`, `TextField`, `Dialog`, `Stack`, `Box`, `Typography`, `Table`, `Autocomplete`, etc.
- Icons from `@mui/icons-material`.
- Styling via the `sx` prop or `styled()` from `@mui/material/styles`.
- **Do not** introduce: Tailwind, CSS Modules, styled-components, plain `<div>` flexbox, inline `style={{...}}` for layout/colors/typography.
- Pull all colors, spacing, typography, shadows, and radii from the theme:
  - `theme.palette.primary.main`, `theme.palette.text.primary`.
  - `theme.spacing(2)` or shorthand `sx={{ p: 2, m: 1 }}`.
  - `<Typography variant="body2">` not `style={{ fontSize: 14 }}`.

### 4.3 Layout

Use `Stack`, `Box`, `Grid`. Prefer `Stack` with `gap` and `direction` over hand-rolled flex.

```tsx
// Good
<Stack direction="row" spacing={2} alignItems="center">
  <TextField ... />
  <Button ... />
</Stack>

// Bad
<div style={{ display: 'flex', gap: 16 }}>...</div>
```

### 4.4 Forms

- `react-hook-form` for any form with more than one field or non-trivial validation.
- Validation errors via the MUI `error` prop + `helperText` — never custom `<span>`s.

### 4.5 i18n

- No user-facing string literals in JSX.
- Every key exists in **both** `de.json` and `en.json`.
- German uses **informal "du"** form (this portal is for our business partners, not end customers):
  - "Klicke", "Gib", "Wähle"
  - "Du", "Dein", "Dir"
- Date format: `dd.MM.yyyy`.

### 4.6 Loading, empty, and error states

For any async data fetch:

- **Loading** — `Skeleton` or `CircularProgress`. Never a blank screen.
- **Empty** — icon + short message + optional primary action.
- **Error** — `Alert` inline or `Snackbar`, with an actionable message (never a stack trace).

For mutations:

- Show a `Snackbar` confirming success or failure.

### 4.7 API calls

- Use the existing `apiClient` in `apps/partner-portal/src/services/api.service.ts`.
- Wrap in a typed service module per resource (`pricing-catalogs.service.ts`, etc.).
- Errors propagate as typed `ApiError` instances — handle at the call site, never swallow silently.

---

## 5. Testing

### 5.1 Backend — mandatory full coverage

For every new feature:

- Happy path test for every endpoint.
- Edge cases: empty inputs, null/undefined, boundary conditions, single vs. multiple items.
- Error cases: invalid inputs, missing required data, failed operations.
- Every `if` / `else` / `switch` branch exercised.
- Integration tests across multiple files where a feature spans them.

Mocks via standard Jest mocking. Spec file lives next to the source as `*.spec.ts`.

### 5.2 Frontend — data-handling only

We do **not** want pixel-level / visual regression tests. Cover:

- Data transformations (mapping API responses to view models, computing derived data).
- Form validation logic.
- Dialog-level integration tests where validation behavior is non-trivial.

### 5.3 Test naming

Tests read like a spec:

```ts
// Good
it('rejects a quote when the quantity is above maxQuantity', ...);

// Bad
it('test 1', ...);
it('works', ...);
```

### 5.4 Running tests

```bash
yarn nx test pricing-service
yarn nx test pricing-service --testFile=craftsmen.service.spec.ts
yarn nx test partner-portal
```

---

## 6. Git

- Do not force-push.
- Commits in imperative present tense: *"Add pricing catalog entity"*.
- One logical change per commit.

We do not require a specific branching strategy for this challenge — just submit a tarball or a fork URL with a clean commit history.
