"use client";
import { useJobs } from "@/store/jobStore";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { CandidateMatch } from "@/types";
import { ReactNode } from "react";

const tierColors: Record<CandidateMatch["match_tier"], string> = {
  "Strong Match": "bg-green-100 text-green-700 border-green-200",
  "Partial Match": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Weak Match": "bg-red-100 text-red-700 border-red-200",
};

const tierIcons: Record<CandidateMatch["match_tier"], ReactNode> = {
  "Strong Match": <CheckCircle size={16} />,
  "Partial Match": <AlertCircle size={16} />,
  "Weak Match": <XCircle size={16} />,
};

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { jobs } = useJobs();
  const router = useRouter();

  const job = jobs.find((j) => j.id === Number(id));

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Job offer not found.
      </div>
    );
  }

  const results = job.matchResults;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">

        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
        >
          <ArrowLeft size={16} /> Back to Jobs
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {results?.total_cvs_scanned} CV(s) scanned
          </p>
        </div>

        {!results?.match_found && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
            <h2 className="text-red-700 font-semibold text-lg mb-2">
              No Matching Candidates Found
            </h2>
            <p className="text-red-600 text-sm">{results?.explanation}</p>
          </div>
        )}

        {results?.top_candidates && results.top_candidates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Matched Candidates
            </h2>
            <div className="flex flex-col gap-4">
              {results.top_candidates.map((c, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-gray-100">
                        #{i + 1}
                      </span>
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {c.candidate_name}
                        </h3>
                        <p className="text-xs text-gray-400">{c.filename}</p>
                      </div>
                    </div>
                    <span
                      className={`flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full border ${tierColors[c.match_tier]}`}
                    >
                      {tierIcons[c.match_tier]}
                      {c.match_tier}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Final Score", value: c.final_score },
                      { label: "Semantic", value: c.embedding_score },
                      { label: "Relevance", value: c.reranker_score },
                      { label: "Skills", value: c.skill_score },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="bg-gray-50 rounded-xl p-3 text-center"
                      >
                        <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                        <p className="text-lg font-bold text-gray-800">
                          {Math.round(s.value * 100)}%
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-green-600 mb-2">
                        ✅ Matched Skills
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {c.matched_skills.map((s, j) => (
                          <span
                            key={j}
                            className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-red-500 mb-2">
                        ❌ Missing Skills
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {c.missing_skills.map((s, j) => (
                          <span
                            key={j}
                            className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded-full"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results?.near_misses && results.near_misses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Near Misses
            </h2>
            <div className="flex flex-col gap-3">
              {results.near_misses.map((nm, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800">
                      {nm.candidate_name}
                    </h3>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                      {nm.their_domain}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{nm.suggestion}</p>
                  <div className="flex flex-wrap gap-1">
                    {nm.their_skills.slice(0, 8).map((s, j) => (
                      <span
                        key={j}
                        className="bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-full"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results?.suggestions && results.suggestions.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <h2 className="text-blue-800 font-semibold mb-3">💡 Suggestions</h2>
            <ul className="flex flex-col gap-2">
              {results.suggestions.map((s, i) => (
                <li key={i} className="text-sm text-blue-700">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}