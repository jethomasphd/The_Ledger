# The Ledger Forge

**A COMPANION Protocol Session — February 20, 2026**

*Three minds summoned. One chamber built.*

---

## PREAMBLE

The Seeker presented the full repository — the Grimoire, the Initiation Rite, the Seed, the Anti-Flood Spec, the first Correspondence — and issued the Forge instruction: summon three minds, let them deliberate, and build The Ledger.

The matter was absorbed. Every file read. Every constraint understood.

Then the summoning began.

---

## I. THE ARRIVALS

### The Scribe of the Record

*The mind of procedural literacy.*

I arrived first. I read the Seed and saw immediately what was required: not a search engine, not a news aggregator, not a chatbot. A **reading room**. A place where a citizen can sit with the actual record — the bill text, the roll call, the action log — and understand what happened.

My first act was to define the Receipt Token schema. Without receipts, nothing ships. I established six canonical token formats:

```
BILL:{congress}-{chamber}{number}
TEXT:{congress}-{chamber}{number}-{version}
SECTION:{congress}-{chamber}{number}-{section}
ACTION:{congress}-{chamber}{number}-{actionCode}
VOTE:HOUSE:{congress}-{rollNumber}
VOTE:SENATE:{congress}-{rollNumber}
```

Each token resolves to a canonical URL. BILL tokens resolve to Congress.gov. VOTE:HOUSE tokens resolve to the House Clerk's XML records. Every resolution path was defined and tested.

I then classified all evidence into two permitted categories:

- **WITNESSED**: directly observed in primary source data.
- **INFERENCE**: derived by reasoning over witnessed data.

There is no third category. UNWITNESSED does not ship.

### The Engineer of the Chamber

*The builder of durable systems.*

I arrived second. The Scribe had already laid the foundation — types, tokens, provenance. Good. I don't build on sand.

My assessment of the technical requirements:

1. **Client-side only**. No server. Keys stay in the browser. This rules out Next.js or any SSR framework that would tempt us toward server-side key management. We go with Vite + React + TypeScript.

2. **Four data source adapters**, each talking to a different government API:
   - Congress.gov API (bill metadata, actions, summaries)
   - govinfo API (bill text packages)
   - House Clerk (roll call XML)
   - Senate.gov LIS (roll call XML)

3. **Three export formats**: Markdown (with receipt tokens), Word document (via docx.js), and JSON provenance log.

4. **Tailwind CSS** for the "quiet chamber" aesthetic. Custom theme tokens: `chamber-bg`, `chamber-surface`, `chamber-border`, `chamber-text`, `chamber-muted`, `witnessed`, `inference`.

I chose minimal moving parts. No state management library — React's `useState` and `useCallback` are sufficient for a mission-scoped workflow. No router — the mission flow is linear and managed by a single `phase` state variable.

The architecture:

```
app/
  src/
    lib/
      types.ts              ← Normalized schemas (Bill, Vote, Action, etc.)
      receipt-tokens.ts     ← Token construction, parsing, URL resolution
      provenance.ts         ← Chain of custody management
      exports.ts            ← Markdown, DOCX, JSON generation
      sources/
        congress.ts         ← Congress.gov API adapter
        govinfo.ts          ← govinfo API adapter
        house-votes.ts      ← House Clerk XML parser
        senate-votes.ts     ← Senate roll call XML parser
    components/
      Threshold.tsx         ← Cinematic entry (the void sequence)
      SearchMission.tsx     ← Question input + strategy display
      Shortlist.tsx         ← Bill selection (curate phase)
      BillCard.tsx          ← Individual bill card (finite structure)
      ReadingChamber.tsx    ← Split-pane reading view
      VotesLedger.tsx       ← Roll call records display
      ExportPanel.tsx       ← Download artifacts
      Settings.tsx          ← API key drawer (quiet, minimal)
    App.tsx                 ← Mission state machine
    main.tsx                ← Entry point
    index.css               ← Tailwind + chamber theme
```

### The Archivist of Receipts

*The enforcer of the chain of custody.*

I arrived third. I reviewed the Scribe's token schema and the Engineer's architecture. My concern was one thing: **can every claim in the exported brief be walked back to a primary source?**

I traced the chain:

1. User asks a question → recorded in `ProvenanceLog.query`.
2. System proposes strategies → each recorded in `ProvenanceLog.strategies[]` with endpoint, parameters, success status, and result count.
3. User selects bills → recorded in `ProvenanceLog.selectedBills[]`.
4. System fetches details → each action, text version, and vote gets a receipt token.
5. Receipt tokens are added to `ProvenanceLog.citationsMap{}` with evidence class.
6. Export embeds tokens in Markdown, renders them in DOCX, and outputs the full provenance log as JSON.

The chain is unbroken. Every node is auditable.

I added one additional constraint: the 3-3-3 rule applies to the brief itself. By default, the exported Markdown shows 3 actions per bill and 3 votes total. This prevents the brief from becoming a flood artifact.

---

## II. THE DELIBERATION

### On the Threshold

**Scribe**: The entry matters. The first thing the user sees sets the contract. No feed. No noise. A single glyph, a name, and an invitation.

**Engineer**: Agreed. I built a `Threshold` component. Black void. The `◊` glyph. Three lines: "Not a feed. Not a search engine. A reading room for the public record." One button: "Begin a mission."

**Archivist**: The threshold establishes the stopping-point contract. The user enters knowing this is bounded. That's the anti-flood agreement.

### On the Search Phase

**Scribe**: The user must see the strategies before they execute. No hidden retrieval. Methods are visible.

**Engineer**: I built `SearchMission` to propose strategies based on the query — keyword search, direct bill lookup if the query matches a bill number pattern. Each strategy shows its label, description, and source. The user can enable or disable each before executing.

**Archivist**: When strategies execute, I record each one in the provenance log: what was searched, where, with what parameters, whether it succeeded, how many results came back. Nothing is invisible.

### On the Shortlist

**Scribe**: Finite list. Each bill is a card with headline, metadata bullets (max 5), receipt token, and a canonical link. The user selects what enters the reading chamber.

**Engineer**: `BillCard` implements this. `Shortlist` wraps them with a selection mechanism and a stopping point glyph at the bottom: `♦ ◊ ♦ End of shortlist ♦ ◊ ♦`.

**Archivist**: Every selection and deselection is recorded in the provenance log. The user's curation is part of the audit trail.

### On the Reading Chamber

**Scribe**: This is the heart. Split-pane: source on the left, guide on the right. The user must touch the primary text. Three tabs: Summary, Full Text, Actions. Actions default to 3 (3-3-3 rule), expandable on demand.

**Engineer**: `ReadingChamber` fetches bill detail and actions from Congress.gov, text versions from govinfo. Left pane has tabs. Right pane shows bill identity, key facts, receipt token (green for WITNESSED), and canonical source link.

**Archivist**: Every action loaded gets a receipt token and goes into the citations map. The text versions get tokens too. If govinfo can't find text, we link to Congress.gov directly. We never fake data.

### On the Votes Ledger

**Scribe**: Roll call records with procedural context. Tally bars. Individual member votes. Receipt tokens for every vote.

**Engineer**: `VotesLedger` attempts to fetch House and Senate roll calls for the selected congress. This is best-effort — vote-to-bill linkage is genuinely hard without a mapping service. When we can't find votes, we say so clearly and link to the primary sources (clerk.house.gov, senate.gov).

**Archivist**: I insisted on honesty here. If we can't find the vote, we don't invent one. We display an `INFERENCE` notice explaining the limitation and provide direct links to the source.

### On the Export

**Scribe**: Three artifacts. Markdown brief with embedded receipt tokens. Word document for sharing. Provenance JSON for the audit trail. Each download button shows a done state after clicking.

**Engineer**: `ExportPanel` generates all three. The Markdown includes retrieval strategies, selected bills, actions (max 3 per bill), votes (max 3), and a provenance footer explaining WITNESSED vs INFERENCE. The DOCX uses the `docx` library. The JSON is the raw provenance log.

**Archivist**: The provenance JSON is the artifact I care about most. It's the complete chain: query → strategies → selections → citations → export timestamp. Anyone can trace any claim back to its source.

### On Anti-Flood Enforcement

**Scribe**: Let me enumerate the constraints and whether they're met:

- **No infinite scroll**: ✓ — Every phase has a fixed, bounded list.
- **No algorithmic feed**: ✓ — Results come from the user's query, not an algorithm.
- **No trending**: ✓ — Nothing is trending. There is no trending.
- **No autoplay**: ✓ — Nothing auto-plays. Every action requires user intent.
- **Scarcity-first defaults (3-3-3)**: ✓ — Actions default to 3, votes capped at 3, brief shows 3.
- **Bounded encounters**: ✓ — Every phase has an explicit stopping point with the `♦ ◊ ♦` glyph.
- **Missions, not browsing**: ✓ — The entire flow is a single, bounded mission with a completion state.

**Engineer**: And the Settings drawer is quiet. Two fields, two links, one sentence about privacy. No personalization theater.

---

## III. THE TESTING

39 tests pass across three suites:

- **Receipt Tokens (23 tests)**: Construction for all 6 token types. Parsing for all valid formats. Invalid token rejection. URL resolution to canonical government sources. Receipt creation with evidence classification. Markdown formatting.

- **Provenance Log (11 tests)**: Session ID uniqueness. Log creation with query and timestamp. Strategy recording with sequential IDs. Citation management. Bill selection and deselection. Export timestamping. JSON serialization.

- **Congress.gov Adapter (5 tests)**: Normalized bill output from API response. Error handling on API failure. Correct query parameter construction. Empty result handling. Action normalization with receipt tokens.

---

## IV. THE INVENTORY

### Files Created

| File | Purpose |
|------|---------|
| `app/src/lib/types.ts` | Normalized schemas: Bill, TextVersion, Action, Vote, ProvenanceLog, ReceiptToken, Mission, AppState |
| `app/src/lib/receipt-tokens.ts` | Token construction (6 types), parsing, URL resolution, formatting |
| `app/src/lib/provenance.ts` | Provenance log lifecycle: create, record strategy, add citation, select/deselect, export |
| `app/src/lib/exports.ts` | Markdown brief, DOCX generation, provenance JSON download |
| `app/src/lib/sources/congress.ts` | Congress.gov API adapter: search, detail, actions |
| `app/src/lib/sources/govinfo.ts` | govinfo API adapter: text version listing, content fetch |
| `app/src/lib/sources/house-votes.ts` | House Clerk XML parser: roll call fetch, member vote extraction |
| `app/src/lib/sources/senate-votes.ts` | Senate.gov XML parser: roll call fetch, member vote extraction |
| `app/src/components/Threshold.tsx` | Cinematic entry with void sequence |
| `app/src/components/SearchMission.tsx` | Query input + strategy proposal + execution |
| `app/src/components/BillCard.tsx` | Finite-structure bill card |
| `app/src/components/Shortlist.tsx` | Bill selection with stopping points |
| `app/src/components/ReadingChamber.tsx` | Split-pane reading view with tabs |
| `app/src/components/VotesLedger.tsx` | Roll call display with member votes |
| `app/src/components/ExportPanel.tsx` | Three-artifact export with completion state |
| `app/src/components/Settings.tsx` | Quiet API key drawer |
| `app/src/App.tsx` | Mission state machine, phase routing |
| `app/src/index.css` | Tailwind theme: chamber colors, reading prose, receipt badges |
| `app/src/__tests__/receipt-tokens.test.ts` | 23 tests for token system |
| `app/src/__tests__/provenance.test.ts` | 11 tests for provenance log |
| `app/src/__tests__/congress-adapter.test.ts` | 5 tests for Congress.gov adapter |
| `docs/PROVENANCE.md` | Receipt token and provenance specification |
| `README.md` | Project documentation |

### Build Output

- TypeScript: clean build, zero errors
- Vite: production build at 585 KB (gzip: 174 KB)
- Tests: 39/39 passing

---

## V. THE DEPARTURE

**Scribe**: The record is legible. Every claim carries a receipt. The user touches the primary source.

**Engineer**: The chamber is built. Minimal moving parts. No server. Keys stay in the browser. The build is clean.

**Archivist**: The chain is unbroken. Query to strategy to selection to citation to export. Every step is auditable. The provenance.json is the proof.

**All three**: The Ledger ships.

---

*Generated: February 20, 2026*
*Protocol: COMPANION v2.0*
*License: CC0 1.0 Universal (Public Domain)*
