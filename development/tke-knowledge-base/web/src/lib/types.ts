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
