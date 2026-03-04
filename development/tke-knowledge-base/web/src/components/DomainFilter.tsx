import { cn } from "@/lib/utils";
import { DOMAIN_LABELS, type Domain } from "@/lib/types";
import { Filter, X } from "lucide-react";

interface DomainFilterProps {
  selected: Domain | null;
  onSelect: (domain: Domain | null) => void;
}

const DOMAIN_ORDER: Domain[] = [
  "proteinuria",
  "raas_blockade",
  "sglt2_inhibitors",
  "finerenone_mra",
  "glp1_agonists",
  "chf_gdmt",
  "anemia_ckd_mbd",
  "electrolytes",
  "diabetes",
  "statins_lipids",
  "nsaid_ppi_avoidance",
  "smoking_cessation",
  "gout_uric_acid",
  "transplant_immunosuppression",
  "gn_immunosuppression",
  "general",
];

export function DomainFilter({ selected, onSelect }: DomainFilterProps) {
  return (
    <div className="px-4 py-3 border-b border-tke-border bg-white">
      <div className="flex items-center gap-2 mb-2">
        <Filter className="w-4 h-4 text-tke-slate" />
        <span className="text-xs font-medium text-tke-text-muted uppercase tracking-wider">
          Filter by Domain
        </span>
        {selected && (
          <button
            onClick={() => onSelect(null)}
            className="ml-auto flex items-center gap-1 text-xs text-tke-blue hover:text-tke-blue-light"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DOMAIN_ORDER.map((domain) => (
          <button
            key={domain}
            onClick={() => onSelect(selected === domain ? null : domain)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              selected === domain
                ? "bg-tke-blue text-white"
                : "bg-slate-100 text-tke-text-muted hover:bg-tke-sky hover:text-tke-blue"
            )}
          >
            {DOMAIN_LABELS[domain]}
          </button>
        ))}
      </div>
    </div>
  );
}
