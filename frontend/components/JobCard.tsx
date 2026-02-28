"use client";
import { useRef, useState } from "react";
import { useJobs } from "@/store/jobStore";
import { useRouter } from "next/navigation";
import {
  Upload,
  Play,
  Trash2,
  FileText,
  Loader2,
  CheckCircle,
  Eye,
} from "lucide-react";
import { uploadCV, matchCVs, deleteJobData } from "@/services/api";
import { Job } from "@/types";
import toast from "react-hot-toast";

interface Props {
  job: Job;
}

export default function JobCard({ job }: Props) {
  const { updateJob, deleteJob } = useJobs();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isMatching, setIsMatching] = useState<boolean>(false);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setIsUploading(true);
    updateJob(job.id, { status: "uploading" });

    const uploaded = [...(job.uploadedCVs ?? [])];

    for (const file of files) {
      // Check duplicate on frontend before even calling API
      const alreadyUploaded = uploaded.some(
        (cv) => cv.filename === file.name
      );
      if (alreadyUploaded) {
        toast.error(`${file.name} already uploaded for this job`);
        continue;
      }

      try {
        const result = await uploadCV(file, job.id);
        uploaded.push(result);
        toast.success(`${file.name} uploaded ✓`);
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ?? `Failed to upload ${file.name}`;
        toast.error(msg);
      }
    }

    updateJob(job.id, {
      uploadedCVs: uploaded,
      status: "idle",
    });

    setIsUploading(false);

    // Reset input so same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMatch = async () => {
    if (!job.uploadedCVs?.length) {
      toast.error("Please upload CVs first");
      return;
    }

    setIsMatching(true);
    updateJob(job.id, { status: "matching" });

    try {
      const requirements = `
        ${job.description}
        ${
          job.keyPoints?.length
            ? "Key requirements: " + job.keyPoints.join(", ")
            : ""
        }
      `.trim();

      const results = await matchCVs(requirements, job.id);
      updateJob(job.id, { matchResults: results, status: "done" });
      toast.success("Matching complete!");
      router.push(`/dashboard/${job.id}`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ?? "Matching failed. Check backend.";
      toast.error(msg);
      updateJob(job.id, { status: "idle" });
    }

    setIsMatching(false);
  };

  const handleDelete = async () => {
    try {
      await deleteJobData(job.id);
    } catch {
      // No backend data yet, continue
    }
    deleteJob(job.id);
    toast.success("Job deleted");
  };

  const statusBadge = () => {
    if (job.status === "uploading")
      return (
        <span className="text-xs bg-yellow-50 text-yellow-600 border border-yellow-200 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Loader2 size={10} className="animate-spin" /> Uploading
        </span>
      );
    if (job.status === "matching")
      return (
        <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Loader2 size={10} className="animate-spin" /> Matching
        </span>
      );
    if (job.status === "done")
      return (
        <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
          <CheckCircle size={10} /> Done
        </span>
      );
    return null;
  };

  return (
    <div className="bg-white text-black rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-black text-base leading-tight">
              {job.title}
            </h3>
            {statusBadge()}
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="text-gray-300 hover:text-red-500 transition shrink-0"
          title="Delete job"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Description */}
      <p className="text-black text-sm line-clamp-3 leading-relaxed">
        {job.description}
      </p>

      {/* Key Points */}
      {job.keyPoints?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {job.keyPoints.map((kp, i) => (
            <span
              key={i}
              className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full font-medium"
            >
              {kp}
            </span>
          ))}
        </div>
      )}

      {/* CV List */}
      {job.uploadedCVs?.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
          <p className="text-xs font-semibold text-black mb-1 uppercase tracking-wide">
            Uploaded CVs ({job.uploadedCVs.length})
          </p>
          {job.uploadedCVs.map((cv) => (
            <div
              key={cv.id}
              className="flex items-center gap-2 text-xs text-black"
            >
              <FileText size={12} className="text-blue-400 shrink-0" />
              <span className="truncate">{cv.candidate_name || cv.filename}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
        {/* Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isMatching}
          className="flex-1 flex items-center justify-center gap-2 border border-gray-300 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          {isUploading ? "Uploading..." : "Upload CVs"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Match */}
        <button
          onClick={handleMatch}
          disabled={isMatching || isUploading || !job.uploadedCVs?.length}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMatching ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Play size={14} />
          )}
          {isMatching ? "Matching..." : "Start Matching"}
        </button>
      </div>

      {/* View Results */}
      {job.status === "done" && (
        <button
          onClick={() => router.push(`/dashboard/${job.id}`)}
          className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition"
        >
          <Eye size={14} />
          View Results
        </button>
      )}
    </div>
  );
}
