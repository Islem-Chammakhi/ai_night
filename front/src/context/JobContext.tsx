"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Job, JobContextType } from "@/types";

const JobContext = createContext<JobContextType | null>(null);

let nextJobId = 1;

export const JobProvider = ({ children }: { children: React.ReactNode }) => {
    const [jobs, setJobs] = useState<Job[]>([]);

    const addJob = useCallback(
        (job: Omit<Job, "id" | "uploadedCVs" | "matchResults" | "status">) => {
            const newJob: Job = {
                ...job,
                id: nextJobId++,
                uploadedCVs: [],
                matchResults: null,
                status: "idle",
            };
            setJobs((prev) => [...prev, newJob]);
        },
        []
    );

    const updateJob = useCallback(
        (jobId: number, updates: Partial<Job>) => {
            setJobs((prev) =>
                prev.map((j) => (j.id === jobId ? { ...j, ...updates } : j))
            );
        },
        []
    );

    const deleteJob = useCallback((jobId: number) => {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
    }, []);

    return (
        <JobContext.Provider value={{ jobs, addJob, updateJob, deleteJob }}>
            {children}
        </JobContext.Provider>
    );
};

export const useJobs = (): JobContextType => {
    const ctx = useContext(JobContext);
    if (!ctx) throw new Error("useJobs must be used within a JobProvider");
    return ctx;
};
