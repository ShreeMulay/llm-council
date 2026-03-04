import { cn } from "@/lib/utils";
import { DOMAIN_LABELS, type RetrievedChunk } from "@/lib/types";
import { BookOpen, ChevronDown, ChevronUp, Pill } from "lucide-react";
import { useState } from "react";

interface CitationPanelProps {
  citations: RetrievedChunk[];
  confidence: number;
  queryTimeMs: number;
  domainsSearched: string[];
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 70 ? "text-tke-accent bg-emerald-50" :
    pct >= 50 ? "text-tke-warning bg-amber-50" :
    "text-tke-danger bg-red-50";

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", color)}>
      {pct}% confidence
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <span className="text-xs text-tke-text-muted">
      {pct}% match
    </span>
  );
}

function CitationCard({ citation, index }: { citation: RetrievedChunk; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-tke-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-tke-sky text-tke-blue text-xs font-bold flex items-center justify-center mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-tke-text truncate">
              {citation.source_title}
            </span>
            <ScoreBadge score={citation.score} />
          </div>
          {citation.section_title && (
            <p className="text-xs text-tke-text-muted mt-0.5 truncate">
              {citation.section_title}
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-tke-slate flex-shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-tke-slate flex-shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-tke-border bg-slate-50">
          {/* Domain + Drug tags */}
          <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
            <span className="px-2 py-0.5 rounded-full text-xs bg-tke-sky text-tke-blue font-medium">
              {DOMAIN_LABELS[citation.domain] ?? citation.domain}
            </span>
            {citation.drug_names.slice(0, 4).map((drug) => (
              <span
                key={drug}
                className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700 font-medium flex items-center gap-1"
              >
                <Pill className="w-3 h-3" />
                {drug}
              </span>
            ))}
          </div>
          {/* Chunk text */}
          <p className="text-xs text-tke-text leading-relaxed whitespace-pre-wrap">
            {citation.text}
          </p>
        </div>
      )}
    </div>
  );
}

export function CitationPanel({ citations, confidence, queryTimeMs, domainsSearched }: CitationPanelProps) {
  if (citations.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {/* Meta bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <ConfidenceBadge confidence={confidence} />
        <span className="text-xs text-tke-text-muted">
          {citations.length} sources
        </span>
        <span className="text-xs text-tke-text-muted">
          {queryTimeMs < 1000 ? `${queryTimeMs}ms` : `${(queryTimeMs / 1000).toFixed(1)}s`}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <BookOpen className="w-3 h-3 text-tke-slate" />
          {domainsSearched.map((d) => (
            <span key={d} className="text-xs text-tke-text-muted">
              {DOMAIN_LABELS[d as keyof typeof DOMAIN_LABELS] ?? d}
            </span>
          ))}
        </div>
      </div>

      {/* Citation cards */}
      <div className="space-y-1.5">
        {citations.map((c, i) => (
          <CitationCard key={`${c.source_id}-${i}`} citation={c} index={i} />
        ))}
      </div>
    </div>
  );
}
