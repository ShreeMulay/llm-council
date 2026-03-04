import { Activity, BookOpen } from "lucide-react";
import type { CollectionInfo } from "@/lib/types";

interface HeaderProps {
  collectionInfo: CollectionInfo | null;
}

export function Header({ collectionInfo }: HeaderProps) {
  return (
    <header className="bg-tke-navy text-white px-6 py-3 flex items-center justify-between shadow-md">
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
    </header>
  );
}
