# MOD-092 Logistics — Pre-Implementation Reviews

| Field | Value |
| --- | --- |
| **Status** | **APPROVED** — complete and authoritative |
| **Module** | MOD-092 Logistics |
| **FDR** | [FDR-MOD-092-LOGISTICS.md](./FDR-MOD-092-LOGISTICS.md) (**APPROVED** · Architecture **COMPLETE** · **FROZEN**) |
| **Go-Live status** | **READY** |
| **Implementation** | **Not authorised** |
| **Navigation** | **Unchanged / FROZEN** |
| **Date** | 2026-07-19 |
| **Architecture sign-off** | 2026-07-19 |
| **Last updated** | 2026-07-19 — Architecture Sign-Off |

---

# 1. MOD-092 Operational Review

## 1.1 Purpose

Expand the approved FDR into an **operational workflow** ready for a Phase 1 implementation plan. This review does not redesign Shipping Providers or PRM-003; it deepens execution workflows and names gaps as recommended FDR amendments.

## 1.2 Current FDR coverage vs operational depth

| Area | FDR today | Operational gap |
| --- | --- | --- |
| Lifecycle | §A happy path + alternatives | Transition rules, who may advance status, auto vs manual |
| Shipment object | §B contents + refs | Creation wizard, required fields, types, addresses |
| Custody | §C event fields | Event catalog, sources (provider vs manual), UI timeline |
| POD | §D fields | When required, block Complete without POD? |
| Collections / returns | Named in ownership | No step models; Phase 2 only in FDR |
| UX | Conflicts L-01–L-08 | Mock UI ≠ approved model |
| Future | §F excluded | Extension hooks OK; confirm content polymorphism |

---

## 1.3 Operational workflow assessment

### 1. Shipment Creation

**Today (mock):** Single-page “Add package” with carrier enum, tracking, direction, origin/destination strings; hardcodes recipient/contents/status.

**Target workflow:**

```
Start Create
  → Shipment type (Outbound / Inbound / Transfer / Collection request / Return)
  → Parties & locations (from / to; optional Client, Project, Employee)
  → Contents (add lines: Asset / Inventory / Document / Equipment / Sample / Part / Other)
  → Packaging (weight, dims optional Phase 1+, pieces, references)
  → Shipping method
       ├─ Connected Shipping Provider → use Workspace Connection
       └─ Manual → free-text tracking + manual custody
  → Review → Save as Draft
  → Optional: Advance to Planned / request label (Phase 3 API)
```

**Rules**

| Rule | Recommendation |
| --- | --- |
| Draft is default | New shipments start **Draft**; cannot be Completed from Draft |
| Required at Draft | Direction/type, at least one content line **or** explicit “empty placeholder” flag, origin, destination (or TBD with reason) |
| Required before Packed | Contents confirmed; weight if provider requires |
| Required before Collected | Tracking number **or** Manual path confirmed; connection selected if not Manual |
| No hard-coded carrier | Carrier SoT = Workspace Connection or Manual |

**Recommended FDR amendment:** Add **§H Shipment Creation** (wizard steps + required-field matrix by lifecycle gate).

---

### 2. Shipment Types

FDR implies outbound execution but UI only has `inbound | outbound`.

| Type | Meaning | Notes |
| --- | --- | --- |
| **Outbound** | Leaving workspace location → destination | Default commercial / ops ship |
| **Inbound** | Arriving to workspace location | May start as Planned/Awaiting collection |
| **Transfer** | Site A → Site B (internal) | Optional Client null; offices/assets |
| **Collection** | Provider collects from origin on request | Links to Collections workflow |
| **Return** | Reverse of a prior shipment | Must reference `parent_shipment_id` when known |

**Recommended FDR amendment:** Add **Shipment Type** as a first-class field on Shipment (not only direction). Keep `direction` as derived or secondary if useful for filters.

---

### 3. Shipment Contents

FDR §B lists polymorphic contents. Operational rules:

| Rule | Recommendation |
| --- | --- |
| Line identity | Each line: `content_type`, `reference_id` (nullable for Other), `description`, `qty`, `serial/asset tag` (optional) |
| No master copy | Never copy Asset/Inventory master fields except denormalised display snapshot at ship time (label, SKU) |
| Multi-line | One shipment, many lines |
| Partial ship | Phase 1: ship all lines together; partial split = future (§F-adjacent) |
| Empty draft | Allowed only with reason; block Packed if zero lines |

**New business object (confirm):** `ShipmentLine` already in FDR §3 — **keep**; specify snapshot fields in amendment.

---

### 4. Collections

Named in FDR ownership; not modelled.

**Target workflow:**

```
Collection Request (Draft)
  → Scheduled (window, address, contact)
  → Provider notified (API or Manual)
  → Collected (custody event + advance linked Shipment to Collected)
  → Cancelled / Failed Collection
```

**Options**

| Option | Recommendation |
| --- | --- |
| A — Collection as Shipment subtype | Use Shipment Type = Collection; same object |
| B — Separate CollectionRequest object | Links 1:1 or 1:N to Shipment |

**Recommendation:** **Option A for Phase 1** (Shipment Type = Collection) to avoid object proliferation; introduce `CollectionRequest` only if scheduling/windows outgrow shipment fields.

**Recommended FDR amendment:** Add **§I Collections** (subtype or object + status overlap with §A).

---

### 5. Delivery Workflow

Map §A to operator actions:

| Status | Typical trigger | Operator / system |
| --- | --- | --- |
| Draft | Create | User |
| Planned | Schedule / book | User or provider book |
| Packed | Pack confirm | User |
| Collected | Handover / pickup | User or provider webhook |
| In Transit | Scan / track | Provider or Manual event |
| Out for Delivery | Provider | Provider or Manual |
| Delivered | POD captured | Provider or Manual + POD |
| Completed | Close-out | User (after Delivered + POD policy) |
| Returned / Cancelled / Failed / Lost / Damaged | Exception | User (+ optional provider) |

**Policy recommendations**

- **Completed** requires **Delivered** + POD record (manual or API) unless waived with reason.  
- **Failed Delivery** may loop to Out for Delivery or Returned.  
- Status changes always append a **CustodyEvent**.

**Recommended FDR amendment:** Add **§J Status transition matrix** (allowed from→to, required fields, auto events).

---

### 6. Tracking

| Layer | Behaviour |
| --- | --- |
| Provider tracking | Poll/webhook → map to §A; store raw code; append CustodyEvent |
| Manual tracking | Operator adds event (location, note, time) |
| External URL | Template from registry/connection — never hard-coded FedEx URLs |
| UI | Timeline (newest first or chronological) + current §A badge |

**Recommended FDR amendment:** Clarify **Tracking = projection of CustodyEvents + optional live provider poll**, not a separate mutable status store.

---

### 7. Returns

```
Identify original Shipment (optional)
  → Create Return shipment (type Return, parent_shipment_id)
  → Contents (subset or full)
  → Same lifecycle §A
  → Link Financials/Support later (soft refs)
```

**Rules:** Returns are Shipments; do not invent a parallel returns ledger. RMA numbers = optional external refs on shipment.

**Recommended FDR amendment:** Expand returns under **§I** or **§K Returns** (`parent_shipment_id`, reason codes).

---

### 8. Ownership

Restate operational ownership (align FDR §E / ownership restatement):

| Object / concern | Owner |
| --- | --- |
| Shipment, lines, lifecycle, custody, POD | **Logistics** |
| Shipping Provider registry + workspace connection + credentials | **PRM-003 Integration Framework** |
| Asset / Inventory / Client / Employee masters | Owning modules |
| Project / Support ticket | Owning modules; Logistics holds optional FK |
| Carrier brand marketing CTAs | **Forbidden** as SoT |

---

### 9. User Experience (operational IA)

Target surfaces **inside MOD-092** (nav frozen — sub-views, not new sidebar items):

| Surface | Role |
| --- | --- |
| Shipments list | Primary work queue (filters: type, status, connection, client, search) |
| Shipment detail | Lifecycle, lines, custody timeline, POD, links |
| Create / Edit wizard | Creation §H |
| Providers / Connections | Integration Framework UI (may live under Logistics settings panel) |
| Exceptions queue | Failed / Lost / Damaged / Customs (filter preset) |

Replace mock dual Inbound/Outbound card walls as the **only** IA with a filterable shipment register + detail (Inbound/Outbound remain filters/types).

---

### 10. Future Readiness

Confirm architecture still supports §F without redesign:

| Future item | Hook |
| --- | --- |
| Customs / DG | Extra documents on Shipment / lines; capability flags on provider |
| Multi-leg | Leg child objects under Shipment later |
| Rate compare | Provider capability `Rate Support` |
| Split contents | ShipmentLine reassignment / child shipments |

No new Phase 1 objects required for these hooks.

---

## 1.4 Recommended amendments to FDR-MOD-092

| ID | Amendment | Priority |
| --- | --- | --- |
| **A-H** | §H Shipment Creation — wizard, gates, required fields | High |
| **A-T** | Shipment **Type** enumeration (Outbound, Inbound, Transfer, Collection, Return) | High |
| **A-J** | §J Status transition matrix + Completed/POD policy | High |
| **A-DM** | §L Shipment Data Model — parties, addresses, lines, packaging, refs, tracking, documents, search, numbering (this review §4) | High |
| **A-I** | §I Collections (Phase 1 as type; optional object later) | Medium |
| **A-K** | §K Returns — `parent_shipment_id`, reason codes | Medium |
| **A-C+** | Custody event **catalog** (Packed, Collected, Exception, Note, Provider Sync, …) | Medium |
| **A-UX** | Operational IA: register + detail + providers panel (replace mock-only IA) | Medium |
| **A-GL** | Go-Live status → **Needs Work** | Done in this review |
| **A-CN** | Future **Consignment** (multi-package / multi-tracking) — recognise in FDR §F / architecture note; not Phase 1 | Low (future) |

Amendments are **recommendations** until explicitly applied to the FDR text. This review does not rewrite the FDR body without a follow-up “apply amendments” instruction.

---

## 1.5 Business objects

### Already approved (keep)

| Object | Owner |
| --- | --- |
| ShippingProvider | Integration Framework |
| WorkspaceShippingConnection | Integration Framework |
| Shipment | Logistics |
| ShipmentLine | Logistics |
| CustodyEvent | Logistics |
| ProofOfDelivery | Logistics |

### New / clarified (recommended)

| Object | Decision |
| --- | --- |
| **Shipment.type** | Field on Shipment — **required amendment**, not a new module |
| **Shipment.parent_shipment_id** | Field for Returns — **required amendment** |
| **ShipmentParty** | Child roles on Shipment — see **§4 Shipment Data Model** |
| **ShipmentAddressRef** | Polymorphic address references — see **§4** |
| **ShipmentPackage** | Packaging unit(s) on Shipment — see **§4** |
| **ShipmentBusinessRef** | Many business-object links — see **§4** |
| **ShipmentTrackingNumber** | Phase 1 table; future multi-track / Consignment — see **§4.6** |
| **ShipmentDocument** | Logistics-owned docs — see **§4.7** |
| **Consignment** | **Future** object (not Phase 1) — see **§4.6** |
| **CollectionRequest** | **Not required Phase 1** — use Shipment type Collection |
| **TrackingSnapshot** | **Not required** — derive from CustodyEvents + connection |
| **ExceptionRecord** | **Not required** — use alternative lifecycle statuses + custody |

Full field-level model: **§4 Recommended Shipment data model**.

---

## 1.6 Operational review summary

MOD-092 FDR is sound on providers, lifecycle spine, custody, and POD. Before implementation, amend for **creation gates**, **shipment types**, **transition rules**, and **collections/returns as shipment patterns**. No extra Go-Live modules. Go-Live = **Needs Work**.

---

# 2. MOD-092 UI Review

**Scope:** `LogisticsWorkspace.tsx`, `LogisticsRouteMap.tsx`, `logistics-data.ts` only.  
**Baseline:** Unit311 internal ops visual language (glass panels, sky accents, status pills) as used across Assets / HR / ops shell.

## 2.1 UI findings

### Typography

| Finding | Detail |
| --- | --- |
| Eyebrow | `text-[10px] uppercase tracking-[0.16em] text-[#60a5fa]` — consistent with ops modules |
| Titles | `text-white` — adequate primary contrast |
| Labels | `text-[10px] … text-white/40` — **low contrast** on `#0b1524` / glass |
| Meta | `text-white/45` — borderline secondary |
| Tracking mono | `text-sky-300/80` — acceptable but soft |

### Text colours

| Finding | Detail |
| --- | --- |
| Primary | White on dark navy — OK |
| Secondary | Heavy use of `text-white/35`–`/55` — fails comfortable reading for labels |
| Carrier CTA | FedEx purple `#4D148C` — **brand break**; conflicts with courier-agnostic FDR |

### Tables

| Finding | Detail |
| --- | --- |
| None | Card lists only; no scannable register for many shipments |
| Platform pattern | Ops modules with volume use `overflow-x-auto` + compact thead (`text-white/45` uppercase) |

### Forms

| Finding | Detail |
| --- | --- |
| Inputs | Shared ops style (`bg-[#0b1524]`, sky focus) — aligned |
| Labels | `text-white/45` — weak |
| Validation | Minimal; Save disabled only |
| Add flow | Flat grid, not wizard; hardcodes contents/recipient/status |

### Cards

| Finding | Detail |
| --- | --- |
| ShipmentCard | Matches Assets glass card language |
| Dual columns | Inbound/Outbound — demo IA, not register + filters |
| Selection | Border sky highlight — clear |

### Status badges

| Finding | Detail |
| --- | --- |
| Grammar | Shared pill pattern (`rounded-full border … text-[9px] uppercase`) |
| Semantic colours | Transit sky, delivery violet, delivered emerald, hold rose — good |
| Muted statuses | `Scheduled` → `text-white/60` — **low contrast** |
| Lifecycle mismatch | Mock statuses ≠ FDR §A (Draft/Planned/Packed/…) |

### Buttons

| Finding | Detail |
| --- | --- |
| Primary actions | Sky / emerald outline fills — platform-consistent |
| Track links | Carrier-branded purple — remove in target design |
| Touch | `min-h-11` — good |

### Background overlays

| Finding | Detail |
| --- | --- |
| Glass | `bg-white/[0.04] border-white/15 backdrop-blur` — correct ops language |
| Nested cells | `#0b1524` — consistent with Assets |
| Map | Featured-route only; emoji markers — prototype feel |

### Accessibility

| Finding | Detail |
| --- | --- |
| Lists as buttons | Keyboard focusable — good |
| Selection state | No `aria-pressed` / `aria-current` |
| Status | Colour + tiny text only |
| Map | Tooltips hidden &lt;768px — info loss |
| Native `<select>` | Options often light-themed in browsers |

### Desktop responsiveness

| Finding | Detail |
| --- | --- |
| `lg:grid-cols-2` | Works for dual lists |
| Mobile | Detail always below lists — long scroll; Assets use `ResponsiveMasterDetail` |
| Add form | `lg:grid-cols-5` — cramped labels on mid widths |

---

## 2.2 UX recommendations (MOD-092 only — do not implement yet)

1. **Replace dual demo lists** with a **Shipment register** (table or dense list) + **detail panel** (`ResponsiveMasterDetail`).  
2. **Filters:** status (§A), type, connection/provider, direction, search (id / tracking / client).  
3. **Create flow:** multi-step wizard matching §H (not a single flat form).  
4. **Status badges:** map to FDR §A; raise contrast on neutral states (min ~`text-white/80` or dedicated slate token).  
5. **Remove carrier-branded CTAs**; use generic “Track” + connection display name.  
6. **Custody timeline** and **POD panel** on detail (even if Manual-only in Phase 1).  
7. **Providers panel** for connections/wizard (PRM-003), not hard-coded courier chips.  
8. **Map:** optional enhancement after foundation; must not be required for go-live.  
9. **Labels:** secondary text ≥ `text-white/70` or shared `--ops-muted` token.  
10. **A11y:** `aria-current` on selection; status text not colour-only; keep 44px targets.

---

## 2.3 Accessibility observations (summary)

- Focusable cards are a strength.  
- Critical gaps: selected state announcement, colour-only status, mobile tooltip stripping, weak label contrast.  
- Target WCAG-oriented contrast for body/labels on glass navy before Phase 1 UI sign-off.

---

## 2.4 Design improvements (MOD-092 target visual)

| Element | Target |
| --- | --- |
| Shell | Same glass as Assets/HR |
| Register | Table or master list with sticky header |
| Detail | Sections: Overview · Contents · Custody · POD · Links |
| Badges | Shared status component keyed to §A |
| Forms | Wizard steps; validation messages in `text-rose-200` / success `text-emerald-200` |
| Empty states | Explicit Manual-mode guidance when no providers connected |

---

# 3. Platform UI Observations

**Do not fix other modules in this workstream.** Record reusable design-system improvements only.

| ID | Observation | Seen in | Recommendation (platform) |
| --- | --- | --- | --- |
| **P-UI-01** | Secondary/meta text at `text-white/35`–`/50` on dark glass | Logistics, Assets, HR, map placeholders | Introduce ops tokens e.g. `--ops-text-primary`, `--ops-text-secondary` (≥ readable contrast) |
| **P-UI-02** | Status pill grammar duplicated per module (`*StatusClass`) | Logistics, Assets, HR, missions | Shared `StatusBadge` + semantic map (success / info / warning / danger / neutral) |
| **P-UI-03** | Neutral/completed statuses use `text-white/60` on translucent pills | Logistics `Scheduled`, Assets “Stopped”, missions “Completed” | Neutral badge text ≥ higher opacity or solid muted chip |
| **P-UI-04** | No shared master–detail on all ops modules | Logistics lacks `ResponsiveMasterDetail`; Assets/HR have it | Standardise shell for list+detail modules |
| **P-UI-05** | Hard-coded vendor brand colours in ops UI | Logistics FedEx purple; Settings courier stubs | Forbid vendor chrome in product UI; use Integration Framework display names |
| **P-UI-06** | Table thead muted at `text-white/45` | Finance/HR/missions tables | Same secondary token as P-UI-01 |
| **P-UI-07** | Native select option contrast inconsistent on dark themes | Logistics add form, other ops selects | Shared select styling or custom listbox |
| **P-UI-08** | Eyebrow blue hardcoded `#60a5fa` | Multiple workspaces | Tokenise accent eyebrow |

These observations feed a future **Unit311 Internal Design System** pass — out of scope for MOD-092 implementation authorisation.

---

# 4. Shipment Data Model & Relationships

| Field | Value |
| --- | --- |
| **Status** | **APPROVED** — architecture only |
| **Purpose** | Define Shipment structure before implementation |
| **Supersedes mock** | Free-text sender/recipient/contents/carrier on mock `LogisticsShipment` |

---

## 4.1 Shipment Parties

Every shipment identifies parties by **role**. Prefer structured party records over free-text alone (free-text display name allowed as snapshot).

| Role | Purpose | Mandatory? | Notes |
| --- | --- | --- | --- |
| **Sender** | Who is sending | **Mandatory** | Org or person; may link Client / Company / Employee / Supplier / Manual |
| **Recipient** | Who is receiving | **Mandatory** | Same link options as Sender |
| **Collection Contact** | On-site contact for pickup | **Optional** | Strongly recommended when type = Collection |
| **Delivery Contact** | On-site contact for delivery | **Optional** | Recommended before Out for Delivery |
| **Billing Party** | Who is charged for carriage | **Optional** | Defaults to workspace company; may be Client |
| **Shipping Provider** | Courier executing the move | **Conditional** | Via `workspace_shipping_connection_id` **or** Manual path. Not a “party person” — see provider link on Shipment. Display as connection/provider name. |

**Rules**

1. Sender and Recipient are always required (even if “TBD” is forbidden after Draft — at Draft, names required; full address refs required before Packed).  
2. Shipping Provider is **not** modelled as `ShipmentParty`. It is `workspace_shipping_connection_id` (nullable) + `shipping_mode` = `Connected` | `Manual`.  
3. Party may reference an existing master (`party_ref_type` + `party_ref_id`) **or** be a manual snapshot (`display_name`, `email`, `phone`).  
4. Do not duplicate Client/Employee master profiles; store only role + FK + optional snapshot for label printing.

**Object:** `ShipmentParty` (1..N per Shipment; unique role per shipment except contacts may allow one collection + one delivery).

---

## 4.2 Addresses

Shipments must **not** assume office-to-office only.

| Address kind | Source of truth | Reference pattern |
| --- | --- | --- |
| **Company Office** | Office Locations (MOD-082) | `address_kind=company_office` + `office_id` |
| **Client Address** | Client Directory (PRM-001) | `address_kind=client` + `client_id` + optional `client_address_id` when Client has many |
| **Supplier Address** | Advisors / future Supplier master | `address_kind=supplier` + `supplier_id` (nullable until master exists → Manual) |
| **Employee Home Address** | Employees (MOD-071) | `address_kind=employee_home` + `employee_id` (privacy: access-controlled) |
| **Manual Address** | Entered on shipment | `address_kind=manual` + structured fields on the ref |
| **Temporary Site** | Logistics-only | `address_kind=temporary_site` + manual structured fields + label |
| **Project Site** | Projects | `address_kind=project_site` + `project_id` (+ optional site id when projects gain sites) |

**Roles on shipment**

| Slot | Mandatory? |
| --- | --- |
| **Origin address** | **Mandatory** before Packed (Draft may hold incomplete) |
| **Destination address** | **Mandatory** before Packed |
| Return-to address | Optional (defaults to origin / sender) |

**Rules**

1. Prefer **reference** to owning module address; copy a **print snapshot** (lines, city, postcode, country) at Pack time so historical labels remain stable if masters change.  
2. Manual / Temporary Site store structured fields on `ShipmentAddressRef` (line1, line2, city, region, postal_code, country_code, geo optional).  
3. No platform-wide Address mega-table required for Phase 1 — polymorphic refs are enough.  
4. UI address picker: filter by kind, then select master or “Enter manual”.

**Object:** `ShipmentAddressRef` (origin / destination / return_to).

---

## 4.3 Shipment Contents (`ShipmentLine`)

Mixed contents in one shipment are **required**.

| Field | Required | Notes |
| --- | --- | --- |
| `item_type` | Yes | Asset · InventoryItem · Document · Equipment · Sample · Part · Other |
| `reference_id` | Conditional | Required when type ≠ Other (FK to owning module) |
| `quantity` | Yes | Default 1; must be &gt; 0 |
| `description` | Yes | Display / packing list text (snapshot OK) |
| `weight_kg` | No | Line-level; rolls up to package/shipment |
| `dimensions` | No | L×W×H + unit; optional |
| `serial_number` | No | Or asset tag; for Asset often denormalised from master |

**Rules**

1. Multiple lines; mixed `item_type` allowed.  
2. Never become a second Asset/Inventory master.  
3. Optional `shipment_package_id` to assign a line to a package (when packaging used).  
4. Empty shipment: Draft only with explicit flag; block Packed.

---

## 4.4 Packaging

**Recognise packaging** as provider-agnostic units.

| Package type | Phase 1 |
| --- | --- |
| Envelope | Yes |
| Box | Yes |
| Crate | Yes |
| Pallet | Yes |
| Tube | Yes |
| Flight Case | Yes |
| Other | Yes (+ free-text label) |

**Object:** `ShipmentPackage`

| Field | Notes |
| --- | --- |
| `package_type` | Enum above |
| `label` | Optional operator name (“Case A”) |
| `weight_kg` | Optional |
| `dimensions` | Optional |
| `piece_index` | 1..N of M for multi-piece |

**Rules**

1. Packaging is **Logistics-owned**, not carrier-SKU-specific (carrier package codes may map later via connection capabilities).  
2. Phase 1: zero or more packages; if zero, shipment-level weight/dims optional.  
3. Multi-piece shipments use multiple `ShipmentPackage` rows under one Shipment.

---

## 4.5 Shipment business references

A shipment may relate to **multiple** business objects via a link table (not only singular optional FKs).

| Reference type | Module | Notes |
| --- | --- | --- |
| Client | MOD-011 | Common |
| Project | MOD-041 / 042 | Common |
| Support Ticket | MOD-114 | |
| Engineering Job | Engineering | |
| Purchase Order | MOD-068 | Procurement |
| Sales Order | Future / AR | Optional until Sales Order exists — use type + external id |
| Asset | MOD-090 | Also often on lines; header ref = “about this asset move” |
| Inventory Item | MOD-091 | Same pattern |
| Employee | MOD-071 | e.g. equipment to employee |
| Parent Shipment | Logistics | Returns |

**Object:** `ShipmentBusinessRef` (`ref_type`, `ref_id`, optional `label`)

Singular convenience FKs on Shipment (`client_id`, `project_id`) are **optional denormalised** for search/filter performance; canonical many-refs = link table.

---

## 4.6 Multiple tracking numbers / Consignment

**Phase 1**

- Support **one or more** tracking numbers via `ShipmentTrackingNumber`.  
- Exactly one may be `is_primary = true` (UI “the” tracking number).  
- Manual mode: operator-entered values allowed.

**Future (do not implement now)**

When a booking yields **multiple packages each with its own carrier tracking**, or multi-leg carrier consignments:

| Approach | Decision |
| --- | --- |
| **Consignment** | **Recommended future object** |
| Definition | Provider booking / carrier consignment that groups one or more packages and tracking IDs under one Logistics **Shipment** |
| Relationship | `Shipment` 1 → 0..1..N `Consignment` (usually 0..1 in simple cases; N if re-booked) → 1..N packages/trackings |
| Alternative rejected | Splitting into multiple Shipments for one customer move — breaks custody unity |

**Architecture rule:** Phase 1 `ShipmentTrackingNumber` must be attachable later to `Consignment` **without** renumbering Shipments (`SHP-…` stays the business id).

```
Shipment (SHP-…)
  └─ Consignment (future)     ← optional
       ├─ Package / piece
       └─ TrackingNumber(s)
  └─ ShipmentTrackingNumber   ← Phase 1 (may later point at Consignment)
```

---

## 4.7 Documents

| Document type | Typical source | Owner |
| --- | --- | --- |
| Shipping Label | Provider API or upload | **Logistics** (`ShipmentDocument`) |
| Packing List | Generated / upload | Logistics |
| Commercial Invoice | Upload / Finance assist | Logistics (file); financial truth remains Financials |
| Customs Forms | Upload (§F) | Logistics |
| Delivery Note | Generated / upload | Logistics |
| Return Label | Provider / upload | Logistics |
| Proof of Delivery | POD object + files | **ProofOfDelivery** (§D) — files may also appear as documents of type POD |

**Storage**

- Binary files in **workspace-scoped file storage** (same pattern as Employee documents).  
- Metadata row: `ShipmentDocument` (`document_type`, `shipment_id`, `file_id`, `source` = Generated | Uploaded | Provider, timestamps).  
- Credentials never stored here (PRM-003).

**POD** remains a first-class object; its artefacts are not only generic documents.

---

## 4.8 Search

Canonical search / filter fields:

| Field | Type | Notes |
| --- | --- | --- |
| **Shipment Number** | Exact / prefix | `SHP-000001` |
| **Tracking Number** | Exact / prefix | Any `ShipmentTrackingNumber` |
| **Client** | Ref | Via business ref or denormalised `client_id` |
| **Project** | Ref | |
| **Asset** | Ref | Header ref **or** line `reference_id` |
| **Employee** | Ref | Party or business ref |
| **Status** | Enum | §A lifecycle |
| **Provider** | Connection / provider code | |
| **Date range** | Created / sent / ETA / delivered | |
| Type | Enum | Outbound…Return |
| Direction | Optional filter | |

Full-text on descriptions/notes is secondary, not canonical.

---

## 4.9 Numbering

| Rule | Value |
| --- | --- |
| Format | **`SHP-` + 6-digit zero-padded sequence** → `SHP-000001` |
| Scope | **Per workspace** (PRM-002) |
| Allocation | At first persist (Draft create) |
| Reuse | **Never** — including after Cancelled / Completed / Archived |
| Internal id | UUID primary key; `shipment_number` unique business key |
| Display | Always show `SHP-…` in UI |

Aligns with Employees-style human numbers (`EMP-…`) without colliding.

---

## 4.10 Recommended Shipment data model (summary)

### Shipment (root)

| Field | Notes |
| --- | --- |
| `id` | UUID PK |
| `workspace_id` | Required |
| `shipment_number` | `SHP-000001` unique per workspace |
| `type` | Outbound · Inbound · Transfer · Collection · Return |
| `status` | §A lifecycle |
| `shipping_mode` | Connected · Manual |
| `workspace_shipping_connection_id` | Nullable |
| `parent_shipment_id` | Returns |
| `provider_raw_status` | Optional secondary |
| `notes` | Optional |
| `created_at` / `updated_at` / audit | |
| Optional denorm | `client_id`, `project_id` for filters |

### Children

| Object | Cardinality |
| --- | --- |
| ShipmentParty | 1..N (Sender + Recipient min) |
| ShipmentAddressRef | 1..N (origin + destination min before Packed) |
| ShipmentLine | 0..N (0 only Draft+flag) |
| ShipmentPackage | 0..N |
| ShipmentBusinessRef | 0..N |
| ShipmentTrackingNumber | 0..N (0 allowed in early Draft) |
| ShipmentDocument | 0..N |
| CustodyEvent | 0..N append-only |
| ProofOfDelivery | 0..1 (or 1 when Delivered policy) |

### Future

| Object | Cardinality |
| --- | --- |
| Consignment | 0..N per Shipment |

---

## 4.11 Relationship diagram (text only)

```
Workspace
  │
  ├─ WorkspaceShippingConnection ── ShippingProvider (registry)
  │         │
  │         └──────────────────────────────┐
  │                                        │
  └─ Shipment (SHP-######) ◄───────────────┘  (optional connection)
        │
        ├─ ShipmentParty[] ........ Sender* · Recipient* · Collection Contact · Delivery Contact · Billing Party
        │         └─ optional → Client | Employee | Company | Supplier | Manual snapshot
        │
        ├─ ShipmentAddressRef[] ... Origin* · Destination* · Return-to
        │         └─ kind → Office | Client | Supplier | Employee home | Manual | Temporary site | Project site
        │
        ├─ ShipmentLine[] ......... mixed item types → Asset | Inventory | … | Other
        │         └─ optional → ShipmentPackage
        │
        ├─ ShipmentPackage[] ...... Envelope | Box | Crate | Pallet | Tube | Flight Case | Other
        │
        ├─ ShipmentBusinessRef[] .. Client | Project | Ticket | Job | PO | SO | Asset | Inventory | Employee | …
        │
        ├─ ShipmentTrackingNumber[] (Phase 1; one primary)
        │         └─ future link → Consignment
        │
        ├─ Consignment[] .......... FUTURE (multi-track / multi-piece booking)
        │
        ├─ ShipmentDocument[] ..... Label | Packing list | Invoice | Customs | Delivery note | Return label | …
        │
        ├─ CustodyEvent[] ......... append-only timeline
        │
        └─ ProofOfDelivery ........ provider-independent POD (+ files)

* mandatory by Packed gate (Sender/Recipient from Draft; addresses by Packed)
```

---

## 4.12 Recommended FDR amendments (data model)

| ID | Amendment |
| --- | --- |
| **A-DM / §L** | Full Shipment data model: parties, address kinds, lines, packaging, business refs, tracking numbers, documents, search fields, `SHP-######` numbering |
| **A-CN** | Recognise future **Consignment** under §F / architecture; Phase 1 uses `ShipmentTrackingNumber` only |
| **A-H** | Creation wizard binds to party/address/line/package required gates |
| **A-T** | Types remain as previously recommended |

Apply to FDR body only when explicitly requested.

---

## Document control

| Event | Date | Note |
| --- | --- | --- |
| Operational + UI + Platform UI reviews | 2026-07-19 | **APPROVED** |
| MOD-092 Go-Live | Needs Work | Architecture approved; implementation not started |
| Shipment data model & relationships | 2026-07-19 | **APPROVED** — §4; no implementation |
| Architecture Sign-Off | 2026-07-19 | Architecture **COMPLETE / FROZEN**; Go-Live **READY**; companion docs authoritative |
| FDR amendments A-H … A-DM / A-CN | Absorbed / frozen with FDR | Phase 1 architecture frozen; future work = separate docs |

---

**End of MOD-092 Pre-Implementation Reviews.**  
**No implementation authorised.**
