/**
 * The Ledger — Main Application
 *
 * Mission flow: Threshold → Search → Shortlist → Read → Votes → Export
 * Anti-flood: bounded encounters, explicit stopping points, no infinite scroll.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ApiKeys, Bill, Action, Vote, TextVersion, MissionPhase } from './lib/types';
import { createProvenanceLog, addCitation, selectBill, deselectBill } from './lib/provenance';
import type { ProvenanceLog } from './lib/types';
import Threshold from './components/Threshold';
import SearchMission from './components/SearchMission';
import Shortlist from './components/Shortlist';
import ReadingChamber from './components/ReadingChamber';
import VotesLedger from './components/VotesLedger';
import ExportPanel from './components/ExportPanel';
import Settings from './components/Settings';

// ─── Local Storage Keys ─────────────────────────────────

const STORAGE_KEY_CONGRESS = 'ledger-api-congress';
const STORAGE_KEY_GOVINFO = 'ledger-api-govinfo';

function loadApiKeys(): ApiKeys {
  return {
    congressGov: localStorage.getItem(STORAGE_KEY_CONGRESS) ?? '',
    govinfo: localStorage.getItem(STORAGE_KEY_GOVINFO) ?? '',
  };
}

function saveApiKeys(keys: ApiKeys) {
  localStorage.setItem(STORAGE_KEY_CONGRESS, keys.congressGov);
  localStorage.setItem(STORAGE_KEY_GOVINFO, keys.govinfo);
}

// ─── App ────────────────────────────────────────────────

export default function App() {
  const [apiKeys, setApiKeys] = useState<ApiKeys>(loadApiKeys);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [phase, setPhase] = useState<MissionPhase>('threshold');

  // Mission state
  const [provenance, setProvenance] = useState<ProvenanceLog>(createProvenanceLog(''));
  const [searchResults, setSearchResults] = useState<Bill[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
  const [selectedBills, setSelectedBills] = useState<Bill[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [textVersions, setTextVersions] = useState<TextVersion[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [query, setQuery] = useState('');

  // Persist API keys
  useEffect(() => {
    saveApiKeys(apiKeys);
  }, [apiKeys]);

  function handleApiKeysUpdate(keys: ApiKeys) {
    setApiKeys(keys);
  }

  // ─── Phase: Threshold → Search ──────────────────────

  function handleEnter() {
    setPhase('search');
    setProvenance(createProvenanceLog(''));
  }

  // ─── Phase: Search → Shortlist ──────────────────────

  function handleSearchResults(bills: Bill[], updatedProvenance: ProvenanceLog) {
    setSearchResults(bills);
    setTotalResults(bills.length);
    setProvenance(updatedProvenance);
    setQuery(updatedProvenance.query);
    setSelectedTokens(new Set());
    setPhase('shortlist');
  }

  // ─── Phase: Shortlist ───────────────────────────────

  function handleToggleBill(token: string) {
    setSelectedTokens((prev) => {
      const next = new Set(prev);
      if (next.has(token)) {
        next.delete(token);
        setProvenance((p) => deselectBill(p, token));
      } else {
        next.add(token);
        setProvenance((p) => {
          let updated = selectBill(p, token);
          updated = addCitation(updated, token, 'WITNESSED', 'Selected bill');
          return updated;
        });
      }
      return next;
    });
  }

  function handleProceedToReading() {
    const selected = searchResults.filter((b) => selectedTokens.has(b.receiptToken));
    setSelectedBills(selected);
    setActions([]);
    setTextVersions([]);
    setPhase('reading');
  }

  // ─── Phase: Reading ─────────────────────────────────

  const handleActionsLoaded = useCallback((newActions: Action[]) => {
    setActions((prev) => {
      const existing = new Set(prev.map((a) => a.receiptToken));
      const merged = [...prev];
      for (const a of newActions) {
        if (!existing.has(a.receiptToken)) {
          merged.push(a);
        }
      }
      return merged;
    });
    setProvenance((p) => {
      let updated = p;
      for (const action of newActions) {
        updated = addCitation(updated, action.receiptToken, 'WITNESSED', action.text.slice(0, 60));
      }
      return updated;
    });
  }, []);

  const handleTextVersionsLoaded = useCallback((versions: TextVersion[]) => {
    setTextVersions((prev) => {
      const existing = new Set(prev.map((v) => v.receiptToken));
      const merged = [...prev];
      for (const v of versions) {
        if (!existing.has(v.receiptToken)) {
          merged.push(v);
        }
      }
      return merged;
    });
  }, []);

  // ─── Phase: Votes ───────────────────────────────────

  const handleVotesLoaded = useCallback((newVotes: Vote[]) => {
    setVotes(newVotes);
    setProvenance((p) => {
      let updated = p;
      for (const vote of newVotes) {
        updated = addCitation(
          updated,
          vote.receiptToken,
          'WITNESSED',
          `${vote.chamber} Roll ${vote.rollNumber}: ${vote.question}`,
        );
      }
      return updated;
    });
  }, []);

  // ─── Phase: Export ──────────────────────────────────

  function handleNewMission() {
    setPhase('threshold');
    setSearchResults([]);
    setSelectedTokens(new Set());
    setSelectedBills([]);
    setActions([]);
    setTextVersions([]);
    setVotes([]);
    setQuery('');
    setProvenance(createProvenanceLog(''));
  }

  // ─── Build mission object for export ────────────────

  const mission = {
    id: provenance.sessionId,
    query,
    phase,
    provenance,
    selectedBills,
    activeBill: selectedBills[0] ?? null,
    textVersions,
    actions,
    votes,
  };

  return (
    <div className="min-h-screen bg-chamber-bg">
      {/* Top Bar */}
      {phase !== 'threshold' && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-chamber-bg/90 backdrop-blur-sm border-b border-chamber-border">
          <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between">
            <button
              onClick={handleNewMission}
              className="text-xs text-chamber-muted hover:text-chamber-text transition-colors cursor-pointer"
            >
              <span className="glyph mr-1">◊</span> The Ledger
            </button>
            <div className="flex items-center gap-4">
              <PhaseIndicator phase={phase} />
              <button
                onClick={() => setSettingsOpen(true)}
                className="text-xs text-chamber-muted hover:text-chamber-text transition-colors cursor-pointer"
              >
                settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={phase !== 'threshold' ? 'pt-10' : ''}>
        {phase === 'threshold' && <Threshold onEnter={handleEnter} />}

        {phase === 'search' && (
          <SearchMission
            apiKeys={apiKeys}
            provenance={provenance}
            onResults={handleSearchResults}
            onSettingsOpen={() => setSettingsOpen(true)}
          />
        )}

        {phase === 'shortlist' && (
          <Shortlist
            bills={searchResults}
            selected={selectedTokens}
            onToggle={handleToggleBill}
            onProceed={handleProceedToReading}
            onBack={() => setPhase('search')}
            totalResults={totalResults}
          />
        )}

        {phase === 'reading' && (
          <ReadingChamber
            bills={selectedBills}
            apiKeys={apiKeys}
            onActionsLoaded={handleActionsLoaded}
            onTextVersionsLoaded={handleTextVersionsLoaded}
            onProceedToVotes={() => setPhase('votes')}
            onBack={() => setPhase('shortlist')}
          />
        )}

        {phase === 'votes' && (
          <VotesLedger
            bills={selectedBills}
            onVotesLoaded={handleVotesLoaded}
            onProceedToExport={() => setPhase('export')}
            onBack={() => setPhase('reading')}
          />
        )}

        {phase === 'export' && (
          <ExportPanel
            mission={mission}
            onNewMission={handleNewMission}
            onBack={() => setPhase('votes')}
          />
        )}
      </div>

      {/* Settings Drawer */}
      {settingsOpen && (
        <Settings
          apiKeys={apiKeys}
          onUpdate={handleApiKeysUpdate}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Phase Indicator ────────────────────────────────────

function PhaseIndicator({ phase }: { phase: MissionPhase }) {
  const phases: Array<{ key: MissionPhase; label: string }> = [
    { key: 'search', label: 'Search' },
    { key: 'shortlist', label: 'Curate' },
    { key: 'reading', label: 'Read' },
    { key: 'votes', label: 'Votes' },
    { key: 'export', label: 'Export' },
  ];

  return (
    <div className="flex items-center gap-1">
      {phases.map((p, idx) => (
        <span key={p.key}>
          <span
            className={`text-[10px] ${
              p.key === phase
                ? 'text-chamber-accent'
                : phases.findIndex((x) => x.key === phase) > idx
                  ? 'text-chamber-muted'
                  : 'text-chamber-muted/30'
            }`}
          >
            {p.label}
          </span>
          {idx < phases.length - 1 && (
            <span className="text-[10px] text-chamber-muted/20 mx-1">{'\u2192'}</span>
          )}
        </span>
      ))}
    </div>
  );
}
