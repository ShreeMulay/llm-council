/** Domain identifiers matching the Python backend */
export type Domain =
  | "proteinuria"
  | "raas_blockade"
  | "sglt2_inhibitors"
  | "finerenone_mra"
  | "glp1_agonists"
  | "chf_gdmt"
  | "anemia_ckd_mbd"
  | "electrolytes"
  | "diabetes"
  | "statins_lipids"
  | "nsaid_ppi_avoidance"
  | "smoking_cessation"
  | "gout_uric_acid"
  | "transplant_immunosuppression"
  | "gn_immunosuppression"
  | "general";

export interface RetrievedChunk {
  text: string;
  score: number;
  source_title: string;
  source_id: string;
  source_url: string | null;
  domain: Domain;
  drug_names: string[];
  section_title: string | null;
}

export interface ChatQuery {
  question: string;
  domain_filter?: Domain | null;
  session_id?: string | null;
}

export interface ChatResponse {
  answer: string;
  citations: RetrievedChunk[];
  confidence: number;
  domains_searched: Domain[];
  query_time_ms: number;
}

export interface DomainInfo {
  id: Domain;
  name: string;
}

export interface CollectionInfo {
  points_count: number;
  status: string;
  indexed_vectors_count: number;
}

/** A single message in the chat history */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  response?: ChatResponse;
}

/** Library article summary (from /library endpoint) */
export interface ArticleSummary {
  id: string;
  title: string;
  content_type: string;
  domain: Domain;
  word_count: number;
  generated_date: string | null;
  status: string;
  drug_class: string | null;
}

/** Full article content (from /library/:folder/:stem endpoint) */
export interface ArticleFull extends ArticleSummary {
  content: string;
  sections: string[];
}

/** Library index response */
export interface LibraryIndexResponse {
  total: number;
  articles: ArticleSummary[];
  content_types: Record<string, number>;
  domains: Record<string, number>;
}

/** Content type labels */
export const CONTENT_TYPE_LABELS: Record<string, string> = {
  protocol: "Clinical Protocol",
  drug_monograph: "Drug Monograph",
  guideline_summary: "Guideline Summary",
  decision_algorithm: "Decision Algorithm",
  quick_reference: "Quick Reference",
};

/** Content type icons (lucide icon names for mapping) */
export const CONTENT_TYPE_ICONS: Record<string, string> = {
  protocol: "Stethoscope",
  drug_monograph: "Pill",
  guideline_summary: "BookOpen",
  decision_algorithm: "GitBranch",
  quick_reference: "Table",
};

/** Domain display names (human-friendly) */
export const DOMAIN_LABELS: Record<Domain, string> = {
  proteinuria: "Proteinuria",
  raas_blockade: "RAAS Blockade",
  sglt2_inhibitors: "SGLT2 Inhibitors",
  finerenone_mra: "Finerenone / MRA",
  glp1_agonists: "GLP-1 Agonists",
  chf_gdmt: "CHF / GDMT",
  anemia_ckd_mbd: "Anemia / CKD-MBD",
  electrolytes: "Electrolytes",
  diabetes: "Diabetes",
  statins_lipids: "Statins / Lipids",
  nsaid_ppi_avoidance: "NSAID / PPI Avoidance",
  smoking_cessation: "Smoking Cessation",
  gout_uric_acid: "Gout / Uric Acid",
  transplant_immunosuppression: "Transplant Immunosuppression",
  gn_immunosuppression: "GN Immunosuppression",
  general: "General",
};
