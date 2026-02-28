export interface KeyPoint {
  value: string;
}

export interface UploadedCV {
  id: number;
  job_id: number;
  filename: string;
  candidate_name: string;
  skills: string[];
  uploaded_at: string;
}

export interface CandidateMatch {
  cv_id: number;
  filename: string;
  candidate_name: string;
  final_score: number;
  embedding_score: number;
  reranker_score: number;
  skill_score: number;
  match_tier: "Strong Match" | "Partial Match" | "Weak Match";
  matched_skills: string[];
  missing_skills: string[];
}

export interface NearMissCandidate {
  cv_id: number;
  filename: string;
  candidate_name: string;
  their_domain: string;
  their_skills: string[];
  required_skills: string[];
  skills_they_have: string[];
  skills_they_lack: string[];
  suggestion: string;
}

export interface MatchResponse {
  total_cvs_scanned: number;
  top_candidates: CandidateMatch[];
  match_found: boolean;
  explanation: string | null;
  near_misses: NearMissCandidate[] | null;
  suggestions: string[] | null;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  requirements: string;
  uploadedCVs: UploadedCV[];
  matchResults: MatchResponse | null;
  status: "idle" | "uploading" | "matching" | "done";
}

export interface JobContextType {
  jobs: Job[];
  addJob: (job: Omit<Job, "id" | "uploadedCVs" | "matchResults" | "status">) => void;
  updateJob: (jobId: number, updates: Partial<Job>) => void;
  deleteJob: (jobId: number) => void;
}

// ──────────────────────────────────────────
// Smart Tender Detection types
// ──────────────────────────────────────────

export interface TenderResult {
  title: string;
  issuing_authority: string;
  project_description: string;
  required_skills: string[];
  publication_date: string;
  submission_deadline: string;
  days_to_deadline: number | null;
  contract_duration_months: number | null;
  budget_currency: string | null;
  budget_min: number | null;
  budget_max: number | null;
  semantic_score: number;       // 0-100
  semantic_similarity: number;  // 0-1
  is_excluded: boolean;
}

export interface TenderDetectRequest {
  top_k?: number;
  min_score?: number;
  include_excluded?: boolean;
  keyword?: string;
}

export interface TenderDetectResponse {
  total_tenders: number;
  returned: number;
  company: string;
  results: TenderResult[];
}

export interface CompanyProfile {
  company_name: string;
  focus_domains: string[];
  secondary_domains: string[];
  core_skills: string[];
  ml_skills: string[];
  excluded_domains: string[];
  regions: string[];
  min_budget_eur: number;
  max_budget_eur: number;
  preferred_contract_duration_months: number[];
  required_language: string[];
  text: string;
}

export interface TenderStatsResponse {
  total_tenders: number;
  avg_semantic_score: number;
  max_semantic_score: number;
  min_semantic_score: number;
  excluded_count: number;
  eligible_count: number;
  score_buckets: { high: number; medium: number; low: number };
  upcoming_deadlines: number;
}