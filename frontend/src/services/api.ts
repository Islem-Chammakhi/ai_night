import axios from "axios";
import { UploadedCV, MatchResponse } from "@/types";


const API = axios.create({
  baseURL: "http://localhost:8000",
});

// Upload CV with job_id
export const uploadCV = async ( file: File, jobId: number ): Promise<UploadedCV> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("job_id", String(jobId));
  const res = await API.post<UploadedCV>("/cvs/upload", formData);
  return res.data;
};

// Match CVs for a specific job
export const matchCVs = async ( requirements: string, jobId: number ): Promise<MatchResponse> => {
  const res = await API.post<MatchResponse>("/match/", {
    requirements,
    job_id: jobId,
  });
  return res.data;
};

// Delete all data for a job
export const deleteJobData = async (jobId: number): Promise<void> => {
  await API.delete(`/jobs/${jobId}`);
};