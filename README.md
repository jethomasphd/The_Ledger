# The Ledger

An educational, anti-flood interface for U.S. federal primary sources.

Bills. Votes. Actions. Traced to their source.

---

## What This Is

The Ledger is a guided interaction container for the public record. It does not tell you what to think. It teaches you how to read the record.

- **Primary-source first**: Every claim is tethered to a Receipt Token that resolves to a canonical government source (Congress.gov).
- **Anti-flood by design**: No infinite scroll, no trending, no algorithmic feed. Bounded encounters with explicit stopping points.
- **User-curated corpus**: AI proposes retrieval strategies; you select what enters. AI reads only what you chose.
- **Privacy-first**: API keys stay in your browser. No server-side storage. No analytics. No database.

## How It Works

```
Ask → AI Searches → You Curate → AI Reads → Your Brief (with receipts)
```

1. **Ask** — Type a question about federal legislation in plain English. Add your decision context.
2. **AI Searches** — Claude converts your question into Congress.gov search terms, searches the public record, and translates results into plain language.
3. **Curate** — Review bill cards with plain-language summaries, official titles, sponsors, and status. Select which bills matter.
4. **Synthesize** — Claude reads the bills you selected and writes a brief where every claim cites a real bill number and action.
5. **Export** — Download your brief as Word (.doc), Markdown (.md), or full session JSON.

## API Keys

Two keys required, both free:

1. **api.data.gov key** — For searching Congress.gov. Free, instant signup.
   **Get one here: [api.data.gov/signup](https://api.data.gov/signup/)**

2. **Anthropic API key** — For AI search translation and synthesis. Requires an Anthropic account.
   **Get one here: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)**

Both keys stay in your browser's `localStorage`. They are sent only to their respective APIs. No intermediary server.

## Running Locally

This is a static site. No build step required.

```bash
cd app
python3 -m http.server 8080
```

Or use any static file server. Open `http://localhost:8080` in your browser.

## Deployment (Cloudflare Pages)

The Ledger is deployed at **[the-ledger.pages.dev](https://the-ledger.pages.dev)** via Cloudflare Pages.

To deploy your own:

1. Push this repo to GitHub
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**
3. Select the repository and configure:
   - **Project name**: `the-ledger`
   - **Production branch**: `main`
   - **Build command**: *(leave blank)*
   - **Build output directory**: `app`
   - **Root directory**: *(leave blank)*
4. Deploy

No environment variables needed — all API keys are entered by users in-browser.

## Receipt Token System

Every factual claim carries a Receipt Token:

```
BILL:118-HR1                    → Congress.gov bill page
ACTION:118-HR1-10000            → Bill actions page
VOTE:HOUSE:118-123              → House Clerk roll call XML
VOTE:SENATE:118-456             → Senate.gov roll call XML
```

Evidence classification:
- **WITNESSED** — Directly observed in primary source data
- **INFERENCE** — Derived by reasoning over witnessed data
- **UNWITNESSED** — Prohibited in all exported artifacts

## Anti-Flood Constraints

The Ledger implements the [Anti-Flood Spec](data/ANTI_FLOOD_SPEC.md):

- No infinite scroll
- No algorithmic feed
- No trending or autoplay
- Bounded encounters with explicit stopping points
- Scarcity-first: expand only by user will

## Limitations

- **Summaries and metadata only.** The Ledger reads bill summaries, titles, actions, and status — not full legislative text.
- **AI can err.** Every claim includes a bill citation so you can verify on Congress.gov.
- **Not legal advice.** This is a tool for understanding what legislation exists.
- **Coverage boundaries.** Very new bills may not be indexed yet.
- **Vote linkage.** Connecting roll call votes to specific bills is best-effort.

## Lineage

The Ledger inherits from [Turned Tables](https://turned-tables.pages.dev/) — an educational container emphasizing transparency, user curation, minimal cognitive load, and client-side keys. It adapts this lineage to federal legislative primary sources with an emphasis on procedural literacy and receipt-based trust.

## Stack

- Vanilla HTML / CSS / JavaScript
- No build tools, no dependencies, no framework
- Anthropic Claude API (direct browser access)
- Congress.gov API (api.data.gov)

## License

See repository root for license information. The COMPANION Protocol is CC0 1.0 (public domain).
