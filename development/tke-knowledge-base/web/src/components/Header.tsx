import { Activity, BookOpen, FileText, MessageSquare } from "lucide-react";
import type { CollectionInfo } from "@/lib/types";
import type { View } from "@/App";
import { cn } from "@/lib/utils";

interface HeaderProps {
  collectionInfo: CollectionInfo | null;
  activeView?: View;
  onViewChange?: (view: View) => void;
}

export function Header({ collectionInfo, activeView = "chat", onViewChange }: HeaderProps) {
  return (
    <header className="bg-tke-navy text-white shadow-md">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-tke-blue-light" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">TKE Knowledge Base</h1>
            <p className="text-xs text-slate-400">The Kidney Experts Clinical Reference</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {collectionInfo && (
            <div className="flex items-center gap-2 text-slate-300">
              <Activity className="w-4 h-4 text-tke-accent" />
              <span>{collectionInfo.points_count} chunks</span>
              <span className="text-slate-500">|</span>
              <span className={collectionInfo.status === "green" ? "text-tke-accent" : "text-tke-warning"}>
                {collectionInfo.status}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      {onViewChange && (
        <div className="px-6 flex gap-1 border-t border-white/10">
          <button
            onClick={() => onViewChange("chat")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeView === "chat"
                ? "text-white border-tke-blue-light"
                : "text-slate-400 border-transparent hover:text-slate-200"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => onViewChange("library")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeView === "library"
                ? "text-white border-tke-blue-light"
                : "text-slate-400 border-transparent hover:text-slate-200"
            )}
          >
            <FileText className="w-4 h-4" />
            Library
          </button>
        </div>
      )}
    </header>
  );
}
