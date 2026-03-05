import { useEffect, useState } from "react";
import { getLibrary } from "@/lib/api";
import {
  CONTENT_TYPE_LABELS,
  DOMAIN_LABELS,
  type ArticleSummary,
  type Domain,
} from "@/lib/types";
import { ArticleReader } from "./ArticleReader";
import {
  BookOpen,
  GitBranch,
  Pill,
  Search,
  Stethoscope,
  Table,
  FileText,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_ICON_MAP: Record<string, typeof BookOpen> = {
  protocol: Stethoscope,
  drug_monograph: Pill,
  guideline_summary: BookOpen,
  decision_algorithm: GitBranch,
  quick_reference: Table,
};

const TYPE_COLOR_MAP: Record<string, string> = {
  protocol: "bg-blue-50 text-blue-700 border-blue-200",
  drug_monograph: "bg-purple-50 text-purple-700 border-purple-200",
  guideline_summary: "bg-emerald-50 text-emerald-700 border-emerald-200",
  decision_algorithm: "bg-amber-50 text-amber-700 border-amber-200",
  quick_reference: "bg-slate-50 text-slate-700 border-slate-200",
};

interface LibraryProps {
  onAskAbout?: (question: string) => void;
}

export function Library({ onAskAbout }: LibraryProps) {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [allArticles, setAllArticles] = useState<ArticleSummary[]>([]);
  const [contentTypes, setContentTypes] = useState<Record<string, number>>({});
  const [domains, setDomains] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Reader
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Load library index
  useEffect(() => {
    setLoading(true);
    getLibrary()
      .then((data) => {
        setAllArticles(data.articles);
        setArticles(data.articles);
        setContentTypes(data.content_types);
        setDomains(data.domains);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Apply client-side filters
  useEffect(() => {
    let filtered = allArticles;
    if (typeFilter) {
      filtered = filtered.filter((a) => a.content_type === typeFilter);
    }
    if (domainFilter) {
      filtered = filtered.filter((a) => a.domain === domainFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.domain.toLowerCase().includes(q) ||
          (a.drug_class && a.drug_class.toLowerCase().includes(q))
      );
    }
    setArticles(filtered);
  }, [allArticles, typeFilter, domainFilter, searchQuery]);

  // If an article is selected, show the reader
  if (selectedArticleId) {
    return (
      <ArticleReader
        articleId={selectedArticleId}
        onBack={() => setSelectedArticleId(null)}
        onAskAbout={onAskAbout}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-tke-text flex items-center gap-2">
            <FileText className="w-5 h-5 text-tke-blue" />
            Knowledge Base Library
          </h2>
          <p className="text-sm text-tke-text-muted mt-1">
            Browse {allArticles.length} clinical articles across {Object.keys(contentTypes).length} content types
          </p>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tke-slate" />
          <input
            type="text"
            placeholder="Search articles by title, domain, or drug class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-tke-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tke-blue/30 focus:border-tke-blue"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-tke-slate hover:text-tke-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content type filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setTypeFilter(null)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              !typeFilter
                ? "bg-tke-navy text-white border-tke-navy"
                : "bg-white text-tke-text-muted border-tke-border hover:bg-slate-50"
            )}
          >
            All ({allArticles.length})
          </button>
          {Object.entries(contentTypes)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => {
              const Icon = TYPE_ICON_MAP[type] || FileText;
              return (
                <button
                  key={type}
                  onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5",
                    typeFilter === type
                      ? "bg-tke-navy text-white border-tke-navy"
                      : "bg-white text-tke-text-muted border-tke-border hover:bg-slate-50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {CONTENT_TYPE_LABELS[type] || type} ({count})
                </button>
              );
            })}
        </div>

        {/* Domain filter chips */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {domainFilter && (
            <button
              onClick={() => setDomainFilter(null)}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-tke-danger text-white flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear domain
            </button>
          )}
          {Object.entries(domains)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([domain, count]) => (
              <button
                key={domain}
                onClick={() => setDomainFilter(domainFilter === domain ? null : domain)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                  domainFilter === domain
                    ? "bg-tke-blue text-white"
                    : "bg-tke-sky text-tke-blue hover:bg-blue-100"
                )}
              >
                {DOMAIN_LABELS[domain as Domain] || domain} ({count})
              </button>
            ))}
        </div>

        {/* Results count */}
        {(typeFilter || domainFilter || searchQuery) && (
          <p className="text-xs text-tke-text-muted mb-4">
            Showing {articles.length} of {allArticles.length} articles
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12 text-tke-text-muted">
            Loading library...
          </div>
        )}

        {/* Empty state */}
        {!loading && articles.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-10 h-10 text-tke-slate mx-auto mb-3" />
            <p className="text-tke-text-muted">No articles match your filters.</p>
            <button
              onClick={() => {
                setTypeFilter(null);
                setDomainFilter(null);
                setSearchQuery("");
              }}
              className="mt-2 text-sm text-tke-blue hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Article grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {articles.map((article) => {
            const Icon = TYPE_ICON_MAP[article.content_type] || FileText;
            const colorClass = TYPE_COLOR_MAP[article.content_type] || TYPE_COLOR_MAP.quick_reference;

            return (
              <button
                key={article.id}
                onClick={() => setSelectedArticleId(article.id)}
                className="text-left p-4 rounded-xl border border-tke-border bg-white hover:shadow-md hover:border-tke-blue/30 transition-all group"
              >
                {/* Type badge + domain */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                      colorClass
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {CONTENT_TYPE_LABELS[article.content_type] || article.content_type}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-tke-text mb-1 line-clamp-2 group-hover:text-tke-blue transition-colors">
                  {article.title}
                </h3>

                {/* Meta row */}
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-tke-sky text-tke-blue font-medium">
                    {DOMAIN_LABELS[article.domain as Domain] || article.domain}
                  </span>
                  {article.drug_class && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-600 font-medium">
                      {article.drug_class}
                    </span>
                  )}
                  <span className="text-xs text-tke-text-muted ml-auto">
                    {article.word_count.toLocaleString()} words
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
