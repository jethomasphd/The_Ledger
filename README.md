# The Ledger

An educational, anti-flood interface for U.S. federal primary sources.

Bills. Votes. Actions. Traced to their source.

---

## What This Is

The Ledger is a guided interaction container for the public record. It does not tell you what to think. It teaches you how to read the record.

- **Primary-source first**: Every claim is tethered to a Receipt Token that resolves to a canonical government source (Congress.gov, govinfo, House Clerk, Senate.gov).
- **Anti-flood by design**: No infinite scroll, no trending, no algorithmic feed. Bounded encounters ("missions") with explicit stopping points.
- **User-curated corpus**: The system proposes retrieval strategies; the user selects what enters. AI reads only what you chose.
- **Privacy-first**: API keys stay in your browser. No server-side storage. No analytics.

## How It Works

```
Search → Shortlist → Curate → Read → Export
```

1. **Search** — Ask a question about federal legislation. The system proposes transparent retrieval strategies.
2. **Curate** — Review bill cards with metadata and canonical links. Select what you want to examine.
3. **Read** — Split-pane reading chamber: primary text on the left, guided interpretation on the right.
4. **Votes** — Roll call records with procedural labeling. Yeas, nays, individual member votes.
5. **Export** — Download your brief as Markdown, Word, or JSON provenance log. Every claim carries receipts.

## Data Sources

| Source | What It Provides | Integration |
|--------|-----------------|-------------|
| Congress.gov API | Bill metadata, actions, summaries | Keyword search, bill detail, actions |
| govinfo API | Bill text packages (HTML, XML, PDF, TXT) | Text version listing, content fetch |
| House Clerk | Roll call vote records (XML) | Individual vote parsing, member tallies |
| Senate.gov LIS | Roll call vote records (XML) | Individual vote parsing, member tallies |

## Running Locally

```bash
cd app
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## API Keys

The Ledger requires a free API key from the U.S. government's open data platform:

**Get your key here: [api.data.gov/signup](https://api.data.gov/signup/)**

One registration gives you a key that works for both Congress.gov and govinfo APIs.

Enter your key in the Settings drawer (accessible from the top bar during any mission). Keys are stored only in your browser's `localStorage` and are sent directly to the respective government APIs. No intermediary server.

## Deployment (Cloudflare Pages)

The Ledger is deployed at **[the-ledger.pages.dev](https://the-ledger.pages.dev)** via Cloudflare Pages.

To deploy your own:

1. Push this repo to GitHub
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**
3. Select the repository and configure:
   - **Project name**: `the-ledger`
   - **Production branch**: `main`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `app`
4. Deploy

No environment variables needed — all API keys are entered by users in-browser.

## Building Locally

```bash
cd app
npm run build
```

Output goes to `app/dist/`.

## Running Tests

```bash
cd app
npm test
```

Tests cover:
- Receipt token construction, parsing, and URL resolution
- Provenance log creation, strategy recording, citation management
- Congress.gov adapter with mocked API responses

## Receipt Token System

Every factual claim carries a Receipt Token:

```
BILL:118-HR1                    → Congress.gov bill page
TEXT:118-HR1-IH                 → Bill text (Introduced in House)
ACTION:118-HR1-10000            → Bill actions page
VOTE:HOUSE:118-123              → House Clerk roll call XML
VOTE:SENATE:118-456             → Senate.gov roll call XML
```

Evidence classification:
- **WITNESSED** — Directly observed in primary source data
- **INFERENCE** — Derived by reasoning over witnessed data
- **UNWITNESSED** — Prohibited in all exported artifacts

See [docs/PROVENANCE.md](docs/PROVENANCE.md) for the full provenance specification.

## Anti-Flood Constraints

The Ledger implements the [Anti-Flood Spec](data/ANTI_FLOOD_SPEC.md):

- No infinite scroll
- No algorithmic feed
- No trending or autoplay
- 3-3-3 default (3 sections, 3 actions, 3 votes)
- Bounded encounters with explicit stopping points
- Scarcity-first: expand only by user will

## Limitations & Next Steps

- **Vote-to-bill linkage**: Currently best-effort. A robust mapping service would improve vote discovery for specific bills.
- **Procedural vote classifier**: Not yet implemented. Future versions will label procedural vs substantive votes (cloture, rule votes, motion to recommit, etc.).
- **Bill text diffs**: Not yet implemented. Comparing text versions is a future capability.
- **Historical Congresses**: Works with any Congress number, but search defaults to current.
- **Advanced search**: Currently keyword-only. Filters for sponsor, committee, date range, and subject are planned.
- **Offline mode**: No service worker or offline caching yet.

## Lineage

The Ledger inherits from [Turned Tables](https://turned-tables.pages.dev/) — an educational container emphasizing transparency, user curation, minimal cognitive load, and client-side keys. It adapts this lineage to federal legislative primary sources with an emphasis on procedural literacy and receipt-based trust.

## Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4
- docx.js (Word export)
- Vitest (testing)

## License

See repository root for license information. The COMPANION Protocol is CC0 1.0 (public domain).
