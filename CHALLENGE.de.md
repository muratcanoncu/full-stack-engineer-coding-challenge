# Coding-Challenge — Pricing-Catalog-Service

Willkommen, und danke, dass Du Dir die Zeit für diese Aufgabe nimmst. Die Challenge ist auf **10–12 Stunden konzentrierter Arbeit** ausgelegt. Sie ist bewusst etwas größer als das, was wir an polierter Abgabe erwarten — uns interessiert mehr, **wie Du denkst und priorisierst**, als ob jedes Feature steht.

Wenn Du Dich zwischen Scope kürzen und unsauber abliefern entscheiden musst, **kürze den Scope** und schreibe das in Dein `DESIGN.md`.

---

## 1. Kontext

Du steigst in ein Plattform-Team ein, das Werkzeuge für ein Netzwerk unabhängiger **Handwerksbetriebe** ("Partner") baut. Die Plattform unterstützt den vollständigen Lifecycle eines Bauauftrags — von der Aufnahme über Planung, Dokumentation, Unterzeichnung bis zur Abwicklung.

Der **pricing-service** in dieser Sandbox ist die Heimat der *Craftsman-Stammdaten*: wer die Craftsmen sind, welche **Trade-Kategorien** sie abdecken, und die operativen Daten, die sie einreichen. Es ist ein NestJS + TypeORM + PostgreSQL-Service.

Die nächste Epic ist eine **Pricing Engine**:

- Jeder Craftsman hat einen **Preiskatalog** der Arbeiten, die er anbietet.
- Der Katalog unterscheidet sich erheblich zwischen Trade-Kategorien — ein Solar-Installateur kalkuliert ganz anders als ein Fenster-Installateur oder ein Wärmepumpen-Installateur.
- Heute werden diese Kataloge in Tabellen gepflegt. Wir wollen sie in die Plattform holen.
- Später werden unsere internen Planer:innen den Katalog kombiniert mit einer Konfigurator-UI nutzen, um **Angebote im Namen des Craftsman zu erzeugen**, als PDF zu exportieren und in einem separaten kundenseitigen Portal als Vergleichstabellen darzustellen.

Deine Aufgabe ist der **Bootstrap-Schritt** dieser Pricing Engine: der Katalog selbst plus ein schlanker Quote-Calculator, der zeigt, dass das Datenmodell den späteren Offer-Generator tragen kann.

---

## 2. Setup

Du erhältst eine Sandbox-Monorepo mit:

- `apps/services/auth-service` — ein bestehender NestJS-Service, der die User-Identität verwaltet, JWTs unter `POST /auth/login` ausgibt und auf Port 3001 läuft. **Du solltest diesen Service nicht ändern müssen.**
- `apps/services/pricing-service` — ein bestehender NestJS-Service mit `craftsmen`- und `trades`-Modulen. Validiert JWTs lokal mit dem geteilten `JWT_SECRET` — es gibt keinen Live-Call zurück an den `auth-service` im Hot Path. Läuft auf Port 3000. **Hier passiert Deine Arbeit.**
- `apps/partner-portal` — ein bestehendes React + MUI + react-hook-form-Portal mit Theme, i18n (`de`/`en`) und einer funktionierenden *Mein Profil*-Seite. Spricht den `auth-service` für Login und den `pricing-service` für alles andere an.
- `libs/shared/{auth,types}` — geteilte Guards, Decorators und Typen — nutze sie wie sie sind.
- `docker-compose.yml` — Postgres + beide Services + beide Portale.
- Geseedete Test-User:
  - `admin@example.com` / `admin123` — Rolle `ADMIN`.
  - `partner@example.com` / `partner123` — Rolle `CRAFTSMAN`, JWT auf einen geseedeten Craftsman mit Assignments auf zwei Trade-Kategorien gescoped.

User-Identität ist das Einzige, was `auth-service` besitzt. `pricing-service` liest den User aus den JWT-Claims. Jeder Service besitzt seine eigene Business-Domain.

Schau in die `README.md` für Run-Instruktionen und in die `CONVENTIONS.md` für die Coding-Konventionen, an die Du Dich halten musst. **Wir bewerten gegen diese Konventionen.**

### Policy zur KI-Nutzung

Die Nutzung von KI-Assistenten (Claude, GPT, Copilot, Cursor, etc.) ist **erlaubt und wird nicht negativ bewertet**, unter zwei Bedingungen:

1. **Dokumentiere es im `DESIGN.md`.** Sag klar, wo Du KI eingesetzt hast — nach Bereich, nicht nach Prompt-Log. *„KI genutzt, um Controller und DTOs zu scaffolden; den Calculator und den Schema-Validator von Hand geschrieben; KI für den ersten Draft der de/en i18n-Keys, danach Zeile für Zeile reviewed."* ist der richtige Detailgrad.
2. **Dokumentiere, wie Du die Ergebnisse validiert hast.** KI-Vorschläge brauchen denselben kritischen Blick wie Code von einem Junior. Sag uns, wie Du reviewed hast — welche Tests Du ergänzt hast, welche Edge Cases Du geprüft hast, an welchen Stellen Du den Vorschlag verworfen und einen anderen Weg gewählt hast.

---

## 3. Der Auftrag

### 3.1 Backend (pricing-service) — primärer Fokus

Entwirf und implementiere einen versionierten Preiskatalog und einen Quote-Calculator.

#### 3.1.1 Datenmodell

- Eine **Katalog-Version** gehört zu `(craftsmanId, trade)`.
- Eine Version hat einen Status: `DRAFT` (mutierbar) oder `PUBLISHED` (immutable).
- Eine Version hat ein `effectiveFrom`-Datum und den publizierenden User.
- Alte publizierte Versionen bleiben für Audit-Zwecke lesbar. **Du darfst Positionen, Preise oder Regeln einer publizierten Version weder editieren noch löschen.**
- Höchstens eine `PUBLISHED`-Version pro `(craftsmanId, trade)` darf zu einem gegebenen Zeitpunkt *aktiv* sein. Dein Design muss überlappende aktive Intervalle entweder strukturell unmöglich machen oder explizit auflösen — erkläre den gewählten Weg im `DESIGN.md`.

Eine Version enthält:

- **Positionen** — jede hat einen stabilen `key` (string), ein menschenlesbares Label, eine `unit` (`piece | m2 | meter | hour | flat`), einen Nettopreis, eine `vatRate` (z. B. `0.19`), optional `minQuantity` / `maxQuantity` und ein **trade-spezifisches Attribut-Objekt** (z. B. für HVAC ein `heatingPowerKw` als number; für WINDOWS ein `uValue`, `frameMaterial`, etc.). Wähle die Speicher-Repräsentation des Preises selbst und verteidige sie im `DESIGN.md`.
- **Zuschläge (Surcharges)** — auf der Position deklariert; jeder hat einen `key`, ein Label und entweder einen Flat-Betrag oder einen Prozentsatz. Ein Line-Item kann beim Quoten beliebige Teilmengen der Position-Zuschläge aktivieren.
- **Katalog-Rabatte (Discounts)** — 0..n pro Version. Jeder ist entweder ein Flat-Betrag oder ein Prozentsatz mit optionalem Cap, und hat `appliesTo: 'subtotal' | {positionKeys: string[]}`.

Das trade-spezifische Attribut-Objekt wird gegen ein **per-Trade-Schema validiert**. Ergänze ein `pricingSchema`-Feld auf `TradeConfig`. Der Validator muss unterstützen:

- Field-Typen `string | number | boolean | enum`.
- Numerische `min` / `max`.
- Pflichtfelder.
- Enum-Wertelisten.
- Eine `dependsOn`-Regel: z. B. *„`woodTreatment` ist erforderlich, wenn `frameMaterial = 'wood'`."*

Der Validator muss eine **pure Function** sein mit eigenem Spec-File. Validierung läuft bei jedem Draft-Write — nicht nur beim Publish.

**Das `pricingSchema` wird von einem Admin im admin-portal konfiguriert.** Abschnitt 3.3 deckt die admin-portal-Arbeit ab. Das partner-portal liest das resultierende Schema über `GET /trades/:trade` und nutzt es, um dynamische Formfelder für Craftsmen zu rendern, die Positionen anlegen.

#### 3.1.2 REST-Endpoints

Unter `/api/v1/pricing-catalogs`, folge den Konventionen aus dem bestehenden `CraftsmenController`:

- `GET /pricing-catalogs?craftsmanId=&trade=` — Versionen listen (neueste zuerst).
- `GET /pricing-catalogs/:versionId` — eine Version inkl. Positionen, Zuschlägen, Rabatten.
- `POST /pricing-catalogs` — neue `DRAFT`-Version für `(craftsmanId, trade)` anlegen.
- `PATCH /pricing-catalogs/:versionId` — eine `DRAFT` editieren (Positionen, Zuschläge, Rabatte, `effectiveFrom`).
- `POST /pricing-catalogs/:versionId/publish` — auf `PUBLISHED` umstellen.
- `POST /pricing-catalogs/:versionId/quote` — gegen diese exakte Version quoten.
- `POST /craftsmen/:id/trades/:trade/quote` — gegen die aktuell `PUBLISHED` und aktive Version für diesen Craftsman+Trade quoten. (Time-Travel — also Quoting gegen eine *vergangene* aktive Version per `?at=<ISO>` — ist in §3.4.3 und optional.)

Unter `/api/v1/trades`, **ergänze**:

- `PATCH /trades/:trade` (nur ADMIN) — `displayName` und/oder `pricingSchema` eines Trades aktualisieren.
- Der Handler muss Updates ablehnen, deren neues `pricingSchema` *bestehende* Positionen auf irgendeiner Katalog-Version dieses Trades invalidieren würde. Entweder:
  - Das Patch mit `409 Conflict` und einer Liste der betroffenen Positionen ablehnen, **oder**
  - Das Patch akzeptieren und betroffene publizierte Versionen als `SCHEMA_DRIFTED` (o. ä.) markieren.
  - Beides ist okay — dokumentiere die Entscheidung im `DESIGN.md`.

Alle Endpoints sind mit Swagger dokumentiert, mit `class-validator`-DTOs validiert, und durch den bestehenden `JwtAuthGuard` + `RolesGuard` abgesichert.

#### 3.1.3 Autorisierung

- `ADMIN`: vollständiges CRUD auf jedem Craftsman-Katalog.
- `CRAFTSMAN` (partner-portal-Token): Lesen/Schreiben **nur** für Kataloge, deren `craftsmanId` dem aus dem JWT-Claim (`craftsmanId`) gebundenen Craftsman entspricht.
- Row-level-Checks gehören in den Service, nicht in den Controller.

#### 3.1.4 Quote-Calculator — der analytische Kern

Der Quote-Endpoint nimmt eine Liste `{positionKey, quantity, appliedSurchargeKeys?}` und liefert:

- Pro Zeile: brutto, netto, angewendete Zuschläge, angewendete Rabatte.
- Pro MwSt.-Satz: Nettosumme, MwSt.-Betrag, Bruttosumme.
- Quote-Totals: netto, Gesamtrabatt, MwSt., brutto.

Implementierungsregeln:

1. **Die Geld-Repräsentation ist Deine Entscheidung.** Wähle eine Repräsentation, die die Math unten ohne Korrektheits-Überraschungen trägt, und wende sie durchgängig an. Dokumentiere die Wahl — und die Begründung — im `DESIGN.md`. Dasselbe gilt für die Response-Form: entscheide, was eine Number ist, was ein formatierter String, und wo formatiert wird.
2. **Die Auswertungsreihenfolge ist Teil des Vertrags.** Dokumentiere die Reihenfolge im `DESIGN.md` und begründe sie. Unser Vorschlag (Du darfst abweichen, wenn Du es verteidigen kannst):
   1. `lineNet = quantity × netPrice`
   2. Pro-Zeilen-Zuschläge anwenden: Flats summieren; Prozente multiplikativ verketten.
   3. Katalog-Rabatte in Deklarationsreihenfolge anwenden. Ein Prozent-Rabatt mit Cap wendet den Cap *vor* dem Stack mit dem nächsten Rabatt an.
   4. Übriges Netto nach `vatRate` gruppieren; MwSt. pro Gruppe berechnen; aufsummieren.
3. **Die Rundung ist Teil des Vertrags.** Sobald irgendwo ein Prozentsatz angewendet wird, entstehen fractional minor units. Entscheide eine Rundungsregel, beschreibe sie im `DESIGN.md` mit einem konkreten Beispiel, und wende sie konsistent an. Eine funktionierende Implementierung mit undokumentierter oder inkonsistenter Rundungsregel ist nicht akzeptabel.
4. **Gemischte MwSt.-Sätze in einer Quote sind valide** und müssen gruppiert und pro Satz ausgewiesen werden.
5. **Quantitäten außerhalb `[minQuantity, maxQuantity]`**, unbekannte `positionKey`, Zuschlag-Keys die nicht auf der Position deklariert sind, sowie deaktivierte Craftsmen liefern alle ein `400` mit präziser Fehlermeldung.

#### 3.1.5 Concurrency beim Publish

Zwei gleichzeitige `POST .../publish`-Calls auf unterschiedliche Drafts derselben `(craftsmanId, trade)` müssen in genau einer `PUBLISHED`-Version enden. Wähle eine Strategie:

- Ein unique partial index `WHERE status = 'PUBLISHED' AND <interval-overlap>`.
- Ein `SELECT … FOR UPDATE` auf einer Parent-Row.
- Ein Postgres advisory lock auf `(craftsmanId, trade)` gekeyed.

Implementiere sie. Begründe die Wahl — und lehne die anderen beiden explizit ab — im `DESIGN.md`.

#### 3.1.6 Migrations

- Nutze die TypeORM-Migration-API (kein rohes SQL `CREATE TABLE`).
- Referenziere Tables mit dem `pricing_service.`-Schema-Prefix.
- Editiere niemals eine Migration, die bereits im Repo liegt. Immer eine neue Migration hinzufügen.

Siehe `apps/services/pricing-service/src/migrations/1704067200000-Init.ts` für das Muster.

#### 3.1.7 Tests

Backend-Coverage ist **Pflicht**. Decke mindestens ab:

- Happy Paths für jeden Endpoint.
- Einen Draft zweimal publishen (zweiter Call schlägt fehl).
- Eine publizierte Version editieren (wird abgelehnt).
- Quote mit: unbekannter Position, Quantity außerhalb `[min, max]`, nicht deklariertem Zuschlag, gemischten MwSt.-Sätzen, Prozent-Rabatt mit Cap, mehreren gestapelten Rabatten, Zero-Quantity-Line, leerer Line-Liste.
- Autorisierung: Craftsman A kann Craftsman Bs Katalog unter keinem Endpoint lesen/schreiben.
- Concurrent Publish: zwei parallele Calls simulieren; genau einer gewinnt.
- Schema-Validator: Happy Path + jeder Failure-Mode + die `dependsOn`-Regel + unbekanntes Feld.
- Idempotency-Tests — nur falls Du §3.4.1 implementiert hast.
- **Mindestens ein Property-Style- / Invariant-Test auf dem Calculator.** Wähle, was in Deinem Design am natürlichsten ist:
  - Brutto ≥ Netto für nicht-negative Inputs.
  - Summe der per-Rate-MwSt. = ausgewiesene Gesamt-MwSt.
  - Ein `0%`-Zuschlag oder `0`-Flat-Zuschlag ist ein No-Op.
  - Alle Quantitäten zu verdoppeln verdoppelt die Netto-Summe exakt.

  Mehr als einen Invariant-Test gerne, ist aber nicht Pflicht. `fast-check` ist okay; eine handgeschriebene Loop über einen Generator ist auch okay.

### 3.2 Frontend (partner-portal) — sekundärer Fokus

Ergänze **eine Seite**: *Mein Preiskatalog*. Erreichbar über die bestehende Navigation.

- Ein MUI `Tab` pro Trade-Kategorie, der der eingeloggte Craftsman zugeordnet ist.
- Pro Tab:
  - Falls eine `DRAFT` für den Trade existiert, zeige sie als editierbare Tabelle. Sonst eine CTA *„Neue Draft aus aktuell aktiver Version starten"* (oder, falls es keine aktive Version gibt, *„Leere Draft starten"*).
  - Die Tabelle listet Positionen mit Key, Label, Unit, Nettopreis (Euro-formatiert), MwSt.-Satz und einer Zusammenfassung der trade-spezifischen Attribute.
  - Position hinzufügen/editieren öffnet einen MUI `Dialog` mit `react-hook-form`. Das Form **rendert die trade-spezifischen Attribut-Felder aus dem `pricingSchema` vom Backend** — nicht hardcoded. Das ist der Teil, den wir am genauesten anschauen.
  - Position löschen mit Bestätigung.
  - **Publish**-Button mit Bestätigungs-`Dialog`.
- Ein *Try a quote*-Panel unter der Tabelle: Positionen wählen, Quantitäten eintragen, *Calculate* drücken — zeigt das vom Backend zurückgegebene Breakdown. Damit ist die End-to-End-Schleife durchgespielt.

Konventionen:

- Nur MUI-Komponenten und Theme-Tokens. Keine hardcoded Farben, Größen oder rohes `<div>`-Flexbox.
- Alle nutzersichtbaren Strings in `de.json` und `en.json`. Deutsch in **„du"-Form**.
- `react-hook-form` mit MUI-Inputs und `helperText` / `error` für Validierung.
- Loading-, Empty- und Error-States sind Pflicht.
- Mutationen zeigen einen `Snackbar` bei Success und Failure.

Siehe `apps/partner-portal/src/pages/ProfilePage.tsx` für die Konventionen in der Praxis.

Tests: **nur Datenverarbeitung**. Wir wollen keine Pixel- oder Visual-Regression-Tests. Decke ab:

- Mapping Backend-Version-Response → Tabellenzeilen.
- Mapping `pricingSchema` → Form-Feld-Definitionen.
- Quote-Response → Breakdown-Zeilen.
- Ein kleiner Integrationstest auf die Validation-Error-Anzeige des Dialog-Forms.

### 3.3 Frontend (admin-portal) — Schema-Konfiguration

Ergänze einen **Schema-Editor** auf der bestehenden *Trade-Konfiguration*-Seite (oder einer Child-Route unter `/trades/:code`). Der Editor lässt einen Admin die `pricingSchema.fields[]` eines Trades verwalten — *nicht* durch direktes JSON-Editieren, sondern über ein strukturiertes Formular.

Pro Feld im Schema kann der Admin konfigurieren:

- **Name** (string, required, eindeutig im Schema).
- **Typ** (einer aus `string`, `number`, `boolean`, `enum`).
- **Required** (boolean).
- **Numerischer Bereich** (`min` / `max`) — nur sichtbar bei type = `number`.
- **Erlaubte Werte** (Liste von Strings) — nur sichtbar bei type = `enum`.
- **`dependsOn`** (optional) — ein `{ field, equals }`-Paar, das ein anderes, bereits definiertes Feld und den aktivierenden Wert auswählt.

Der Editor muss unterstützen: ein Feld anlegen, ein bestehendes Feld editieren, ein Feld löschen, Felder umsortieren (Drag-and-Drop ist nicht nötig — Up-/Down-Buttons reichen), und das resultierende Schema per `PATCH /trades/:trade` speichern.

UI-Anforderungen:

- Durchgängig MUI, nur Theme-Tokens.
- `react-hook-form` für den Feld-Edit-Dialog, mit `helperText` / `error` für Validierung.
- Der „Typ"-Select ist die Source of Truth: Wechsel von `number` → `enum` löscht `min`/`max` und zeigt das Allowed-Values-Input.
- Loading-, Empty-, Error-States (ja, auch für den *noch keine Felder*-Fall — zeig eine CTA „Erstes Feld anlegen").
- Zeig ein klares Konflikt-Banner, falls das Backend das Patch mit `409` ablehnt (der „bestehende Positionen werden invalidiert"-Fall).
- i18n: sowohl `de.json` als auch `en.json`, Deutsch in **„du"-Form**.

Siehe `apps/admin-portal/src/pages/TradesPage.tsx` für die geseedete Read-only-Liste und ein kleines Datenverarbeitungs-Test-Muster. Dein Editor lebt darüber (oder ersetzt die Pro-Zeilen-Interaktion auf der Seite).

Tests: nur Datenverarbeitung. Decke ab:

- Schema → Editor-Form-State-Mapping (und zurück).
- Validierung: doppelte Field-Namen, numerisches `min > max`, leere Enum-Liste, `dependsOn` auf unbekanntes Feld.
- Ein kleiner Integrationstest: Wechsel des Typs `number` → `enum` löscht die irrelevanten Inputs.

### 3.4 Optional — falls Zeit übrig ist

Die Items hier sind **nicht Pflicht** für die Hire-Bar. Überspringe sie ohne Punktabzug, falls Deine Kernarbeit länger dauert. Falls Du eines angehst, erwähne es im `DESIGN.md` mit einer kurzen Notiz, was Du dafür ausgelassen hast.

Wenn beide Kernbahnen (Backend §3.1 + beide Portale §3.2 / §3.3) gut aussehen und Du noch ein paar Stunden Zeit übrig hast, wähle **eines** der drei unten — nicht alle. Wir suchen Breite an Signal, nicht Breite an halbfertigen Features.

#### 3.4.1 Idempotency auf Quote

Die beiden Quote-Endpoints akzeptieren einen optionalen `Idempotency-Key`-Header. Im 24-Stunden-Fenster:

- Derselbe Key + selber Request-Body → die gecachte Response zurück (byte-identisch zum Original).
- Derselbe Key + anderer Request-Body → `409 Conflict`.
- Kein Key → kein Caching.

Tests müssen beide Branches abdecken.

#### 3.4.2 Infrastructure-as-Code — den Stack auf AWS deployen

Ergänze ein `terraform/`-Verzeichnis im Repo-Root mit einer Terraform-Konfiguration, die ein funktionierendes Deployment aller vier Services auf AWS provisioniert:

- **Networking** — eine VPC mit Public- und Private-Subnets über mindestens 2 AZs.
- **Datenbank** — eine einzelne RDS-PostgreSQL-Instanz in den Private-Subnets, abgesichert durch eine dedizierte Security Group, die nur von den ECS-Services aus erreichbar ist.
- **Container-Registry** — eine ECR-Repository pro Service-Image (`auth-service`, `pricing-service`, `partner-portal`, `admin-portal`).
- **Compute** — ein ECS-Cluster auf Fargate, mit einer Task Definition + einem Service pro Container.
- **Ingress** — ein Application Load Balancer in den Public-Subnets. Host- oder pfadbasiertes Routing legt offen:
  - `https://api.<your-domain>/auth/...` → auth-service
  - `https://api.<your-domain>/pricing/...` → pricing-service
  - `https://admin.<your-domain>` → admin-portal (oder Admin-Pfad auf derselben Domain)
  - `https://app.<your-domain>` → partner-portal
- **Secrets** — `JWT_SECRET` und das RDS-Master-Passwort in AWS Secrets Manager (oder SSM Parameter Store) gespeichert und über `secrets:`-Referenzen in die Task Definitions injiziert; niemals hardcoded.
- **Observability** — CloudWatch Logs pro Service mit sinnvoller Retention konfiguriert.

Anforderungen:

- Die Konfiguration muss `terraform plan` mit ein paar sandbox-spezifischen Variablen (Region, Domain, Image-Tags) sauber durchlaufen. **`terraform plan` ist das Deliverable; Du musst kein `terraform apply` laufen lassen.** Verifiziere gegen LocalStack (empfohlen — Setup unten) oder gegen einen echten AWS-Account, Deine Wahl.
- Nutze Terraform-**Module** für wiederverwendbare Formen (z. B. ein `ecs_service`-Module viermal aufgerufen). Keine vier nahezu identischen Copy-Paste-Resources.
- State-Backend stubbed: `terraform { backend "local" {} }` ist okay. Wir brauchen kein verkabeltes Remote-Backend.
- Eine kurze `terraform/README.md` deckt: Pflichtvariablen, wie man planned, und Caveats (z. B. ACM-Zertifikat und DNS-Records sind out-of-band).

Wir verlangen nicht, dass das production-hardened ist (kein WAF, kein Autoscaling, kein Blue/Green). Wir wollen das Grundgerüst eines Deployments, von dem ein AWS-vertrauter Engineer aus weiterbauen könnte.

Verifikation:

- `terraform fmt -check` läuft sauber.
- `terraform validate` läuft sauber.
- `terraform plan` produziert einen Plan ohne Errors und ohne offensichtlich falsche Resources (z. B. eine öffentlich exponierte RDS).

##### Verifikations-Ziel — LocalStack

Du brauchst keinen AWS-Account. Wir liefern ein opt-in LocalStack-Compose plus ein Terraform-Provider-Snippet, mit dem Du alles lokal verifizieren kannst:

```bash
# LocalStack auf http://localhost:4566 hochfahren.
docker compose -f infrastructure/localstack-compose.yml up -d

# Den Beispiel-Provider in Deinen terraform/-Workspace kopieren.
cp infrastructure/localstack-provider.tf.example terraform/localstack/provider.tf

# Gegen LocalStack planen.
cd terraform/localstack && terraform init && terraform plan

# Wieder runterfahren.
docker compose -f infrastructure/localstack-compose.yml down -v
```

`terraform plan` ist das Deliverable — das ist, was wir laufen lassen. Mach Dir um `apply` keine Sorgen; wir brauchen die Resources nicht tatsächlich angelegt. Wenn Dein Plan gegen das kostenlose Community-Image von LocalStack sauber durchläuft, bist Du fertig.

#### 3.4.3 Time-Travel-Quote

Erweitere `POST /craftsmen/:id/trades/:trade/quote` um einen optionalen `?at=<ISO>`-Query-Parameter, der die zum Zeitpunkt aktive Version auflöst.

- Kein `at` (oder `at = now`) → quote gegen die aktuell aktive Version (das ist bereits das Pflicht-Verhalten aus §3.1.2).
- `at` in der Vergangenheit → quote gegen die zu diesem Zeitpunkt aktive Version.
- Keine Version an diesem Datum aktiv → `404` mit klarer Fehlermeldung.
- `at` in der Zukunft → quote gegen die Version, die *sein wird* (oder `404`, falls keine geplant ist).
- Craftsman existiert, ist aber inaktiv → `403`.

Eine Quote gegen eine publizierte Version von vor sechs Monaten muss dieselben Zahlen liefern, die sie vor sechs Monaten geliefert hätte. Die Audit-Replay-Eigenschaft ist nicht verhandelbar — wenn Du das implementierst, stelle die Determinismus-Eigenschaft sicher oder überspring das Item.

Ergänze Tests für: ein vergangenes Datum mit mehreren historischen Versionen, ein Datum vor jeder effektiven Version, die Grenze direkt auf `effectiveFrom`, einen inaktiven Craftsman, und ein zukünftiges Datum.

---

## 4. Out of Scope — nicht bauen

- Die vollständige Offer-Generator-UI.
- PDF- / Dokument-Export von Quotes oder Katalogen.
- Eine Customer-Portal-Vergleichstabelle.
- Andere Admin-Seiten jenseits des Trade-Schema-Editors (kein User-Management, kein Audit-Log-UI, etc.).
- CRM- / externer Sync.
- Realtime-Updates.
- Eine „History"-Ansicht alter Katalog-Versionen (gerne als Future Work im `DESIGN.md` erwähnen).
- Drag-and-Drop-Reordering im Schema-Editor — Up-/Down-Buttons reichen.
- Eine Live-„Preview" der gerenderten Partner-Form innerhalb des Admin-Editors (wäre nett; nicht Pflicht).

Falls Du Lust verspürst, etwas davon zu bauen, ist das ein Signal zu stoppen und stattdessen einen Absatz ins `DESIGN.md` zu schreiben.

---

## 5. Konventionen, an die Du Dich halten musst

Sind in der `CONVENTIONS.md` im Repo-Root definiert. Highlights:

- **Package Manager:** Sandbox kommt mit `yarn`; wechsle auf `npm` / `pnpm`, wenn Dir das lieber ist — bleib konsistent.
- **Migrations:** TypeORM-API, `pricing_service.`-Schema-Prefix, niemals bestehende Migrations editieren.
- **TypeScript:** kein `any` außerhalb von Test-Files; kein `eslint-disable` ohne Begründung.
- **i18n:** keine statischen User-Strings; sowohl `de.json` als auch `en.json`; **„du"-Form** im Deutschen.
- **Money:** wähle eine konsistente Repräsentation, dokumentiere sie, wende sie überall an.
- **MUI:** Komponenten aus `@mui/material`, Styling über `sx` / Theme-Tokens, kein Tailwind / styled-components / hardcoded Farben.
- **Forms:** `react-hook-form` + MUI-Inputs + `helperText` / `error`.
- **Loading- / Empty- / Error-States sind nicht optional.**
- **Test-Files** liegen neben dem Source-File als `*.spec.ts(x)`.

---

## 6. Deliverables

1. Dein Code, lauffähig per `docker-compose up` (oder `podman-compose up`).
2. `DESIGN.md` im Repo-Root, **maximal 2 Seiten**, deckt ab:
   - Dein Datenmodell — und speziell, wie Du mit der per-Trade-Attribut-Variabilität umgehst.
   - Deine Money-Repräsentation (Storage + Arithmetik) und warum.
   - Die Quote-Auswertungs-Reihenfolge mit Begründung.
   - Deine Rundungsregel mit konkretem Beispiel.
   - Deine Concurrency-on-Publish-Entscheidung mit den zwei verworfenen Alternativen und warum.
   - Dein Verhalten, wenn ein Admin-Schema-Patch bestehende Positionen invalidieren würde (Reject vs. Drift markieren).
   - Wie das in Richtung der vollen Pricing Engine + Offer-Generator skaliert. Ein Absatz.
   - Was Du gekürzt hast und warum.
   - **KI-Nutzung** — wo Du KI-Assistenz eingesetzt hast (nach Bereich, nicht nach Prompt-Log) und wie Du das Ergebnis validiert / reviewed hast. Siehe Policy in §2.
3. Eine aktualisierte `README.md` (oder ein kurzer Abschnitt im `DESIGN.md`), der beschreibt, wie man die Migrations, die Services und die Tests laufen lässt.

### Abgabe

Wenn die Arbeit fertig ist:

1. Lege ein **privates GitHub-Repository in Deinem eigenen Account** an und pushe Deine Arbeit dorthin.
2. Lade **`christopher.maeuer@deutsche-sanierungsberatung.de`** als Collaborator ein (GitHub → Settings → Collaborators → Add people, per E-Mail).
3. Antworte auf den E-Mail-Thread, in dem wir die Terminierung gemacht haben, dass Dein Repo bereit ist, und füge die Repo-URL bei.

### Commit-Hygiene

Wir erwarten, dass das Repo mit **inkrementeller Commit-History** kommt, die zeigt, wie die Arbeit tatsächlich entstanden ist — nicht ein einziger squashed „initial commit".

- Committe jeden logischen Chunk (Entity + Migration; Calculator-Skeleton; Calculator + Tests; Concurrency-Handling; etc.) als eigenen Commit.
- Schreib die History nicht vor der Abgabe um. Falsche Anfänge, Fixes und kleine Refactors sind *gutes* Signal — so arbeiten Engineers nun mal.
- Commit-Messages im imperativen Präsens (*„Add quote calculator"*, *„Fix off-by-one in cap-stacking"*).
- Nicht zu einer sauberen Linie squashen; wir sehen lieber den echten Verlauf der Arbeit.

Verifiziere auf einem sauberen Clone vor der Abgabe, dass `docker compose up --build` (oder `podman-compose up --build`) den Stack End-to-End hochfährt, und dass `node_modules/` / `dist/` gitignored sind.

---

## 7. Zeitvorschlag

Das ist eine Orientierung, kein Vertrag. Steck Deine Zeit dorthin, wo sie am meisten zählt.

| Block | Stunden |
|---|---|
| Repo, `CONVENTIONS.md`, bestehende `craftsmen`- + `trades`-Muster lesen | 1 |
| `DESIGN.md` erster Draft | 0,5 |
| Entities + Migrations + DTOs | 1,5 |
| Calculator + Tests (der analytische Kern) | 2 |
| Publish-Concurrency + Tests | 1 |
| Schema-getriebener Attribut-Validator + `PATCH /trades/:trade` + Tests | 1,5 |
| Admin-Portal-Schema-Editor + Datenverarbeitungs-Tests | 2 |
| Partner-Portal-Seite + dynamisches Form + Datenverarbeitungs-Tests | 1,5 |
| `DESIGN.md` Final Pass + README + Cleanup | 0,5 |

Für die **optionalen** Items in §3.4 (Idempotency-Keys, Terraform/ECS/RDS), wähle **höchstens eines**, falls Du noch Stunden übrig hast und Dein Signal verbreitern möchtest. Das gesamte §3.4 überspringen hat keinen Punktabzug — die Entscheidung im `DESIGN.md` festhalten.

Viel Erfolg — und hab Spaß.
