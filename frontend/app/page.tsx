"use client";
import { useState } from "react";
import { useJobs } from "@/store/jobStore";
import JobCard from "@/components/JobCard";
import CreateJobModal from "@/components/CreateJobModal";
import { Plus, BrainCircuit } from "lucide-react";

export default function Home() {
  const { jobs } = useJobs();
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BrainCircuit size={32} className="text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                SmartTender AI
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Manage job offers and match candidates automatically
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            <Plus size={18} />
            New Job Offer
          </button>
        </div>

        {/* Stats Bar */}
        {jobs.length > 0 && (
          <div className="flex gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm">
              <span className="text-gray-400">Total Offers</span>
              <span className="ml-2 font-bold text-gray-800">{jobs.length}</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm">
              <span className="text-gray-400">Completed</span>
              <span className="ml-2 font-bold text-green-600">
                {jobs.filter((j) => j.status === "done").length}
              </span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm">
              <span className="text-gray-400">Total CVs</span>
              <span className="ml-2 font-bold text-blue-600">
                {jobs.reduce((acc, j) => acc + j.uploadedCVs.length, 0)}
              </span>
            </div>
          </div>
        )}

        {/* Job Cards Grid */}
        {jobs.length === 0 ? (
          <div className="text-center py-32 text-gray-400">
            <BrainCircuit size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-xl font-medium">No job offers yet</p>
            <p className="mt-2 text-sm">
              Click "New Job Offer" to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateJobModal onClose={() => setShowCreateModal(false)} />
      )}
    </main>
  );
}