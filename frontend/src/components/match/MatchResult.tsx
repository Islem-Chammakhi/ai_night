"use client";

import { useState } from "react";
import { useJobs } from "@/store/jobStore";
import JobCard from "./JobCard";
import CreateJobModal from "./CreateJobModal";
import { Plus, BrainCircuit, Briefcase, CheckCircle2, Users } from "lucide-react";
import Container from "@/components/global/container";
import Wrapper from "@/components/global/wrapper";
import { Button } from "@/components/ui/button";

export default function MatchResult() {
  const { jobs } = useJobs();
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  const stats = [
    {
      label: "Total Offers",
      value: jobs.length,
      icon: Briefcase,
      color: "text-neutral-500",
    },
    {
      label: "Completed",
      value: jobs.filter((j) => j.status === "done").length,
      icon: CheckCircle2,
      color: "text-emerald-500",
    },
    {
      label: "Total CVs",
      value: jobs.reduce((acc, j) => acc + j.uploadedCVs.length, 0),
      icon: Users,
      color: "text-primary",
    },
  ];

  return (
    <div className="w-full pb-24">
      <Wrapper>
        {/* Sub-Header Actions */}
        <Container delay={0.3}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-8 border-b border-border mb-10">
            <div className="flex flex-col items-center md:items-start">
              <h3 className="text-xl font-semibold tracking-tight">
                Current Opportunities
              </h3>
              <p className="text-sm text-muted-foreground text-center md:text-left">
                Manage your active job listings and AI matching status.
              </p>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="rounded-full shadow-lg shadow-primary/20 gap-2"
            >
              <Plus className="size-4" />
              New Job Offer
            </Button>
          </div>
        </Container>

        {/* Stats Section */}
        {jobs.length > 0 && (
          <Container delay={0.4}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              {stats.map((stat, i) => (
                <div key={i} className="bg-card/50 border border-border rounded-2xl p-5 flex items-center gap-4" >
                  <div className={`p-3 rounded-xl bg-muted/50 ${stat.color}`}>
                    <stat.icon className="size-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {stat.label}
                    </span>
                    <span className="text-2xl font-bold tracking-tight">
                      {stat.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        )}

        {/* Content Area */}
        <Container delay={0.5}>
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 px-4 border border-dashed border-border rounded-4xl bg-muted/20">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-6">
                <BrainCircuit className="size-8 text-muted-foreground/40" />
              </div>
              <h4 className="text-lg font-medium">No job offers available</h4>
              <p className="text-sm text-muted-foreground text-center max-w-xs mt-2">
                Click the "New Job Offer" button above to upload your first tender or job description.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </Container>
      </Wrapper>

      {showCreateModal && (
        <CreateJobModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}