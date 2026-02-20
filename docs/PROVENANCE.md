# Provenance & Receipt Token System

## Overview

The Ledger enforces a strict chain of custody for every factual claim. No statement ships without a receipt. This document explains how receipts work, what they prove, and how provenance is maintained.

## Receipt Tokens

A Receipt Token is a structured string that uniquely identifies a primary source artifact. Every claim in The Ledger's output is tethered to at least one token.

### Token Formats

| Type | Format | Example | Resolves To |
|------|--------|---------|-------------|
| Bill | `BILL:{congress}-{chamber}{number}` | `BILL:118-HR1` | Congress.gov bill page |
| Text | `TEXT:{congress}-{chamber}{number}-{version}` | `TEXT:118-HR1-IH` | Congress.gov text page |
| Section | `SECTION:{congress}-{chamber}{number}-{section}` | `SECTION:118-HR1-101` | Congress.gov text page |
| Action | `ACTION:{congress}-{chamber}{number}-{actionCode}` | `ACTION:118-HR1-10000` | Congress.gov actions page |
| House Vote | `VOTE:HOUSE:{congress}-{rollNumber}` | `VOTE:HOUSE:118-123` | House Clerk XML |
| Senate Vote | `VOTE:SENATE:{congress}-{rollNumber}` | `VOTE:SENATE:118-456` | Senate.gov XML |

### Token Resolution

Every token resolves to a canonical URL pointing to the primary source:

- **BILL** tokens resolve to `congress.gov/bill/{N}th-congress/{type}/{number}`
- **TEXT** tokens resolve to the text page on Congress.gov
- **VOTE:HOUSE** tokens resolve to `clerk.house.gov/evs/{year}/roll{NNN}.xml`
- **VOTE:SENATE** tokens resolve to `senate.gov/legislative/LIS/roll_call_votes/...`

## Evidence Classification

Every receipt is classified by evidence strength:

### WITNESSED

The claim is directly supported by data observed in the primary source.

Example: "HR 1 passed the House on March 30, 2023" — this fact is directly present in the Congress.gov actions record.

### INFERENCE

The claim is derived by reasoning over witnessed data, but is not explicitly stated in any single source.

Example: "This bill addresses energy policy" — inferred from the bill's policy area classification and content.

### UNWITNESSED (Prohibited)

A claim with no receipt token. **This is not allowed in any exported artifact.** If a claim cannot be tethered to a primary source, it does not ship.

## Provenance Log

Every mission produces a `provenance.json` file that records:

1. **Session ID** — Unique identifier for the mission
2. **Query** — The user's original question
3. **Timestamp** — When the mission began
4. **Strategies** — Every retrieval strategy attempted:
   - Label and description
   - Source and endpoint used
   - Parameters sent
   - Whether it succeeded
   - How many results it returned
5. **Selected Bills** — Which bill tokens the user chose to examine
6. **Citations Map** — Every receipt token referenced, with:
   - Token string
   - Type classification
   - Evidence class (WITNESSED or INFERENCE)
   - Resolved URL
   - Human-readable label
7. **Export Timestamp** — When the brief was exported

## Chain of Custody

The provenance chain works as follows:

```
User Question
  → Retrieval Strategies (recorded)
    → API Calls (endpoints + parameters recorded)
      → Raw Results (count recorded)
        → User Selection (tokens recorded)
          → Detail Fetch (actions, text, votes)
            → Receipt Tokens (WITNESSED/INFERENCE)
              → Exported Brief (all tokens embedded)
              → Provenance JSON (complete audit trail)
```

Every step is traceable. Nothing is hidden.

## Anti-Flood Interaction

The 3-3-3 rule applies to provenance display:

- Default: show 3 key receipts per claim
- Default: show 3 strategies used
- Default: show 3 selected artifacts

The user can expand to see all, but scarcity is the default.

## Implementation

The receipt token system is implemented in:

- `app/src/lib/receipt-tokens.ts` — Token construction, parsing, URL resolution
- `app/src/lib/provenance.ts` — Provenance log creation, strategy recording, citation management
- `app/src/lib/exports.ts` — Brief generation with embedded receipt tokens
- `app/src/lib/types.ts` — Type definitions for all receipt and provenance structures
