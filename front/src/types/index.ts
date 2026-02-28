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