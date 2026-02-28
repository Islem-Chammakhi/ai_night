"use client";
import { useState, KeyboardEvent } from "react";
import { useJobs } from "@/store/jobStore";
import { X, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Props {
  onClose: () => void;
}

export default function CreateJobModal({ onClose }: Props) {
  const { addJob } = useJobs();
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [keyPoint, setKeyPoint] = useState<string>("");
  const [keyPoints, setKeyPoints] = useState<string[]>([]);

  const addKeyPoint = () => {
    if (keyPoint.trim()) {
      setKeyPoints([...keyPoints, keyPoint.trim()]);
      setKeyPoint("");
    }
  };

  const removeKeyPoint = (index: number) => {
    setKeyPoints(keyPoints.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") addKeyPoint();
  };

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    addJob({ title, description, keyPoints });
    toast.success("Job offer created!");
    onClose();
  };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">New Job Offer</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Job Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Backend Developer"
            />
          </div>

          {/* Job Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Job Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the full job description here (from LinkedIn, etc.)..."
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Key Requirements */}
          <div className="space-y-2">
            <Label>Key Requirements</Label>
            <div className="flex gap-2">
              <Input
                value={keyPoint}
                onChange={(e) => setKeyPoint(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Docker, 3+ years experience..."
                className="flex-1"
              />
              <Button onClick={addKeyPoint} size="icon" variant="secondary" >
                <Plus size={16} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2.5">
              {keyPoints.map((kp, i) => (
                <Badge key={i} variant="secondary" className="gap-1 px-3 py-1">
                  {kp}
                  <button 
                    onClick={() => removeKeyPoint(i)}
                    className="hover:text-destructive transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <Button onClick={handleSubmit}>
            Create Job Offer
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}