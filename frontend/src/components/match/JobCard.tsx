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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1">
          <Loader2 size={10} className="animate-spin" /> Uploading
        </Badge>
      );
    if (job.status === "matching")
      return (
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1">
          <Loader2 size={10} className="animate-spin" /> Matching
        </Badge>
      );
    if (job.status === "done")
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
          <CheckCircle size={10} /> Done
        </Badge>
      );
    return null;
  };

  return (
    <Card className="bg-card/50 h-full flex flex-col hover:shadow-lg transition-shadow px-3 py-8">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg leading-tight">
                {job.title}
              </h3>
              {statusBadge()}
            </div>
          </div>
          <Button
            onClick={handleDelete}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            title="Delete job"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        {/* Description */}
        <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
          {job.description}
        </p>

        {/* Key Points */}
        {job.keyPoints?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.keyPoints.map((kp, i) => (
              <Badge key={i} variant="secondary" className="font-normal">
                {kp}
              </Badge>
            ))}
          </div>
        )}

        {/* CV List */}
        {job.uploadedCVs?.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Uploaded CVs ({job.uploadedCVs.length})
            </p>
            {job.uploadedCVs.map((cv) => (
              <div
                key={cv.id}
                className="flex items-center gap-2 text-xs text-foreground/80"
              >
                <FileText size={12} className="text-primary shrink-0" />
                <span className="truncate">
                  {cv.candidate_name || cv.filename}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col gap-3">
        {/* Action Buttons */}
        <div className="flex gap-2 w-full">
          {/* Upload */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isMatching}
            variant="outline"
            className="flex-1 gap-2"
            size="md"
          >
            {isUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {isUploading ? "Uploading..." : "Upload CVs"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Match */}
          <Button
            onClick={handleMatch}
            disabled={isMatching || isUploading || !job.uploadedCVs?.length}
            className="flex-1 gap-2"
            size="md"
          >
            {isMatching ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            {isMatching ? "Matching..." : "Start Matching"}
          </Button>
        </div>

        {/* View Results */}
        {job.status === "done" && (
          <Button
            onClick={() => router.push(`/candidates/${job.id}`)}
            variant="ghost"
            className="w-full gap-2 text-primary hover:text-primary/80"
            size="md"
          >
            <Eye size={14} />
            View Results
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}