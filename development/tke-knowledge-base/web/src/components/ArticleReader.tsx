import { useEffect, useState } from "react";
import { getArticle } from "@/lib/api";
import {
  CONTENT_TYPE_LABELS,
  DOMAIN_LABELS,
  type ArticleFull,
  type Domain,
} from "@/lib/types";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileText,
  GitBranch,
  List,
  MessageSquare,
  Pill,
  Stethoscope,
  Table,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Markdown from "react-markdown";

const TYPE_ICON_MAP: Record<string, typeof BookOpen> = {
  protocol: Stethoscope,
  drug_monograph: Pill,
  guideline_summary: BookOpen,
  decision_algorithm: GitBranch,
  quick_reference: Table,
};

interface ArticleReaderProps {
  articleId: string;
  onBack: () => void;
  onAskAbout?: (question: string) => void;
}

export function ArticleReader({ articleId, onBack, onAskAbout }: ArticleReaderProps) {
  const [article, setArticle] = useState<ArticleFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToc, setShowToc] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getArticle(articleId)
      .then(setArticle)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [articleId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-tke-text-muted">
        Loading article...
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-tke-danger">Failed to load article: {error}</p>
        <button onClick={onBack} className="text-sm text-tke-blue hover:underline">
          Back to library
        </button>
      </div>
    );
  }

  const Icon = TYPE_ICON_MAP[article.content_type] || FileText;
  const readingTime = Math.max(1, Math.round(article.word_count / 200));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-tke-text-muted hover:text-tke-blue transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </button>
          <div className="flex items-center gap-2">
            {article.sections.length > 0 && (
              <button
                onClick={() => setShowToc(!showToc)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  showToc
                    ? "bg-tke-navy text-white border-tke-navy"
                    : "bg-white text-tke-text-muted border-tke-border hover:bg-slate-50"
                )}
              >
                <List className="w-3.5 h-3.5" />
                Contents
              </button>
            )}
            {onAskAbout && (
              <button
                onClick={() => onAskAbout(`Tell me about ${article.title}`)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-tke-blue text-white hover:bg-tke-blue-light transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Ask AI
              </button>
            )}
          </div>
        </div>

        {/* Article header */}
        <div className="mb-6 pb-6 border-b border-tke-border">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-tke-sky text-tke-blue border border-blue-200">
              <Icon className="w-3.5 h-3.5" />
              {CONTENT_TYPE_LABELS[article.content_type] || article.content_type}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-tke-sky text-tke-blue">
              {DOMAIN_LABELS[article.domain as Domain] || article.domain}
            </span>
            {article.drug_class && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                {article.drug_class}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-tke-text mb-3">{article.title}</h1>

          <div className="flex items-center gap-4 text-xs text-tke-text-muted">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              ~{readingTime} min read
            </span>
            <span>{article.word_count.toLocaleString()} words</span>
            {article.generated_date && <span>Generated: {article.generated_date}</span>}
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                article.status === "approved"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              )}
            >
              {article.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Table of contents */}
        {showToc && article.sections.length > 0 && (
          <div className="mb-6 p-4 rounded-xl border border-tke-border bg-slate-50">
            <h3 className="text-sm font-semibold text-tke-text mb-2 flex items-center gap-1.5">
              <List className="w-4 h-4" />
              Table of Contents
            </h3>
            <ol className="space-y-1">
              {article.sections.map((section, i) => (
                <li key={i} className="text-sm text-tke-blue hover:underline cursor-default">
                  {i + 1}. {section}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Article body */}
        <article className="markdown-answer prose-article">
          <Markdown>{article.content}</Markdown>
        </article>

        {/* Bottom navigation */}
        <div className="mt-8 pt-6 border-t border-tke-border flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-tke-text-muted hover:text-tke-blue transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </button>
          {onAskAbout && (
            <button
              onClick={() => onAskAbout(`Tell me about ${article.title}`)}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-tke-blue text-white hover:bg-tke-blue-light transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Ask AI about this topic
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
