/**
 * Threshold — The Cinematic Entry
 *
 * The first thing the user sees. A quiet void
 * with a single glyph, a name, and an invitation.
 * Anti-flood begins here: no feed, no trending, no noise.
 */

interface ThresholdProps {
  onEnter: () => void;
}

export default function Threshold({ onEnter }: ThresholdProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center space-y-8">
        {/* The Glyph */}
        <p className="glyph text-4xl tracking-widest">◊</p>

        {/* The Name */}
        <h1 className="text-2xl tracking-wide text-chamber-text font-light">
          The Ledger
        </h1>

        {/* The Negative Triad */}
        <div className="space-y-1 text-sm text-chamber-muted">
          <p>Not a feed.</p>
          <p>Not a search engine.</p>
          <p>A reading room for the public record.</p>
        </div>

        {/* The Promise */}
        <p className="text-xs text-chamber-muted leading-relaxed max-w-xs mx-auto">
          Bills. Votes. Actions. Traced to their source.
          <br />
          You curate what enters. Nothing auto-plays.
        </p>

        {/* The Invitation */}
        <button
          onClick={onEnter}
          className="mt-8 px-6 py-3 border border-chamber-border text-chamber-accent
                     text-sm tracking-wide hover:border-chamber-muted hover:text-chamber-text
                     transition-colors duration-300 cursor-pointer"
        >
          Begin a mission
        </button>

        {/* The Fine Print */}
        <p className="text-[10px] text-chamber-muted/50 mt-12">
          Primary sources only. Every claim carries a receipt.
        </p>
      </div>
    </div>
  );
}
