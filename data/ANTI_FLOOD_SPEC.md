# ANTI_FLOOD_SPEC.md
*A portable spec for building products that protect attention — with a cinematic, ritual-toned intro and a calm “reading room” UI.*

---

## 0) The North Star
Anti-flood products do **not** compete for attention.
They **conserve** it.

They feel like:
- a **quiet chamber**
- a **bounded encounter**
- a **guided reading of primary material**
- an exit that feels like **completion**, not abandonment

The user should leave feeling:
> “I touched the source. I made the call. I can stop now.”

---

## 1) The Cinematic Intro Layer (portable)
This is the “threshold” pattern: an opening sequence that slows the user down *without* trapping them.

### 1.1 Choreography
- Begin with a single glyph and a directive:
  - `◊`
  - `Scroll ↧` :contentReference[oaicite:0]{index=0}
- Use short, line-broken sentences. Let whitespace do the pacing. :contentReference[oaicite:1]{index=1}
- Use the “negative triad” to establish intent:
  - “Not X. Not Y. Z.” (e.g., “Not a petition. Not a protest. An invocation.”) :contentReference[oaicite:2]{index=2}
- Include one sentence that names what this **is not** (no feed, no commentary, no theater), and one sentence that names what it **is** (a structured encounter). :contentReference[oaicite:3]{index=3}
- End the intro with a clear invitation:
  - “Keep scrolling. We will explain everything.” :contentReference[oaicite:4]{index=4}

### 1.2 Visual language (sigils + dividers)
Use a small, consistent alphabet of separators:
- `◆` for major beats :contentReference[oaicite:5]{index=5}
- `❧ ☙` for section breaks / turning points :contentReference[oaicite:6]{index=6}
- `♦ ◊ ♦` for “now we enter the chamber” moments :contentReference[oaicite:7]{index=7}

Rules:
- Never introduce new symbols casually.
- Symbols must mean something structurally (beat / break / threshold).

### 1.3 Tone constraints (cinematic, not cringe)
- Declarative. Controlled. No hype adjectives.
- No internet voice. No “breaking,” “shocking,” “you won’t believe.”
- Avoid moralizing. Avoid telling the user what to think.
- The writing can be mythic, but the UI must remain clinical.

---

## 2) Anti-Flood Design Doctrine (non-negotiables)

### 2.1 No-feed rule
- No infinite scroll.
- No algorithmic “For You.”
- No trending surfaces.
- No autoplay (video/audio).
- No engagement bait (streaks, leaderboards, hot takes, rage loops).

### 2.2 Scarcity-first defaults
- Default to a *shortlist*.
- Default to *three* (see 3–3–3 rule).
- Expansion is user-invoked and reversible.

### 2.3 “Bounded encounter” rule
Every session must have:
- a clear start
- a clear stopping point
- a sense of completion at stop

Offer time-box modes:
- 5 min / 10 min / 20 min

Stopping is success.

---

## 3) Interaction Model (how the user moves)

### 3.1 Missions, not browsing
Each unit of use is a **mission**:
- one question
- one corpus slice
- one output artifact

No “next up” queues unless requested.

### 3.2 User-curated corpus
The system may propose.
The user must select.

The product must never drag the user through material they did not choose.

### 3.3 Progressive disclosure
Show the minimum that allows a decision.
Everything else collapses.

Use these primitives:
- “Show more”
- “Show the source”
- “Show the method”
- “Show what changed”

---

## 4) The 3–3–3 Rule (anti-flood throttle)
Default views show:
- **3** key items
- **3** key moments
- **3** key receipts

Examples:
- 3 sections, 3 actions, 3 votes
- 3 findings, 3 caveats, 3 source links
- 3 claims, 3 counterpoints, 3 citations

Expanding beyond 3 must be explicit:
- “Expand to 10”
- “Show all (warning: long)”

---

## 5) Provenance & Trust (quiet rigor)
Anti-flood products don’t ask for trust.
They provide **receipts**.

### 5.1 Receipts required
- Any factual claim must be tethered to a source pointer.
- If a claim cannot be sourced, it cannot appear as fact.

### 5.2 Witness vs inference labeling
All outputs must distinguish:
- **WITNESSED**: directly supported by the record
- **INFERENCE**: reasoned interpretation
- **UNWITNESSED**: prohibited in the final artifact (or quarantined)

### 5.3 “Show work without dumping”
- Provide a compact provenance log that’s expandable/exportable.
- Don’t bury the user in raw citations by default.

---

## 6) UI Components (calm reading room)
### 6.1 Split view (source + guide)
When interpretation appears:
- Source on the left (or one click away)
- Guide on the right (short, structured)

### 6.2 Cards that end
Cards must have:
- a headline
- 1 sentence
- ≤5 bullets
- a “source” button
- a “done” state

Cards should feel **finite**.

### 6.3 Settings as a quiet drawer
A minimal settings panel is allowed, but it must not dominate:
- `⚙ Settings` :contentReference[oaicite:8]{index=8}
- short list
- no personalization theater

---

## 7) Copy Patterns (portable templates)

### 7.1 Threshold opener
- “Something is wrong.”
- “The record exists.”
- “We will read it together.”
- “Keep scrolling.” :contentReference[oaicite:9]{index=9}

### 7.2 Negative triad
- “Not X. Not Y. Z.” :contentReference[oaicite:10]{index=10}

### 7.3 The promise
- “This is a structured encounter.” :contentReference[oaicite:11]{index=11}
- “You will touch the source.”
- “You can stop when the mission is complete.”

### 7.4 Expansion warning (anti-flood)
- “This is long. Expand only if you want the full record.”

### 7.5 End-of-mission close
- “You’ve seen enough to decide.”
- “Export, save, or stop.”

---

## 8) Privacy & Ownership (anti-authority posture)
- Local-first when possible.
- User owns exports.
- Minimal analytics (ideally none).
- No hidden personalization.
- Make the method visible.

---

## 9) Definition of Done (anti-flood)
A product meets this spec when:
1) A meaningful session completes in **≤10 minutes** by default.
2) The UI never displays more than a **shortlist** without explicit expansion.
3) Every claim has a **receipt** path to the source.
4) There is a clear **stop point** — and stopping feels like success.

---

## 10) “Do Not Ship” List (failure modes)
- Infinite scroll
- Trending
- Autoplay
- Gamified retention
- “Daily streak”
- Notifications as default
- Long unbroken walls of text
- Summaries without source contact
- Certainty theater (“this proves” without receipts)

---

## 11) Lineage (stylistic + structural)
This spec merges:
- Anti-flood constraints (scarcity, bounded encounters, no feeds)
- A cinematic threshold style (glyphs, scroll choreography, declarative triads, chamber framing) :contentReference[oaicite:12]{index=12}
- A quiet “settings drawer” pattern and transcript/export affordances :contentReference[oaicite:13]{index=13}
- The broader aesthetic language of :contentReference[oaicite:14]{index=14} “containers”: ritual entry, structured encounter, calm UI, and explicit exits.