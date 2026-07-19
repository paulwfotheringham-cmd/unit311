# Functional Design Review — MOD-092 Logistics

| Field | Value |
| --- | --- |
| **Module ID** | MOD-092 |
| **Module name** | Logistics |
| **Navigation** | Assets → Assets → Logistics |
| **View id** | `logistics` |
| **Go-Live status (current)** | **READY** |
| **FDR status** | **APPROVED** — canonical architectural specification for MOD-092 |
| **Architecture** | **COMPLETE** — **FROZEN** |
| **Implementation readiness** | **APPROVED** — Ready for Implementation (build not authorised by sign-off alone) |
| **Approved** | 2026-07-19 |
| **Architecture sign-off** | 2026-07-19 |
| **Related modules** | MOD-090 Assets · MOD-091 Inventory · Projects · Engineering · Clients · Employees · Financials · Support Desk · Calendar |
| **Related PRMs** | PRM-001 (Client) · PRM-002 (Workspace) · [PRM-003 – Platform Integrations](./PRM-003-PLATFORM-INTEGRATIONS.md) (**APPROVED** — Shipping Providers / Integration Framework) |
| **Canonical objects** | **Shipment** · **Shipping Provider** · **Workspace Provider Connection** · **Chain of Custody Event** · **Proof of Delivery** |
| **Canonical store (current)** | None (in-memory mock only) |
| **Date** | 2026-07-19 |

---

## Governing statement

**Logistics is the operational module for shipment execution** — shipments, tracking, chain of custody, delivery workflow, collections, returns, transfers, and proof of delivery.

Logistics must be **completely workspace-agnostic with respect to couriers**.

It must **not** be designed around specific courier companies.

Instead, the platform uses **Shipping Providers** within a reusable **Integration Framework**:

```
Shipping Provider
  → Workspace Connection
    → Shipments
      → Tracking / Chain of Custody
        → Proof of Delivery
```

Each workspace may connect **one or more** shipping providers. Logistics must **never assume** which courier a workspace uses.

This document is the **approved canonical design** for MOD-092. Implementation must conform to it — including **Implementation Guardrails**.

**Architecture is FROZEN** (see Architecture Sign-Off). No further architectural changes unless a genuine implementation blocker is discovered, a cross-platform decision requires revision, or a future phase explicitly extends approved scope. Future enhancements must be captured separately and must **not** modify the approved Phase 1 architecture.

---

## Binding architectural principles

### Shipping Providers (courier-agnostic)

1. **Logistics is courier-agnostic.** No hard-coded assumption that a workspace uses FedEx, DHL, UPS, Royal Mail, or any other named carrier.  
2. **Shipping Providers** are first-class entities in an **extensible Provider Registry**.  
3. **Workspace Connections** bind a workspace to providers with credentials and preferences.  
4. **Shipments** reference a workspace connection (or manual path), not a free-text carrier brand as system of record.  
5. **APIs preferred when available**; **manual mode always supported**.  
6. **Adding a provider must not require redesigning Logistics.**

### Stack

| Layer | Responsibility |
| --- | --- |
| **Shipping Provider** | Registry definition (capabilities, countries, auth types) |
| **Workspace Connection** | Enabled instance (credentials, defaults, templates, health) |
| **Shipments** | Primary Logistics business object |
| **Tracking / Chain of Custody** | Permanent movement audit trail |
| **Proof of Delivery** | Provider-independent delivery confirmation |

---

## Implementation Guardrails (mandatory)

The following architectural principles are **mandatory** for any MOD-092 implementation. They supersede conflicting implementation shortcuts. Violations require an explicit FDR amendment — not silent deviation.

### 1. Manual-first

- The Logistics module **must work without any external provider**.  
- The **Manual Provider always exists**.  
- It **cannot be deleted**.

### 2. Workspace agnostic

- **No courier names** may be hard-coded as system of record.  
- All providers originate from the **Provider Registry**.

### 3. PRM-003

- All provider connections must use the **Platform Integration Framework** ([PRM-003](./PRM-003-PLATFORM-INTEGRATIONS.md)).  
- **No Logistics-specific authentication** implementation (no module-local credential vault, OAuth, or connection lifecycle).

### 4. Shipment first

- The **Shipment** is the primary business object.  
- Providers **execute** shipments.  
- They do **not** own shipment data.

### 5. Provider optional

A shipment may be:

- **Manual**  
- **Provider-backed**  

Both follow the **same** canonical lifecycle (§A).

### 6. Canonical lifecycle

- Every provider maps into the **approved shipment lifecycle** (§A).  
- Provider statuses **never** become platform statuses (raw provider codes are secondary/audit only).

### 7. Never duplicate data

- Assets own assets.  
- Inventory owns inventory.  
- Projects own projects.  
- Logistics **references** them (lines / business refs) — it does not reinvent masters.

### 8. Permanent IDs

- Shipment numbers: **`SHP-000001`** (workspace-scoped sequence).  
- **Never reused.**

### 9. Phase scope

**Only implement Phase 1.**

Do **not** implement:

- Consignments  
- Carrier optimisation (cheapest / fastest / auto-select)  
- Customs  
- Multi-leg shipping  
- Warehouse optimisation  

(See §F for deferred scope.)

### 10. Design system

- Use **shared platform components**.  
- **No Logistics-specific UI components** where a shared component already exists.

---

## Approved architectural amendments (binding)

The following sections are **binding** and supersede any earlier draft wording where they conflict.

---

## A. Shipment Lifecycle

Every shipment follows a **standard lifecycle independent of the shipping provider**.

### Happy path

```
Draft
  → Planned
  → Packed
  → Collected
  → In Transit
  → Out for Delivery
  → Delivered
  → Completed
```

### Alternative outcomes

- Returned  
- Cancelled  
- Failed Delivery  
- Lost  
- Damaged  

### Provider status mapping

Providers may expose different status names. Those statuses **must map into this standard lifecycle**. Logistics UI and reporting use the standard lifecycle; provider-native codes may be stored as secondary/raw fields for audit.

---

## B. Shipment Object

The **Shipment** is the primary business object owned by Logistics.

### Contents

A shipment may contain **one or more** of:

- Assets  
- Inventory Items  
- Documents  
- Equipment  
- Samples  
- Parts  
- Other future item types  

Contents are line items / linked references — not duplicated master data from owning modules.

### Optional references

A shipment may optionally reference:

- Client (PRM-001)  
- Project  
- Employee  
- Engineering Job  
- Support Ticket  

### Ownership

**Logistics owns the shipment.**  
**Other modules reference the shipment** (`shipment_id`).  
No other module should duplicate shipment information.

---

## C. Chain of Custody

Maintain a **complete movement history**. Nothing is deleted.

Each custody / movement event records:

| Field | Required |
| --- | --- |
| Date/Time | Yes |
| Event | Yes |
| Location | Yes (as known) |
| Responsible Employee | When applicable |
| Shipping Provider | When applicable |
| Tracking Number | When applicable |
| Notes | Optional |

Movement history is the **permanent audit trail** for the shipment. Provider tracking updates and manual entries both append events; they do not overwrite or erase prior events.

---

## D. Proof of Delivery

Proof of Delivery is **provider-independent**.

Support:

- Recipient Name  
- Signature  
- Delivery Photo  
- Delivery Timestamp  
- Courier Reference  
- Notes  

If a provider exposes POD via API, **retrieve it**.  
Otherwise allow **manual upload / entry**.

---

## E. Integration Principles

Logistics integrates with:

- Assets  
- Inventory Management  
- Projects  
- Engineering  
- Clients  
- Employees  
- Financials  
- Support Desk  
- Calendar  
- Shipping Providers  

**Logistics owns shipment execution only.**

| Rule | Meaning |
| --- | --- |
| No duplicate shipments | Other modules must not invent parallel shipment records |
| Reference outward | Other modules store `shipment_id` when they need logistics context |
| Masters stay put | Asset / inventory / client / employee masters remain in their owning modules; shipments link to them |

---

## F. Future Scope

Recognise but **exclude from Phase 1**:

- International customs documents  
- Dangerous goods  
- Freight forwarding  
- Multi-leg shipments  
- Route optimisation  
- Carrier rate comparison  
- Multi-provider shipment splitting  
- Warehouse optimisation  
- **Automatic provider selection**  
- **Cheapest carrier / Fastest carrier** routing  
- **Regional routing rules**  
- Advanced **multi-provider organisation** policies beyond simple default + per-shipment choice  

Architecture (Shipment, contents polymorphism, custody events, provider capabilities, Integration Framework, multi-connection model, onboarding §M) must remain able to support these later **without redesign**.

---

## G. Integration Framework

The Shipping Provider framework follows the **same architectural pattern** as other future platform integrations.

**Canonical specification:** [PRM-003 – Platform Integrations](./PRM-003-PLATFORM-INTEGRATIONS.md) (**APPROVED**). PRM-003 is the platform Integration Framework; this FDR’s Shipping Providers are the first category instance.

This pattern is **reusable** for:

- Shipping Providers  
- Payment Providers  
- Communication Providers  
- Identity Providers  
- Other external services  

Each integration supports:

| Capability | Purpose |
| --- | --- |
| Enable / Disable | Soft switch per workspace connection |
| Authentication | Per integration type (API, OAuth, key, username/password, etc.) |
| Connection Wizard | Guided setup |
| Test Connection | Validation action |
| Health Status | Connected / degraded / failed / manual |
| Capability Discovery | What the connection can do (labels, tracking, POD, webhooks, …) |

This becomes the **standard Integration Framework** for the platform. Shipping Providers are the first concrete instance; Logistics must not invent a one-off credential model that cannot be reused.

---

## Shipping Provider Registry

Maintain a platform-level registry:

| Field | Purpose |
| --- | --- |
| Provider Name | Display name |
| Provider Code | Permanent stable id |
| Supported Countries | Recommendation / eligibility |
| API Available | Yes / No |
| OAuth Supported | Yes / No |
| Connection Types | API · OAuth · Username/Password · API Key · Manual · CSV Import |
| Label Support | Yes / No |
| Tracking Support | Yes / No |
| Rate Support | Yes / No (future — §F) |
| Proof of Delivery | Yes / No |
| Webhooks Available | Yes / No |
| Default Tracking URL Template | Optional |
| Notes / docs URL | Operator guidance |

**Extensibility:** add providers via registry data without redesigning Logistics. Country examples (US, UK, EU, Japan carriers) in prior draft remain **illustrative only**.

---

## Ownership restatement

### Shipping Providers / Integration Framework own

- Registry definition  
- Credentials (on Workspace Connection)  
- API / OAuth / auth configuration  
- Provider capabilities and health  

### Logistics owns

- Shipments (primary object)  
- Shipment contents links  
- Standard lifecycle status  
- Chain of custody / tracking history  
- Proof of Delivery  
- Collections / returns / transfers as Logistics workflows  
- Workspace Logistics onboarding state (Manual enabled / wizard completed) — **not** provider credentials  

---

## Workspace configuration & Connection Wizard

**Superseded for onboarding, marketplace, and wizard detail by binding §M below.** Workspace Provider Management (§M) is the ongoing admin surface for connections, health, and defaults.

---

## M. Workspace Onboarding Experience (binding)

**Applies only to MOD-092 Logistics.**

**Logistics must support organisations of all sizes** — especially small and medium-sized businesses.

A new workspace must be able to use Logistics **immediately** without any external integrations.

**No workspace may be forced to integrate with a courier before using Logistics.**

### Relationship to Workspace First Login Wizard

The existing **Workspace First Login Wizard** remains **unchanged**.

Logistics setup is a **separate** experience:

| Wizard | Scope |
| --- | --- |
| Workspace First Login Wizard | Platform / workspace — **unchanged** |
| **Workspace Logistics Setup Wizard** | **MOD-092 only** — first time the workspace enters Logistics with no Logistics configuration |

---

### Objective — two customer types (SMB-first)

Most Unit311 clients are SMBs. Most fall into one of two categories:

| Type | Profile | Logistics must |
| --- | --- | --- |
| **1** | No corporate shipping account — want to **record** shipments and tracking numbers | Work fully via **Manual Logistics** |
| **2** | Have a business courier account (e.g. FedEx, UPS, Royal Mail, DHL) but **no knowledge of APIs** or how to connect | Be **guided** through account + credentials + PRM-003 connection — not dumped into “paste API keys” |

The module must support **both**.

---

### Workspace Logistics Setup Wizard (first enter)

The **first time** a workspace enters the Logistics module, **if no Logistics configuration exists**, launch the **Workspace Logistics Setup Wizard** (MOD-092 only).

The user chooses **exactly one** of:

| Option | Label | Outcome |
| --- | --- | --- |
| **1** | **Manual Logistics** | Enable Manual provider; begin shipping immediately |
| **2** | **Connect Shipping Provider** | Country → **Provider Marketplace** → **Guided Provider Setup** → **PRM-003 Connection Wizard** when credentials are ready |

Setup / onboarding state is persisted per workspace. Users may leave and return without losing **provider setup progress** (§M Setup Progress). Manual Logistics remains usable throughout.

---

### Option 1 — Manual Logistics

Selecting **Manual Logistics** enables the module **immediately**.

Customers **without** a corporate courier account must still use Logistics at once. They can create shipments and **manually record**:

- Courier (display/name as free text or registry-suggested label — **not** a hard-coded SoT connection)  
- Tracking Number  
- Shipment Status (canonical §A)  
- Proof of Delivery  
- Notes  

Also available: Collections · Internal Transfers · Returns · Manual Tracking · Manual Status Updates.

**No API integration is required.**

The workspace may start Guided Provider Setup / Marketplace later at any time. Manual remains available **even after** external providers are connected.

---

### Manual Provider (first-class)

**Manual Logistics appears as a first-class provider** in the Provider Marketplace and in Workspace Provider Management.

| Rule | Requirement |
| --- | --- |
| Always exists | Every workspace has a Manual provider entry |
| Cannot be deleted | Remove / delete is **forbidden** for Manual |
| No credentials | No account number, API key, OAuth, or secret required |
| Always usable | Immediate Logistics use with zero external integrations |
| Capabilities | Shipment Creation · Tracking (manual) · Collections · Returns · Proof of Delivery · Status Updates (manual). Labels = manual/upload as applicable |
| Status | Always **Available** |

Manual is a platform system provider in the registry (e.g. code `manual`) — **not** a hard-coded courier brand list.

---

### Key principle — guide, do not dump credentials

**Unit311 must guide customers through connecting their shipping provider.**

Do **not** simply ask users to paste API keys with no context.

The Logistics module should **educate and assist** through the entire connection process (business account → obtain credentials → PRM-003 connect).

**Regardless of setup progress, the customer must always be able to continue using Manual Logistics.**

---

### Provider Marketplace

If the customer chooses to connect a shipping provider, display the approved **Provider Marketplace**.

**Source:** Provider Registry (PRM-003 / §G). **Never hard-code providers into the UI.**

Recommended providers are based on the selected **country or region** (registry recommendation rules).

Each **provider card** displays:

| Card field | Meaning |
| --- | --- |
| **Provider Name** | From registry |
| **Supported Countries** | From registry |
| **Connection Type** | From registry |
| **Available Capabilities** | From registry / discovery |
| **Manual Supported** | From registry |
| **Status** | e.g. Not Connected · Connected · Available (Manual) · In Progress |
| **Setup Progress** | Business Account · API Credentials · Connected (see below) |

**Example capabilities** (illustrative): Shipment Creation · Labels · Tracking · Collections · Returns · Proof of Delivery.

#### Recommended providers (illustrative only — registry SoT)

| Region / country (example) | Example recommended providers |
| --- | --- |
| **United States** | UPS · FedEx · USPS · DHL Express · OnTrac |
| **United Kingdom** | Royal Mail · Evri · DPD UK · Parcelforce Worldwide · DHL |
| **European Union** | Deutsche Post DHL · DPDgroup · GLS · PostNL · UPS · FedEx |
| **Japan** | Japan Post · Yamato Transport · Sagawa Express · Seino Transportation · DHL · FedEx |

Operators may browse / search the full marketplace beyond recommendations. Manual remains always visible.

---

### Provider Detail

Selecting a provider card opens **Provider Detail**:

| Field | Content |
| --- | --- |
| Description | Registry blurb |
| Connection requirements | What the workspace must supply |
| Corporate account required | **Yes / No** |
| Authentication method | From registry |
| Supported capabilities | Expanded list |
| Documentation link | **Future** — optional URL (e.g. provider registration / developer portal) |

From Detail the user enters **Guided Provider Setup** (external) or Confirm (Manual).

---

### Guided Provider Setup (before PRM-003 Connection Wizard)

**Do not assume** the customer already has API credentials.

After selecting a provider from the Marketplace, run **Guided Provider Setup** (Logistics-owned education UX). When credentials are ready, launch the standard **PRM-003 Connection Wizard** (auth fields, test, capabilities, finish) — **no Logistics-specific authentication implementation**.

#### Guided Step 1 — Business account

**Do you already have a business account with this provider?**

| Option | Behaviour |
| --- | --- |
| **Yes** | Proceed to Guided Step 2 |
| **No** | Explain what a business account is; why it is required for API integration; guidance on creating one. Example: *“To connect FedEx you first need a FedEx Business Account.”* Future: link to provider registration page from registry |
| **I'm Not Sure** | Same educational path as No, plus how to check |

Persist progress: Business Account = done / not done / unsure.

#### Guided Step 2 — API credentials

**Do you already have API credentials?**

| Option | Behaviour |
| --- | --- |
| **Yes** | Proceed to Guided Step 3 |
| **No** | Guide obtaining them in plain language: where to find the developer portal; how to create an application; which credentials will be required (examples: API Key · API Secret · Account Number). **Assume no technical knowledge** |
| **I'm Not Sure** | Educational path as No |

Persist progress: API Credentials = done / not done / unsure.

#### Guided Step 3 — Launch PRM-003 Connection Wizard

When the customer has (or believes they have) the required credentials, launch the **standard PRM-003 Connection Wizard**:

1. Connection method (adapts to provider registry)  
2. Enter corporate account / credential fields **required only**  
3. Test Connection (Connected / Connection Failed + diagnostics)  
4. Capability Discovery  
5. Finish (Make Default · Connect Another · Continue Manual)

Credentials stored only in Integration Framework vault (PRM-003).

Country selection may precede Marketplace (as today) and is part of the Logistics Setup Wizard flow.

---

### Setup Progress

Every external provider connection attempt displays **setup progress**, persisted so the customer can **leave and return later without losing progress**.

**Example (illustrative names — registry display names in product):**

```
FedEx
  ✓ Business Account
  ✓ API Credentials
  ✓ Connected

Royal Mail
  ✓ Business Account
  ✗ API Credentials
  ✗ Connected
```

| Checkpoint | Meaning |
| --- | --- |
| Business Account | Guided Step 1 completed affirmatively (or equivalent) |
| API Credentials | Guided Step 2 completed affirmatively (or credentials entered) |
| Connected | PRM-003 Test Connection succeeded and connection enabled |

Manual Logistics remains usable at every checkpoint.

---

### Option 2 — Connect Shipping Provider (flow summary)

```
Logistics Setup Wizard Option 2
  → Select Country / Region
  → Provider Marketplace (recommended from registry)
  → Provider Detail
  → Guided Provider Setup (business account → credentials education)
  → PRM-003 Connection Wizard (method → credentials → test → capabilities → finish)
```

---

### Connection Health

After a provider is connected (external), the workspace displays **Connection Health**:

| Field | Meaning |
| --- | --- |
| **Connected** | Connection established / enabled |
| **Last Successful Test** | Timestamp of last passed Test Connection |
| **Last Synchronisation** | Timestamp of last successful provider sync (tracking/webhooks/pull) — may be empty until Phase 3 |
| **Health Status** | Healthy · Degraded · Failed · Unknown (Integration Framework) |
| **Capabilities** | Discovered / stored capability list |
| **Reconnect** | Action to re-auth / repair |
| **Disconnect** | Action to disconnect (disable or remove connection — not available for Manual delete) |

Manual provider health is always Available; Test Connection is N/A or a no-op success; Disconnect/Remove are not offered as delete.

---

### Workspace Provider Management

Workspace administrators can manage providers from Logistics (or a Logistics providers panel respecting frozen nav):

| Action | Notes |
| --- | --- |
| **Add Provider** | Opens Marketplace → Guided Provider Setup → PRM-003 Connection Wizard |
| **Remove Provider** | External connections only — **not** Manual |
| **Disable Provider** | Soft-disable external connection; Manual cannot be disabled in a way that blocks Logistics |
| **Set Default Provider** | Including Manual |
| **Test Connection** | External connections |
| **View Health** | Connection Health panel |
| **Edit Credentials** | External connections; vault via Integration Framework |
| **View Capability List** | From stored discovery / registry |

---

### Multiple providers

A workspace may connect **multiple** external Shipping Providers **in addition to** Manual.

**Example (illustrative):** UPS · FedEx · DHL · Royal Mail — simultaneously connected, plus Manual.

When creating a shipment, the user **chooses** the provider connection (including Manual). Future default / routing rules (§F) may suggest a connection; they must not remove per-shipment choice or Manual fallback.

---

### Future routing (architecture only — not Phase 1)

The multi-connection model must allow later features **without redesign**:

- Automatic provider selection  
- Cheapest carrier  
- Fastest carrier  
- Regional routing  
- Multi-provider organisation policies  

Do **not** implement these in Phase 1.

---

### Onboarding rules (normative)

1. **Workspace First Login Wizard** is unchanged; Logistics uses a separate **Workspace Logistics Setup Wizard**.  
2. **SMB-first / two customer types** — Manual record-keeping **or** guided courier-account connection.  
3. **Zero-integration start** — Manual always present; never force a courier API.  
4. **Guide, don’t dump keys** — Guided Provider Setup before PRM-003 Connection Wizard.  
5. **Provider Marketplace** — registry-driven; never hard-code provider names.  
6. **Setup Progress** persisted (Business Account · API Credentials · Connected); leave/resume allowed.  
7. **Manual always available** during and after any setup progress.  
8. **PRM-003 only** for actual authentication / vault / test / capabilities — no Logistics-specific auth stack.  
9. **Multiple connections** — Manual + 0..N external; optional default.  
10. **Organisations of all sizes** — Manual-only SMEs to multi-carrier enterprises.

---

## API integration

Where official APIs exist: shipment create · label · cancel · tracking · delivery status · POD · rate lookup (future).

Where not: manual shipment creation, manual custody events, manual POD.

---

## 1. Objective

1. Shipments as Logistics’ primary object with standard lifecycle (§A) and rich contents/references (§B).  
2. Permanent chain of custody (§C) and provider-independent POD (§D).  
3. Courier-agnostic Shipping Providers under the platform Integration Framework (§G).  
4. Clear integration boundaries (§E); Phase 1 excludes §F items without blocking them later.  
5. Remove hard-coded carrier assumptions from the current mock.  
6. First-open **Workspace Logistics Setup Wizard** (§M, MOD-092 only): Manual **or** guided Marketplace connect — First Login Wizard unchanged; zero-integration start; guide don’t dump keys.

---

## 2. Current implementation

| Item | Today |
| --- | --- |
| UI | `LogisticsWorkspace` + `LogisticsRouteMap` |
| Data | In-memory mock (`logistics-data.ts`) — no DB/API |
| Carriers | Hard-coded FedEx / DHL / UPS / Royal Mail / Unit311 Courier |
| Settings | Preview credentials only |

### Conflicts (explicit)

| ID | Conflict | Resolution |
| --- | --- | --- |
| L-01 | Hard-coded carriers | Registry + Connections (§ Binding, §G) |
| L-02 | Hard-coded tracking URLs | Templates on registry/connection |
| L-03 | No standard lifecycle | §A |
| L-04 | No shipment contents model | §B |
| L-05 | No chain of custody | §C |
| L-06 | No provider-independent POD | §D |
| L-07 | No Integration Framework | §G |
| L-08 | No persistence | Phase 1 |
| L-09 | No first-open onboarding; implies carriers to start | §M Manual path + wizard |
| L-10 | Hard-coded courier chips / links in UI | Registry + §M (no hard-coded SoT) |

---

## 3. Recommended objects (approved)

| Object | Owner |
| --- | --- |
| ShippingProvider | Integration Framework / registry |
| WorkspaceShippingConnection | Integration Framework |
| Shipment | Logistics |
| ShipmentLine / content link | Logistics (refs to Asset, Inventory, etc.) |
| CustodyEvent | Logistics (§C) |
| ProofOfDelivery | Logistics (§D) |

Lifecycle status on Shipment uses §A only (provider raw status optional secondary field).

---

## 4. Implementation phases

**Implementation is not authorised by this approval message alone — wait for an explicit implement request.** When authorised:

### Phase 0

- Confirm Shipping Providers config placement under frozen nav  
- Confirm credential vault / Integration Framework shared tables  

### Phase 1 — Foundation

- Integration Framework shell (enable, auth, wizard, test, health, capabilities) instantiated for Shipping Providers  
- Registry seed + extensibility path  
- **§M Workspace Onboarding** — Manual **or** Marketplace + wizard; Manual system provider always present  
- Provider Marketplace · Provider Detail · Connection Health · Workspace Provider Management  
- Workspace connections + **8-step Connection Wizard**  
- Multiple external provider connections + optional default (+ Manual)  
- Persist Shipment + contents links + §A lifecycle + §C custody (manual) + §D POD (manual)  
- Remove hard-coded courier SoT from Logistics UI  
- Exclude §F items (incl. automatic / cheapest / fastest routing)  

### Phase 2 — Workflow depth

- Collections / returns / transfers  
- Richer custody + file attachments  

### Phase 3 — Provider API adapters

- Live create / label / track / POD pull / webhooks where capable  

### Phase 4 — Advanced (§F selective)

- Rates, multi-leg, customs, etc. as separately approved slices  

---

## 5. Dependencies

| Dependency | Blocking Phase 1? |
| --- | --- |
| This FDR (approved) | **Resolved** |
| PRM-002 workspace scoping | Yes |
| Nav placement for provider config | Soft (Settings/Logistics sub-route preferred if nav frozen) |
| Secrets vault | Yes for non-manual connections |
| Assets / Inventory / Clients / Employees APIs for refs | Soft (nullable refs OK) |
| Live carrier APIs | No (Phase 3) |

---

## 6. Acceptance criteria (Phase 1 gate)

### Core Logistics

- [ ] Standard lifecycle §A implemented; provider statuses mapped in  
- [ ] Shipment is primary object with multi-type contents and optional cross-module refs (§B)  
- [ ] Chain of custody append-only; no delete (§C)  
- [ ] POD provider-independent with API or manual (§D)  
- [ ] No duplicate shipment stores outside Logistics (§E)  
- [ ] §F capabilities not required to ship Phase 1; extension points exist  
- [ ] Shipping Provider connection uses Integration Framework pattern (§G)  
- [ ] Hard-coded carrier enums / provider name lists removed as system of record  

### Workspace onboarding & marketplace (§M)

A **brand-new workspace** can:

**Path A — Manual only**

1. Open Logistics → **Workspace Logistics Setup Wizard**.  
2. Choose **Manual Logistics** and begin shipping immediately (record courier, tracking, status, POD, notes).  

**Path B — Connect providers (guided)**

1. Open Logistics → Setup Wizard.  
2. Choose Connect → Marketplace (registry) → **Guided Provider Setup** (account + credentials education).  
3. Complete **PRM-003 Connection Wizard**; test connections.  
4. Begin creating shipments (Manual still available).  

**Normative checks**

- [ ] Workspace First Login Wizard **unchanged**  
- [ ] Logistics Setup Wizard only when no Logistics configuration exists  
- [ ] **No workspace is forced** to integrate with a courier before using Logistics  
- [ ] **Manual provider** always exists, cannot be deleted, requires no credentials  
- [ ] Guided Steps 1–2 before PRM-003; no “paste keys only” dead-end  
- [ ] Setup Progress persisted (Business Account · API Credentials · Connected); leave/resume  
- [ ] Manual usable at every setup progress state  
- [ ] Provider Marketplace cards registry-driven (incl. setup progress on card where applicable)  
- [ ] Provider Detail + Connection Health + Workspace Provider Management as previously specified  
- [ ] PRM-003 only for credentials / test / capabilities  
- [ ] Multiple external providers + Manual; optional default  

---

## 7. Decision log

| Decision | Outcome |
| --- | --- |
| FDR status | **APPROVED** 2026-07-19 — canonical for MOD-092 |
| Architecture | **COMPLETE / FROZEN** 2026-07-19 — Architecture Sign-Off |
| Go-Live status | **READY** 2026-07-19 — architecture complete; implementation not started |
| Pre-implementation reviews | [MOD-092-PRE-IMPLEMENTATION-REVIEWS.md](./MOD-092-PRE-IMPLEMENTATION-REVIEWS.md) — **complete and authoritative** |
| Implementation readiness | [MOD-092-IMPLEMENTATION-READINESS.md](./MOD-092-IMPLEMENTATION-READINESS.md) — **APPROVED** |
| PRM-003 | [PRM-003-PLATFORM-INTEGRATIONS.md](./PRM-003-PLATFORM-INTEGRATIONS.md) — **APPROVED** — authoritative for integrations |
| Courier model | Shipping Providers + Integration Framework |
| Lifecycle | **§A** (approved) |
| Shipment object | **§B** (approved) |
| Chain of custody | **§C** (approved) — append-only |
| POD | **§D** (approved) — provider-independent |
| Integration principles | **§E** (approved) |
| Future scope | **§F** (approved) — Phase 1 excluded |
| Integration Framework | **§G** (approved) — platform standard |
| Workspace onboarding | **§M** — **Workspace Logistics Setup Wizard** (MOD-092 only); First Login Wizard unchanged |
| Guided Provider Setup | **§M** — Business account → API credentials education → then PRM-003 Connection Wizard |
| Setup Progress | **§M** — persisted checkpoints; leave/resume; Manual always usable |
| SMB objective | Support no-account Manual users **and** account-holders without API knowledge |
| Provider Marketplace | **§M** — registry-driven cards; never hard-code provider names |
| Manual Provider | **First-class** — always exists; cannot be deleted; no credentials |
| Multiple providers | **Allowed** — Manual + 0..N external |
| Implementation Guardrails | **Mandatory** |
| Amendment | **2026-07-19** — Workspace Logistics Setup Wizard + Guided Provider Setup (authorised Phase 1 clarification under freeze: SMB implementation path) |

---

## 8. Recommendations summary (approved)

1. **Shipment** is the Logistics master execution object (§B) with standard lifecycle (§A).  
2. **Chain of custody** is permanent (§C); **POD** is provider-independent (§D).  
3. **Shipping Providers** sit on the platform **Integration Framework** (§G).  
4. **Logistics owns execution only**; others reference `shipment_id` (§E).  
5. **§M** — **Workspace Logistics Setup Wizard** (MOD-092 only); Manual or guided connect; Marketplace; Setup Progress; Manual always available.  
6. **Guided Provider Setup** educates on business account + credentials, then **PRM-003 Connection Wizard** — guide, don’t dump keys.  
7. **Manual provider** always present and undeletable; **multiple external providers** + health/admin surfaces; advanced routing is §F only.  
8. **Implementation Guardrails** (mandatory) govern all implementation.  
9. **Architecture Sign-Off** — Architecture Complete; Ready for Implementation; architecture frozen (with authorised §M amendment 2026-07-19).  
10. Sign-off / amendment does **not** itself authorise implementation, UI changes, or navigation changes.

---

## Architecture Sign-Off

| Field | Value |
| --- | --- |
| **Architecture** | **COMPLETE** |
| **Architecture freeze** | **FROZEN** |
| **Ready for Implementation** | **Yes** |
| **Implementation Readiness** | **APPROVED** |
| **Module Go-Live (architecture register)** | **READY** |
| **Date of Sign-Off** | **2026-07-19** |
| **Implementation authorised by this sign-off?** | **No** |
| **UI changes authorised?** | **No** |
| **Navigation changes authorised?** | **No** |

### Freeze rules

No further architectural changes to Phase 1 MOD-092 unless:

1. A **genuine implementation blocker** is discovered; or  
2. A **cross-platform architectural decision** requires revision; or  
3. A **future phase** explicitly extends the approved scope (§F / later).

**Authorised Phase 1 amendment (2026-07-19):** §M **Workspace Logistics Setup Wizard**, **Guided Provider Setup**, **Setup Progress**, and SMB two-customer-type objective — required so Phase 1 can serve customers without API knowledge without redesigning PRM-003.

Future enhancements must be captured in **separate** documents and must **not** modify the approved Phase 1 architecture except under the freeze rules above.

### Related documents (complete and authoritative)

| Document | Status |
| --- | --- |
| [FDR-MOD-092 Logistics](./FDR-MOD-092-LOGISTICS.md) (this document) | **APPROVED** · Architecture **COMPLETE** · **FROZEN** |
| [MOD-092 Pre-Implementation Reviews](./MOD-092-PRE-IMPLEMENTATION-REVIEWS.md) | **APPROVED** · complete and authoritative |
| [MOD-092 Implementation Readiness](./MOD-092-IMPLEMENTATION-READINESS.md) | **APPROVED** |
| [PRM-003 Platform Integrations](./PRM-003-PLATFORM-INTEGRATIONS.md) | **APPROVED** · authoritative for Integration Framework |

---

**End of FDR — MOD-092 Logistics.**

**Architecture: COMPLETE · FROZEN.**  
**Ready for Implementation.**  
**Go-Live (architecture): READY.**  
This sign-off does not itself constitute a request to implement.
