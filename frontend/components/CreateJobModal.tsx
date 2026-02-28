"use client";
import { useState, KeyboardEvent } from "react";
import { useJobs } from "@/store/jobStore";
import { X, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">New Job Offer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior Backend Developer"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Paste the full job description here (from LinkedIn, etc.)..."
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Key Requirements
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={keyPoint}
              onChange={(e) => setKeyPoint(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Docker, 3+ years experience..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addKeyPoint}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {keyPoints.map((kp, i) => (
              <span
                key={i}
                className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full"
              >
                {kp}
                <button onClick={() => removeKeyPoint(i)}>
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Job Offer
          </button>
        </div>
      </div>
    </div>
  );
}