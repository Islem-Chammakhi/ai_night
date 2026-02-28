"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { Job, JobContextType } from "@/types";

const JobContext = createContext<JobContextType | null>(null);

export function JobProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);

  const addJob = (
    job: Omit<Job, "id" | "uploadedCVs" | "matchResults" | "status">
  ) => {
    setJobs((prev) => [
      ...prev,
      {
        ...job,
        id: Date.now(),
        uploadedCVs: [],
        matchResults: null,
        status: "idle",
      },
    ]);
  };

  const updateJob = (jobId: number, updates: Partial<Job>) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, ...updates } : j))
    );
  };

  const deleteJob = (jobId: number) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  return (
    <JobContext.Provider value={{ jobs, addJob, updateJob, deleteJob }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJobs(): JobContextType {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error("useJobs must be used within a JobProvider");
  }
  return context;
}