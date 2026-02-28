import axios from "axios";
import { UploadedCV, MatchResponse } from "@/types";

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
