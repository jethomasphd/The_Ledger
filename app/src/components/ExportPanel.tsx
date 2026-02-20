/**
 * ExportPanel — Mission Export + Completion
 *
 * Three exports: brief.md, brief.docx, provenance.json
 * Clear stopping point. Mission complete.
 */

import { useState } from 'react';
import type { Mission } from '../lib/types';
import { downloadMarkdown, downloadDocx, downloadProvenance } from '../lib/exports';

interface ExportPanelProps {
  mission: Mission;
  onNewMission: () => void;
  onBack: () => void;
}

export default function ExportPanel({ mission, onNewMission, onBack }: ExportPanelProps) {
  const [exported, setExported] = useState<Set<string>>(new Set());

  function markExported(type: string) {
    setExported((prev) => new Set([...prev, type]));
  }

  function handleMarkdown() {
    downloadMarkdown(mission);
    markExported('md');
  }

  async function handleDocx() {
    await downloadDocx(mission);
    markExported('docx');
  }

  function handleProvenance() {
    downloadProvenance(mission);
    markExported('json');
  }

  const allExported = exported.size === 3;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
      {/* Phase Header */}
      <div className="text-center space-y-2">
        <p className="glyph text-2xl">◊</p>
        <h2 className="text-lg tracking-wide text-chamber-accent">Mission: Export</h2>
        <p className="text-xs text-chamber-muted">
          Your mission brief is ready. Download your artifacts.
        </p>
      </div>

      {/* Mission Summary */}
      <div className="border border-chamber-border p-4 space-y-3">
        <h3 className="text-xs text-chamber-muted uppercase tracking-wider">Mission Summary</h3>
        <p className="text-sm text-chamber-text">Query: {mission.query}</p>
        <div className="text-xs text-chamber-muted space-y-1">
          <p>Bills examined: {mission.selectedBills.length}</p>
          <p>Actions recorded: {mission.actions.length}</p>
          <p>Votes retrieved: {mission.votes.length}</p>
          <p>Strategies used: {mission.provenance.strategies.length}</p>
          <p>
            Receipt tokens: {Object.keys(mission.provenance.citationsMap).length}
          </p>
        </div>
        <p className="text-[10px] text-chamber-muted/50">
          Session: {mission.provenance.sessionId}
        </p>
      </div>

      {/* Export Actions */}
      <div className="space-y-3">
        <ExportButton
          label="brief.md"
          description="Markdown brief with receipt tokens"
          done={exported.has('md')}
          onClick={handleMarkdown}
        />
        <ExportButton
          label="brief.docx"
          description="Word document version"
          done={exported.has('docx')}
          onClick={handleDocx}
        />
        <ExportButton
          label="provenance.json"
          description="Full chain of custody: strategies, selections, citations"
          done={exported.has('json')}
          onClick={handleProvenance}
        />
      </div>

      {/* Provenance Note */}
      <div className="border border-chamber-border p-3 text-xs text-chamber-muted space-y-2">
        <p className="uppercase tracking-wider text-[10px]">Provenance Notice</p>
        <p>
          Every claim in the brief is tethered to a primary source via Receipt Tokens.
          The provenance.json file contains the complete chain of custody:
          what was searched, what was selected, and how each citation was derived.
        </p>
        <p>
          <span className="receipt-witnessed">WITNESSED</span> = directly observed in primary source data.
          <br />
          <span className="receipt-inference">INFERENCE</span> = derived by reasoning over witnessed data.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-chamber-border">
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs text-chamber-muted hover:text-chamber-text
                     transition-colors cursor-pointer"
        >
          Back to votes
        </button>
        <button
          onClick={onNewMission}
          className="px-4 py-2 border border-chamber-border text-xs text-chamber-accent
                     hover:border-chamber-muted hover:text-chamber-text
                     transition-colors cursor-pointer"
        >
          {allExported ? 'New mission' : 'Start over'}
        </button>
      </div>

      {/* Mission Complete */}
      {allExported && (
        <div className="text-center space-y-3 pt-8">
          <p className="glyph text-xl">❧</p>
          <p className="text-sm text-chamber-accent">Mission complete.</p>
          <p className="text-[10px] text-chamber-muted">
            You touched the record. The receipts are yours.
          </p>
        </div>
      )}

      {/* Stopping Point */}
      <div className="text-center pt-4">
        <p className="text-[10px] text-chamber-muted/40">
          ♦ ◊ ♦ End of mission ♦ ◊ ♦
        </p>
      </div>
    </div>
  );
}

// ─── Sub-component ──────────────────────────────────────

function ExportButton({
  label,
  description,
  done,
  onClick,
}: {
  label: string;
  description: string;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left border p-4 flex items-center justify-between
                 transition-colors cursor-pointer ${
                   done
                     ? 'border-witnessed/30 bg-witnessed/5'
                     : 'border-chamber-border hover:border-chamber-muted'
                 }`}
    >
      <div>
        <p className="text-sm text-chamber-text font-mono">{label}</p>
        <p className="text-xs text-chamber-muted">{description}</p>
      </div>
      <span
        className={`text-xs ${
          done ? 'text-witnessed' : 'text-chamber-muted'
        }`}
      >
        {done ? '✓ saved' : 'download'}
      </span>
    </button>
  );
}
