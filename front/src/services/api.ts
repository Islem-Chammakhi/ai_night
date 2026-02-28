import axios from "axios";
import {
  UploadedCV,
  MatchResponse,
  TenderDetectRequest,
  TenderDetectResponse,
  CompanyProfile,
  TenderStatsResponse,
} from "@/types";

const API = axios.create({
  baseURL: "http://localhost:8000",
});

// Upload CV with job_id
export const uploadCV = async (
  file: File,
  jobId: number
): Promise<UploadedCV> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("job_id", String(jobId));
  const res = await API.post<UploadedCV>("/cvs/upload", formData);
  return res.data;
};

// Get all CVs for a specific job
export const getCVsByJob = async (jobId: number): Promise<UploadedCV[]> => {
  const res = await API.get<UploadedCV[]>(`/cvs/job/${jobId}`);
  return res.data;
};

// Match CVs for a specific job
export const matchCVs = async (
  requirements: string,
  jobId: number
): Promise<MatchResponse> => {
  const res = await API.post<MatchResponse>("/match/", {
    requirements,
    job_id: jobId,
  });
  return res.data;
};

// Delete a single CV by its cv_id
export const deleteSingleCV = async (cvId: number): Promise<void> => {
  await API.delete(`/cvs/${cvId}`);
};

// Delete all CVs for a specific job (also cleans FAISS index)
export const deleteJobCVs = async (jobId: number): Promise<void> => {
  await API.delete(`/cvs/job/${jobId}`);
};

// Delete all data for a job (called from main.py /jobs/{job_id})
export const deleteJobData = async (jobId: number): Promise<void> => {
  await API.delete(`/jobs/${jobId}`);
};

// ──────────────────────────────────────────────────────────────────────────────
// Smart Tender Detection API
// ──────────────────────────────────────────────────────────────────────────────

/** GET /tenders/company-profile */
export const getCompanyProfile = async (): Promise<CompanyProfile> => {
  const res = await API.get<CompanyProfile>("/tenders/company-profile");
  return res.data;
};

/** GET /tenders/stats — KPI metrics */
export const getTenderStats = async (): Promise<TenderStatsResponse> => {
  const res = await API.get<TenderStatsResponse>("/tenders/stats");
  return res.data;
};

/** POST /tenders/detect — smart detection with filters */
export const detectTenders = async (
  params: TenderDetectRequest
): Promise<TenderDetectResponse> => {
  const res = await API.post<TenderDetectResponse>("/tenders/detect", params);
  return res.data;
};

/** GET /tenders/top?k=N&min_score=X */
export const getTopTenders = async (
  k = 10,
  minScore = 0
): Promise<TenderDetectResponse> => {
  const res = await API.get<TenderDetectResponse>("/tenders/top", {
    params: { k, min_score: minScore },
  });
  return res.data;
};

/** GET /tenders/all */
export const getAllTenders = async (
  includeExcluded = false
): Promise<TenderDetectResponse> => {
  const res = await API.get<TenderDetectResponse>("/tenders/all", {
    params: { include_excluded: includeExcluded },
  });
  return res.data;
};

/** GET /tenders/search?q=keyword */
export const searchTenders = async (
  q: string,
  includeExcluded = false
): Promise<TenderDetectResponse> => {
  const res = await API.get<TenderDetectResponse>("/tenders/search", {
    params: { q, include_excluded: includeExcluded },
  });
  return res.data;
};
