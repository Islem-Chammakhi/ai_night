"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useJobs } from "@/context/JobContext";
import {
    uploadCV,
    getCVsByJob,
    matchCVs,
    deleteSingleCV,
    deleteJobCVs,
    deleteJobData,
} from "@/services/api";
import { Job, CandidateMatch, NearMissCandidate, UploadedCV } from "@/types";
import { toast } from "sonner";
import {
    Plus,
    Trash2,
    Upload,
    Zap,
    FileText,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Loader2,
    X,
    Star,
    TrendingUp,
    Brain,
    Users,
    BarChart3,
    Lightbulb,
    ArrowRight,
    RefreshCw,
    Pencil,
    Eye,
    EyeOff,
    Wifi,
    WifiOff,
    ShieldCheck,
} from "lucide-react";

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
const apiErr = (err: unknown) => {
    const e = err as { response?: { data?: { detail?: string } } };
    return e?.response?.data?.detail ?? "An unexpected error occurred.";
};

// ─────────────────────────────────────────
// Tier badge
// ─────────────────────────────────────────
const TierBadge = ({ tier }: { tier: CandidateMatch["match_tier"] }) => {
    const cfg = {
        "Strong Match": {
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
            cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        },
        "Partial Match": {
            icon: <AlertCircle className="w-3.5 h-3.5" />,
            cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
        },
        "Weak Match": {
            icon: <XCircle className="w-3.5 h-3.5" />,
            cls: "bg-red-500/15 text-red-400 border-red-500/30",
        },
    }[tier];

    return (
        <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}
        >
            {cfg.icon}
            {tier}
        </span>
    );
};

// ─────────────────────────────────────────
// Score bar
// ─────────────────────────────────────────
const ScoreBar = ({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: string;
}) => (
    <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-neutral-400">
            <span>{label}</span>
            <span className="font-mono font-semibold">{(value * 100).toFixed(1)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
                className={`h-full rounded-full ${color} transition-all duration-700`}
                style={{ width: `${Math.min(value * 100, 100)}%` }}
            />
        </div>
    </div>
);

// ─────────────────────────────────────────
// Candidate card (expandable)
// ─────────────────────────────────────────
const CandidateCard = ({
    candidate,
    rank,
}: {
    candidate: CandidateMatch;
    rank: number;
}) => {
    const [expanded, setExpanded] = useState(false);

    const tierGlow =
        candidate.match_tier === "Strong Match"
            ? "hover:border-emerald-500/30"
            : candidate.match_tier === "Partial Match"
                ? "hover:border-yellow-500/30"
                : "hover:border-red-500/20";

    return (
        <div
            className={`rounded-xl border border-white/8 bg-white/[0.02] ${tierGlow} transition-all duration-300 overflow-hidden`}
        >
            {/* Header row */}
            <div
                className="flex items-center justify-between p-4 cursor-pointer select-none"
                onClick={() => setExpanded((p) => !p)}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20">
                        #{rank}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm text-white truncate">
                            {candidate.candidate_name || candidate.filename}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">{candidate.filename}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <div className="text-right">
                        <p className="text-lg font-bold text-primary leading-none">
                            {(candidate.final_score * 100).toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-neutral-600 mt-0.5">final score</p>
                    </div>
                    <TierBadge tier={candidate.match_tier} />
                    <div className="text-neutral-500 ml-1">
                        {expanded ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="border-t border-white/5 p-4 space-y-5 bg-black/15">
                    {/* Score bars */}
                    <div>
                        <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest mb-3">
                            Score Breakdown
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ScoreBar label="Embedding" value={candidate.embedding_score} color="bg-blue-400" />
                            <ScoreBar label="Reranker" value={candidate.reranker_score} color="bg-violet-400" />
                            <ScoreBar label="Skills" value={candidate.skill_score} color="bg-primary" />
                        </div>
                    </div>

                    {/* Skills grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {candidate.matched_skills.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Matched skills ({candidate.matched_skills.length})
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {candidate.matched_skills.map((s) => (
                                        <span
                                            key={s}
                                            className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        >
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {candidate.missing_skills.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5">
                                    <XCircle className="w-3.5 h-3.5" />
                                    Missing skills ({candidate.missing_skills.length})
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {candidate.missing_skills.map((s) => (
                                        <span
                                            key={s}
                                            className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20"
                                        >
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────
// Near-miss card
// ─────────────────────────────────────────
const NearMissCard = ({ nm }: { nm: NearMissCandidate }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="rounded-xl border border-orange-500/15 bg-orange-500/[0.04] overflow-hidden hover:border-orange-500/30 transition-all">
            <div
                className="flex items-center justify-between p-3 cursor-pointer select-none"
                onClick={() => setExpanded((p) => !p)}
            >
                <div className="min-w-0">
                    <p className="font-semibold text-sm text-white truncate">
                        {nm.candidate_name || nm.filename}
                    </p>
                    <p className="text-xs text-orange-400 truncate">{nm.their_domain}</p>
                </div>
                <div className="text-neutral-500 flex-shrink-0 ml-3">
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </div>
            {expanded && (
                <div className="border-t border-orange-500/10 p-4 space-y-3 bg-black/10">
                    <p className="text-xs text-neutral-400 leading-relaxed">{nm.suggestion}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {nm.skills_they_have.length > 0 && (
                            <div>
                                <p className="text-xs text-emerald-400 font-semibold mb-1.5">They have</p>
                                <div className="flex flex-wrap gap-1">
                                    {nm.skills_they_have.map((s) => (
                                        <span key={s} className="px-1.5 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {nm.skills_they_lack.length > 0 && (
                            <div>
                                <p className="text-xs text-red-400 font-semibold mb-1.5">They lack</p>
                                <div className="flex flex-wrap gap-1">
                                    {nm.skills_they_lack.map((s) => (
                                        <span key={s} className="px-1.5 py-0.5 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/15">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────
// Add-Job Modal
// ─────────────────────────────────────────
const AddJobModal = ({
    onClose,
    onAdd,
}: {
    onClose: () => void;
    onAdd: (title: string, description: string, requirements: string) => void;
}) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [requirements, setRequirements] = useState("");
    const titleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        titleRef.current?.focus();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { toast.error("Job title is required."); return; }
        if (!requirements.trim()) { toast.error("Requirements text is required."); return; }
        onAdd(title.trim(), description.trim(), requirements.trim());
        onClose();
        toast.success(`Job "${title.trim()}" created.`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/8 bg-[#111] z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Plus className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">New Job</h2>
                            <p className="text-xs text-neutral-500">Define tender requirements for CV matching</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                            Job Title <span className="text-red-400">*</span>
                        </label>
                        <input
                            ref={titleRef}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Senior DevOps Engineer"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                            Short Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            placeholder="Brief context about this position or tender..."
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all resize-none"
                        />
                    </div>

                    {/* Requirements */}
                    <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                            Tender / Job Requirements <span className="text-red-400">*</span>
                        </label>
                        <p className="text-xs text-neutral-600 mb-2">
                            Paste the full requirements text. The AI will use this to match and score CVs.
                        </p>
                        <textarea
                            value={requirements}
                            onChange={(e) => setRequirements(e.target.value)}
                            rows={7}
                            placeholder="We are looking for a candidate with 5+ years of experience in cloud infrastructure. Required skills: Kubernetes, Terraform, AWS, CI/CD pipelines, Python scripting..."
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all resize-none font-mono leading-relaxed"
                        />
                        {requirements.trim().length > 0 && (
                            <p className="text-xs text-neutral-600 mt-1 text-right">
                                {requirements.trim().length} chars
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-white/10 text-sm text-neutral-400 hover:text-white hover:border-white/20 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-all"
                        >
                            Create Job
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────
// Requirements editor (inline)
// ─────────────────────────────────────────
const RequirementsEditor = ({
    requirements,
    onSave,
}: {
    requirements: string;
    onSave: (v: string) => void;
}) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(requirements);
    const [showFull, setShowFull] = useState(false);

    if (!editing) {
        return (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest">
                        Requirements
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFull((p) => !p)}
                            className="text-neutral-600 hover:text-neutral-300 transition-colors"
                            title={showFull ? "Collapse" : "Expand"}
                        >
                            {showFull ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                            onClick={() => { setDraft(requirements); setEditing(true); }}
                            className="text-neutral-600 hover:text-primary transition-colors"
                            title="Edit requirements"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
                <p className={`text-xs text-neutral-400 leading-relaxed ${showFull ? "" : "line-clamp-3"}`}>
                    {requirements || <span className="text-neutral-600 italic">No requirements set.</span>}
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-widest mb-2">
                Editing Requirements
            </p>
            <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
                autoFocus
                className="w-full bg-transparent text-xs text-neutral-300 leading-relaxed focus:outline-none resize-none placeholder-neutral-600"
                placeholder="Enter requirements..."
            />
            <div className="flex gap-2 mt-3">
                <button
                    onClick={() => setEditing(false)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-neutral-400 hover:text-white transition-all"
                >
                    Cancel
                </button>
                <button
                    onClick={() => { onSave(draft.trim()); setEditing(false); toast.success("Requirements updated."); }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-primary text-black font-semibold hover:bg-primary/90 transition-all"
                >
                    Save
                </button>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────
// Confirm Dialog
// ─────────────────────────────────────────
const ConfirmDialog = ({
    message,
    onConfirm,
    onCancel,
    danger = false,
}: {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    danger?: boolean;
}) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <p className="text-sm text-neutral-300 leading-relaxed mb-5">{message}</p>
            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-neutral-400 hover:text-white transition-all"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${danger ? "bg-red-500 hover:bg-red-600 text-white" : "bg-primary hover:bg-primary/90 text-black"}`}
                >
                    Confirm
                </button>
            </div>
        </div>
    </div>
);

// ─────────────────────────────────────────
// Job Panel
// ─────────────────────────────────────────
const JobPanel = ({ job }: { job: Job }) => {
    const { updateJob, deleteJob } = useJobs();
    const [isDragging, setIsDragging] = useState(false);
    const [activeTab, setActiveTab] = useState<"cvs" | "results">("cvs");
    const [confirmClear, setConfirmClear] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Sync CVs from backend on first mount (GET /cvs/job/{id})
    useEffect(() => {
        if (job.uploadedCVs.length > 0) return; // already have data
        setSyncing(true);
        getCVsByJob(job.id)
            .then((cvs) => {
                if (cvs.length > 0) updateJob(job.id, { uploadedCVs: cvs });
            })
            .catch(() => { }) // silent — job may just be brand new
            .finally(() => setSyncing(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [job.id]);

    // ── Refresh CVs from backend (GET /cvs/job/{id})
    const handleRefreshCVs = async () => {
        setSyncing(true);
        try {
            const cvs = await getCVsByJob(job.id);
            updateJob(job.id, { uploadedCVs: cvs });
            toast.success(`Synced ${cvs.length} CV(s) from backend.`);
        } catch {
            toast.error("Could not fetch CVs from server.");
        } finally {
            setSyncing(false);
        }
    };

    // ── Upload CVs (POST /cvs/upload) — stale-closure-safe
    const handleFiles = useCallback(
        async (files: FileList | File[]) => {
            const pdfFiles = Array.from(files).filter((f) =>
                f.name.toLowerCase().endsWith(".pdf")
            );
            if (pdfFiles.length === 0) {
                toast.error("Only PDF files are accepted.");
                return;
            }

            updateJob(job.id, { status: "uploading" });

            const uploaded: UploadedCV[] = [];
            const errors: string[] = [];

            for (const file of pdfFiles) {
                try {
                    const cv = await uploadCV(file, job.id);
                    uploaded.push(cv);
                    toast.success(`✓ ${cv.candidate_name || cv.filename}`);
                } catch (err) {
                    errors.push(apiErr(err) || file.name);
                }
            }

            // Merge with current list (avoid stale closure by reading fresh from backend)
            const fresh = await getCVsByJob(job.id).catch(() => null);
            updateJob(job.id, {
                uploadedCVs: fresh ?? [...job.uploadedCVs, ...uploaded],
                status: "idle",
                // Reset match results whenever new CVs are added
                matchResults: uploaded.length > 0 ? null : job.matchResults,
            });

            if (errors.length > 0) {
                errors.forEach((e) => toast.error(e));
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [job.id, job.uploadedCVs, job.matchResults]
    );

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    // ── Delete single CV (DELETE /cvs/{cv_id})
    const handleDeleteCV = async (cvId: number, cvName: string) => {
        try {
            await deleteSingleCV(cvId);
            // Read fresh list from backend after delete
            const fresh = await getCVsByJob(job.id).catch(() => null);
            updateJob(job.id, {
                uploadedCVs: fresh ?? job.uploadedCVs.filter((cv) => cv.id !== cvId),
                matchResults: null,
                status: "idle",
            });
            toast.success(`Removed: ${cvName}`);
        } catch (err) {
            toast.error(apiErr(err));
        }
    };

    // ── Clear all CVs for this job (DELETE /cvs/job/{id})
    const handleClearAllCVs = async () => {
        setConfirmClear(false);
        try {
            await deleteJobCVs(job.id);
            updateJob(job.id, { uploadedCVs: [], matchResults: null, status: "idle" });
            toast.success("All CVs cleared.");
        } catch (err) {
            toast.error(apiErr(err));
        }
    };

    // ── Run matching (POST /match/)
    const handleMatch = async () => {
        if (job.uploadedCVs.length === 0) {
            toast.error("Upload at least one CV first.");
            return;
        }
        if (!job.requirements.trim()) {
            toast.error("Requirements text is empty. Please edit the requirements first.");
            return;
        }
        updateJob(job.id, { status: "matching" });
        try {
            const results = await matchCVs(job.requirements, job.id);
            updateJob(job.id, { matchResults: results, status: "done" });
            setActiveTab("results");
            if (results.match_found) {
                toast.success(`${results.top_candidates.length} match(es) found!`);
            } else {
                toast.info("No strong matches — see near misses and suggestions.");
            }
        } catch (err) {
            toast.error(apiErr(err));
            updateJob(job.id, { status: "idle" });
        }
    };

    // ── Delete entire job (DELETE /jobs/{id})
    const handleDeleteJob = async () => {
        setConfirmDelete(false);
        try {
            await deleteJobData(job.id); // cleans CVs + FAISS index via backend
        } catch {
            // job may be brand-new with no backend data yet
        }
        deleteJob(job.id);
        toast.success(`Job "${job.title}" deleted.`);
    };

    const results = job.matchResults;
    const isLoading = job.status === "uploading" || job.status === "matching";
    const strongCount = results?.top_candidates.filter((c) => c.match_tier === "Strong Match").length ?? 0;

    return (
        <>
            {confirmClear && (
                <ConfirmDialog
                    message={`Remove all ${job.uploadedCVs.length} CV(s) for "${job.title}"? This also clears the AI index for this job.`}
                    onConfirm={handleClearAllCVs}
                    onCancel={() => setConfirmClear(false)}
                    danger
                />
            )}
            {confirmDelete && (
                <ConfirmDialog
                    message={`Delete job "${job.title}" and all associated CVs permanently?`}
                    onConfirm={handleDeleteJob}
                    onCancel={() => setConfirmDelete(false)}
                    danger
                />
            )}

            <div className="rounded-2xl border border-white/8 bg-[#0d0d0d] overflow-hidden flex flex-col">
                {/* ── Job Header ── */}
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-white text-sm truncate">{job.title}</h3>
                            {job.description && (
                                <p className="text-xs text-neutral-500 mt-0.5 truncate">{job.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs bg-white/5 text-neutral-400 border border-white/8">
                            <span className="text-white font-semibold mr-0.5">{job.uploadedCVs.length}</span>
                            {" "}CV{job.uploadedCVs.length !== 1 ? "s" : ""}
                        </span>
                        {results && (
                            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 font-semibold">
                                {results.top_candidates.length} match{results.top_candidates.length !== 1 ? "es" : ""}
                            </span>
                        )}
                        {/* Refresh CVs from backend */}
                        <button
                            onClick={handleRefreshCVs}
                            disabled={isLoading || syncing}
                            title="Refresh CVs from backend"
                            className="p-2 rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-white/5 transition-all disabled:opacity-30"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                        </button>
                        <button
                            onClick={() => setConfirmDelete(true)}
                            disabled={isLoading}
                            title="Delete job"
                            className="p-2 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="flex border-b border-white/5">
                    {(["cvs", "results"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-all ${activeTab === tab
                                ? "text-primary border-b-2 border-primary"
                                : "text-neutral-500 hover:text-neutral-300"
                                }`}
                        >
                            {tab === "cvs"
                                ? `CVs (${job.uploadedCVs.length})`
                                : results
                                    ? `Results (${results.top_candidates.length})`
                                    : "Results"}
                        </button>
                    ))}
                </div>

                <div className="p-5 flex-1 overflow-y-auto max-h-[680px]">
                    {/* ══ CVs tab ══ */}
                    {activeTab === "cvs" && (
                        <div className="space-y-4">
                            {/* Drop zone */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => !isLoading && fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${isDragging
                                    ? "border-primary bg-primary/10 scale-[1.01]"
                                    : isLoading
                                        ? "border-white/5 cursor-not-allowed opacity-50"
                                        : "border-white/10 hover:border-primary/40 hover:bg-white/[0.02]"
                                    }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                                />
                                {job.status === "uploading" ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                        <p className="text-sm text-neutral-400">Processing CVs…</p>
                                        <p className="text-xs text-neutral-600">Extracting text & skills</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload className="w-8 h-8 text-neutral-600" />
                                        <p className="text-sm text-neutral-400">
                                            Drop PDF files here or{" "}
                                            <span className="text-primary font-semibold">click to browse</span>
                                        </p>
                                        <p className="text-xs text-neutral-600">Multiple PDFs supported</p>
                                    </div>
                                )}
                            </div>

                            {/* CV list */}
                            {syncing && job.uploadedCVs.length === 0 && (
                                <div className="flex items-center justify-center gap-2 py-4 text-neutral-600 text-xs">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing from backend…
                                </div>
                            )}

                            {job.uploadedCVs.length > 0 && (
                                <div className="space-y-2">
                                    {/* List header */}
                                    <div className="flex items-center justify-between px-1">
                                        <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest">
                                            {job.uploadedCVs.length} candidate{job.uploadedCVs.length !== 1 ? "s" : ""} indexed
                                        </p>
                                        <button
                                            onClick={() => setConfirmClear(true)}
                                            disabled={isLoading}
                                            className="text-xs text-neutral-600 hover:text-red-400 transition-colors flex items-center gap-1 disabled:opacity-30"
                                        >
                                            <Trash2 className="w-3 h-3" /> Clear all
                                        </button>
                                    </div>

                                    {job.uploadedCVs.map((cv) => (
                                        <div
                                            key={cv.id}
                                            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                                                    <FileText className="w-4 h-4 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">
                                                        {cv.candidate_name || cv.filename}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-xs text-neutral-500 truncate">{cv.filename}</p>
                                                        {cv.skills?.length > 0 && (
                                                            <span className="text-xs text-neutral-600 flex-shrink-0">
                                                                · {cv.skills.length} skills
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteCV(cv.id, cv.candidate_name || cv.filename)}
                                                className="flex-shrink-0 p-1.5 rounded-lg text-neutral-700 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Requirements editor */}
                            <RequirementsEditor
                                requirements={job.requirements}
                                onSave={(v) => updateJob(job.id, { requirements: v, matchResults: null })}
                            />

                            {/* Match CTA */}
                            <button
                                onClick={handleMatch}
                                disabled={isLoading || job.uploadedCVs.length === 0}
                                className="w-full py-3.5 rounded-xl bg-primary text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {job.status === "matching" ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Running AI Matching…
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4" />
                                        Run CV Matching
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* ══ Results tab ══ */}
                    {activeTab === "results" && (
                        <div className="space-y-5">
                            {/* Matching in progress */}
                            {job.status === "matching" && (
                                <div className="flex flex-col items-center gap-3 py-10">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-2 border-primary/20 flex items-center justify-center">
                                            <Brain className="w-8 h-8 text-primary" />
                                        </div>
                                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                                    </div>
                                    <p className="text-sm text-neutral-300 font-semibold">AI is ranking candidates…</p>
                                    <p className="text-xs text-neutral-600">Embedding → Reranking → Skill scoring</p>
                                </div>
                            )}

                            {/* No results yet */}
                            {!results && job.status !== "matching" && (
                                <div className="text-center py-12">
                                    <Brain className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                                    <p className="text-sm text-neutral-500">No match results yet.</p>
                                    <p className="text-xs text-neutral-600 mt-1 mb-4">
                                        Upload CVs and click "Run CV Matching" to see results.
                                    </p>
                                    <button
                                        onClick={() => setActiveTab("cvs")}
                                        className="text-xs px-4 py-2 rounded-lg border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 transition-all"
                                    >
                                        Go to CVs
                                    </button>
                                </div>
                            )}

                            {/* Results */}
                            {results && !isLoading && (
                                <>
                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { value: results.total_cvs_scanned, label: "CVs scanned", color: "text-white" },
                                            { value: results.top_candidates.length, label: "Matches", color: "text-primary" },
                                            { value: results.near_misses?.length ?? 0, label: "Near misses", color: "text-orange-400" },
                                        ].map((stat, i) => (
                                            <div key={i} className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-center">
                                                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                                <p className="text-[10px] text-neutral-500 mt-0.5">{stat.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Strong match highlight */}
                                    {strongCount > 0 && (
                                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center gap-3">
                                            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                            <p className="text-sm text-emerald-300 font-semibold">
                                                {strongCount} strong match{strongCount > 1 ? "es" : ""} found — ready to shortlist!
                                            </p>
                                        </div>
                                    )}

                                    {/* No-match explanation */}
                                    {results.explanation && (
                                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                                            <p className="text-xs text-red-300 leading-relaxed">{results.explanation}</p>
                                        </div>
                                    )}

                                    {/* Top candidates */}
                                    {results.top_candidates.length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                <Star className="w-3.5 h-3.5 text-primary" />
                                                Top Candidates
                                            </h4>
                                            <div className="space-y-3">
                                                {results.top_candidates.map((c, i) => (
                                                    <CandidateCard key={c.cv_id} candidate={c} rank={i + 1} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Near misses */}
                                    {results.near_misses && results.near_misses.length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                                                Near Misses — candidates close to qualifying
                                            </h4>
                                            <div className="space-y-2">
                                                {results.near_misses.map((nm) => (
                                                    <NearMissCard key={nm.cv_id} nm={nm} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Suggestions */}
                                    {results.suggestions && results.suggestions.length > 0 && (
                                        <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.04] p-4">
                                            <h4 className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                <Lightbulb className="w-3.5 h-3.5" />
                                                AI Suggestions
                                            </h4>
                                            <ul className="space-y-2.5">
                                                {results.suggestions.map((s, i) => (
                                                    <li key={i} className="text-xs text-neutral-300 flex items-start gap-2 leading-relaxed">
                                                        <ArrowRight className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                                        {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Re-run */}
                                    <button
                                        onClick={handleMatch}
                                        disabled={isLoading}
                                        className="w-full py-2.5 rounded-xl border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/5 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Re-run Matching
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

// ─────────────────────────────────────────
// Backend health indicator
// ─────────────────────────────────────────
const BackendStatus = () => {
    const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

    useEffect(() => {
        fetch("http://localhost:8000/health")
            .then((r) => setStatus(r.ok ? "online" : "offline"))
            .catch(() => setStatus("offline"));
    }, []);

    if (status === "checking") return null;

    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status === "online"
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}>
            {status === "online"
                ? <><Wifi className="w-3 h-3" /> Backend Online</>
                : <><WifiOff className="w-3 h-3" /> Backend Offline</>
            }
        </div>
    );
};

// ─────────────────────────────────────────
// Dashboard Page
// ─────────────────────────────────────────
export default function DashboardPage() {
    const { jobs, addJob } = useJobs();
    const [showAddModal, setShowAddModal] = useState(false);

    const totalCVs = jobs.reduce((s, j) => s + j.uploadedCVs.length, 0);
    const totalMatches = jobs.reduce(
        (s, j) => s + (j.matchResults?.top_candidates.length ?? 0),
        0
    );
    const analyzedJobs = jobs.filter((j) => j.status === "done").length;
    const strongMatches = jobs.reduce(
        (s, j) =>
            s + (j.matchResults?.top_candidates.filter((c) => c.match_tier === "Strong Match").length ?? 0),
        0
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* Ambient gradient */}
            <div className="fixed top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none" />
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            {/* ── Header ── */}
            <div className="border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl sticky top-0 z-40">
                <div className="max-w-screen-xl mx-auto px-4 lg:px-10 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white leading-none">CV Matcher</h1>
                            <p className="text-[10px] text-neutral-500 mt-0.5">CV-to-Requirement Matching</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <BackendStatus />
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-black text-sm font-bold hover:bg-primary/90 active:scale-[0.97] transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:block">Add Job</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-screen-xl mx-auto px-4 lg:px-10 py-8">
                {/* ── Global Stats ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        {
                            icon: <FileText className="w-5 h-5 text-primary" />,
                            value: jobs.length,
                            label: "Active Jobs",
                            sub: "in pipeline",
                            color: "border-primary/20 bg-primary/[0.04]",
                        },
                        {
                            icon: <Users className="w-5 h-5 text-blue-400" />,
                            value: totalCVs,
                            label: "CVs Uploaded",
                            sub: "indexed & analyzed",
                            color: "border-blue-500/20 bg-blue-500/[0.04]",
                        },
                        {
                            icon: <Star className="w-5 h-5 text-emerald-400" />,
                            value: totalMatches,
                            label: "Total Matches",
                            sub: `${strongMatches} strong`,
                            color: "border-emerald-500/20 bg-emerald-500/[0.04]",
                        },
                        {
                            icon: <Brain className="w-5 h-5 text-violet-400" />,
                            value: analyzedJobs,
                            label: "Jobs Analyzed",
                            sub: `of ${jobs.length} total`,
                            color: "border-violet-500/20 bg-violet-500/[0.04]",
                        },
                    ].map((stat, i) => (
                        <div key={i} className={`rounded-2xl border p-4 flex items-center gap-4 ${stat.color}`}>
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white leading-none">{stat.value}</p>
                                <p className="text-xs text-neutral-400 mt-0.5">{stat.label}</p>
                                <p className="text-[10px] text-neutral-600">{stat.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Jobs grid ── */}
                {jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-28 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-white/[0.02] border border-white/8 flex items-center justify-center mb-5">
                            <Zap className="w-10 h-10 text-neutral-700" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">No jobs yet</h2>
                        <p className="text-neutral-500 text-sm max-w-sm mb-2 leading-relaxed">
                            Create a job with your tender requirements, upload candidate CVs, then let the AI
                            rank the best matches instantly.
                        </p>
                        <p className="text-neutral-700 text-xs mb-6">
                            3-judge pipeline: Embedding → Reranker → Skill Scoring
                        </p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Create Your First Job
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {jobs.map((job) => (
                            <JobPanel key={job.id} job={job} />
                        ))}
                    </div>
                )}
            </div>

            {/* Add Job Modal */}
            {showAddModal && (
                <AddJobModal
                    onClose={() => setShowAddModal(false)}
                    onAdd={(title, description, requirements) =>
                        addJob({ title, description, requirements })
                    }
                />
            )}
        </div>
    );
}
