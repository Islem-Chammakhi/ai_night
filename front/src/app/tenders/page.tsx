"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    getTenderStats,
    detectTenders,
    getCompanyProfile,
    searchTenders,
    getAllTenders,
} from "@/services/api";
import {
    TenderResult,
    TenderStatsResponse,
    CompanyProfile,
    TenderDetectRequest,
} from "@/types";
import { toast } from "sonner";
import {
    Search,
    Zap,
    BarChart3,
    Calendar,
    DollarSign,
    Clock,
    ChevronDown,
    ChevronUp,
    Star, Loader2,
    Filter,
    X,
    Target,
    TrendingUp,
    Globe,
    Building2,
    Shield,
    ArrowUpRight,
    CheckCircle2,
    XCircle,
    SlidersHorizontal,
    Sparkles,
    Info
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
const fmtBudget = (min: number | null, max: number | null, currency: string | null) => {
    if (!min && !max) return "N/A";
    const c = currency || "EUR";
    const fmt = (n: number) =>
        n >= 1_000_000
            ? `${(n / 1_000_000).toFixed(1)}M`
            : n >= 1_000
                ? `${(n / 1_000).toFixed(0)}K`
                : `${n}`;
    if (min && max) return `${fmt(min)} – ${fmt(max)} ${c}`;
    if (min) return `${fmt(min)}+ ${c}`;
    if (max) return `Up to ${fmt(max)} ${c}`;
    return "N/A";
};

const scoreTier = (score: number) => {
    if (score >= 70) return { label: "High Match", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25", dot: "bg-emerald-400" };
    if (score >= 45) return { label: "Medium Match", cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25", dot: "bg-yellow-400" };
    return { label: "Low Match", cls: "text-neutral-400 bg-white/5 border-white/10", dot: "bg-neutral-500" };
};

const deadlineBadge = (days: number | null) => {
    if (days === null) return null;
    if (days < 0) return { label: "Expired", cls: "text-red-400 bg-red-500/10 border-red-500/20" };
    if (days <= 7) return { label: `${days}d left`, cls: "text-red-400 bg-red-500/10 border-red-500/20" };
    if (days <= 21) return { label: `${days}d left`, cls: "text-orange-400 bg-orange-500/10 border-orange-500/20" };
    return { label: `${days}d left`, cls: "text-neutral-400 bg-white/5 border-white/10" };
};

// ─────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────
const KpiCard = ({
    icon,
    label,
    value,
    sub,
    accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    accent?: string;
}) => (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 flex flex-col gap-3 hover:border-white/15 transition-all duration-300 group">
        <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">{label}</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent || "bg-primary/10"} border border-white/8 group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
        </div>
        <div>
            <p className="text-2xl font-bold text-white font-heading">{value}</p>
            {sub && <p className="text-xs text-neutral-500 mt-0.5">{sub}</p>}
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────
// Score Ring
// ─────────────────────────────────────────────────────────────────
const ScoreRing = ({ score }: { score: number }) => {
    const tier = scoreTier(score);
    const r = 20;
    const circ = 2 * Math.PI * r;
    const filled = (score / 100) * circ;

    return (
        <div className="relative flex-shrink-0 w-14 h-14">
            <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                <circle
                    cx="28" cy="28" r={r} fill="none"
                    stroke={score >= 70 ? "#34d399" : score >= 45 ? "#facc15" : "#6b7280"}
                    strokeWidth="4"
                    strokeDasharray={`${filled} ${circ - filled}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 0.8s ease" }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-bold ${tier.cls.split(" ")[0]}`}>
                    {score.toFixed(0)}
                </span>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// Tender Card (expandable)
// ─────────────────────────────────────────────────────────────────
const TenderCard = ({ tender, rank }: { tender: TenderResult; rank: number }) => {
    const [expanded, setExpanded] = useState(false);
    const tier = scoreTier(tender.semantic_score);
    const dl = deadlineBadge(tender.days_to_deadline);

    return (
        <div
            className={`rounded-2xl border ${tender.is_excluded
                ? "border-red-500/15 bg-red-500/[0.02]"
                : "border-white/8 bg-white/[0.02]"
                } hover:border-white/15 transition-all duration-300 overflow-hidden`}
        >
            {/* Header */}
            <div
                className="flex items-start gap-4 p-5 cursor-pointer select-none"
                onClick={() => setExpanded((p) => !p)}
            >
                {/* Rank */}
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-neutral-500 mt-1">
                    {rank}
                </div>

                {/* Score ring */}
                <ScoreRing score={tender.semantic_score} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="font-semibold text-sm text-white leading-snug line-clamp-2">
                                {tender.title}
                            </h3>
                            <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1.5 truncate">
                                <Building2 className="w-3 h-3 flex-shrink-0" />
                                {tender.issuing_authority}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                            {/* Excluded badge */}
                            {tender.is_excluded && (
                                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border text-red-400 bg-red-500/10 border-red-500/20">
                                    <XCircle className="w-3 h-3" />
                                    Excluded
                                </span>
                            )}
                            {/* Tier badge */}
                            <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${tier.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
                                {tier.label}
                            </span>
                            {expanded
                                ? <ChevronUp className="w-4 h-4 text-neutral-500" />
                                : <ChevronDown className="w-4 h-4 text-neutral-500" />}
                        </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                        {tender.budget_min || tender.budget_max ? (
                            <span className="flex items-center gap-1 text-xs text-neutral-400">
                                <DollarSign className="w-3 h-3 text-primary" />
                                {fmtBudget(tender.budget_min, tender.budget_max, tender.budget_currency)}
                            </span>
                        ) : null}
                        {tender.contract_duration_months && (
                            <span className="flex items-center gap-1 text-xs text-neutral-400">
                                <Clock className="w-3 h-3 text-primary" />
                                {tender.contract_duration_months}mo
                            </span>
                        )}
                        {dl && (
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${dl.cls}`}>
                                <Calendar className="w-2.5 h-2.5" />
                                {dl.label}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="border-t border-white/5 p-5 space-y-5 bg-black/15">

                    {/* Description */}
                    <div>
                        <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest mb-2">Description</p>
                        <p className="text-xs text-neutral-400 leading-relaxed">{tender.project_description}</p>
                    </div>

                    {/* Skills */}
                    {tender.required_skills.length > 0 && (
                        <div>
                            <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest mb-2">Required Skills</p>
                            <div className="flex flex-wrap gap-1.5">
                                {tender.required_skills.map((s) => (
                                    <span key={s} className="px-2.5 py-1 rounded-full text-xs bg-primary/8 text-primary border border-primary/20">
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Score + dates grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-xl bg-white/3 border border-white/6 p-3">
                            <p className="text-[9px] text-neutral-600 uppercase tracking-widest mb-1">Match Score</p>
                            <p className="text-lg font-bold text-primary">{tender.semantic_score.toFixed(1)}<span className="text-xs text-neutral-500">/100</span></p>
                        </div>
                        <div className="rounded-xl bg-white/3 border border-white/6 p-3">
                            <p className="text-[9px] text-neutral-600 uppercase tracking-widest mb-1">Published</p>
                            <p className="text-sm font-semibold text-white">{tender.publication_date}</p>
                        </div>
                        <div className="rounded-xl bg-white/3 border border-white/6 p-3">
                            <p className="text-[9px] text-neutral-600 uppercase tracking-widest mb-1">Deadline</p>
                            <p className="text-sm font-semibold text-white">{tender.submission_deadline}</p>
                        </div>
                        <div className="rounded-xl bg-white/3 border border-white/6 p-3">
                            <p className="text-[9px] text-neutral-600 uppercase tracking-widest mb-1">Budget</p>
                            <p className="text-sm font-semibold text-white">{fmtBudget(tender.budget_min, tender.budget_max, tender.budget_currency)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// Score distribution mini-bar
// ─────────────────────────────────────────────────────────────────
const ScoreBuckets = ({ buckets }: { buckets: { high: number; medium: number; low: number } }) => {
    const total = buckets.high + buckets.medium + buckets.low;
    if (!total) return null;
    const pct = (n: number) => Math.round((n / total) * 100);

    return (
        <div className="space-y-2">
            {[
                { key: "high" as const, label: "High (≥70)", color: "bg-emerald-500", textColor: "text-emerald-400" },
                { key: "medium" as const, label: "Medium (45-70)", color: "bg-yellow-500", textColor: "text-yellow-400" },
                { key: "low" as const, label: "Low (<45)", color: "bg-neutral-600", textColor: "text-neutral-400" },
            ].map(({ key, label, color, textColor }) => (
                <div key={key} className="flex items-center gap-3">
                    <span className={`text-xs ${textColor} w-28 flex-shrink-0`}>{label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                            className={`h-full rounded-full ${color} transition-all duration-700`}
                            style={{ width: `${pct(buckets[key])}%` }}
                        />
                    </div>
                    <span className="text-xs text-neutral-500 w-6 text-right">{buckets[key]}</span>
                </div>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// Company Profile Panel
// ─────────────────────────────────────────────────────────────────
const ProfilePanel = ({ profile }: { profile: CompanyProfile }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
            <button
                onClick={() => setOpen((p) => !p)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Building2 className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">{profile.company_name}</p>
                        <p className="text-xs text-neutral-500">Company Match Profile</p>
                    </div>
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
            </button>

            {open && (
                <div className="border-t border-white/5 p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest mb-2">Focus Domains</p>
                            <div className="flex flex-wrap gap-1.5">
                                {profile.focus_domains.map((d) => (
                                    <span key={d} className="px-2.5 py-1 rounded-full text-xs bg-primary/8 text-primary border border-primary/20">{d}</span>
                                ))}
                                {profile.secondary_domains.map((d) => (
                                    <span key={d} className="px-2.5 py-1 rounded-full text-xs bg-white/5 text-neutral-400 border border-white/8">{d}</span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest mb-2">Core Skills</p>
                            <div className="flex flex-wrap gap-1.5">
                                {[...profile.core_skills, ...profile.ml_skills].map((s) => (
                                    <span key={s} className="px-2 py-0.5 rounded text-xs bg-white/5 text-neutral-300 border border-white/8">{s}</span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest mb-2">Regions</p>
                            <div className="flex flex-wrap gap-1.5">
                                {profile.regions.map((r) => (
                                    <span key={r} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white/5 text-neutral-400 border border-white/8">
                                        <Globe className="w-2.5 h-2.5" /> {r}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest mb-2">Budget Range</p>
                            <p className="text-sm text-white font-semibold">
                                {fmtBudget(profile.min_budget_eur, profile.max_budget_eur, "EUR")}
                            </p>
                            <p className="text-xs text-neutral-500 mt-0.5">
                                Duration: {profile.preferred_contract_duration_months[0]}–{profile.preferred_contract_duration_months[1]} months
                            </p>
                        </div>
                    </div>

                    {/* Excluded domains */}
                    <div>
                        <p className="text-[10px] font-semibold text-red-500/70 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Excluded Domains
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {profile.excluded_domains.map((d) => (
                                <span key={d} className="px-2.5 py-1 rounded-full text-xs bg-red-500/8 text-red-400 border border-red-500/20">{d}</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// Filter Panel
// ─────────────────────────────────────────────────────────────────
interface Filters {
    minScore: number;
    topK: number;
    includeExcluded: boolean;
    keyword: string;
}

const FilterPanel = ({
    filters,
    onChange,
    onApply,
    loading,
}: {
    filters: Filters;
    onChange: (f: Filters) => void;
    onApply: () => void;
    loading: boolean;
}) => (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-5">
        <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-white">Detection Filters</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Min score */}
            <div>
                <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2">
                    Min Score: <span className="text-primary">{filters.minScore}</span>
                </label>
                <input
                    type="range" min={0} max={90} step={5}
                    value={filters.minScore}
                    onChange={(e) => onChange({ ...filters, minScore: Number(e.target.value) })}
                    className="w-full accent-primary h-1.5 rounded-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
                    <span>0</span><span>90</span>
                </div>
            </div>

            {/* Top K */}
            <div>
                <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2">
                    Results Limit: <span className="text-primary">{filters.topK}</span>
                </label>
                <input
                    type="range" min={5} max={50} step={5}
                    value={filters.topK}
                    onChange={(e) => onChange({ ...filters, topK: Number(e.target.value) })}
                    className="w-full accent-primary h-1.5 rounded-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
                    <span>5</span><span>50</span>
                </div>
            </div>
        </div>

        {/* Include excluded toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-white/6 bg-white/[0.015]">
            <div>
                <p className="text-xs font-semibold text-neutral-300">Include Excluded Domains</p>
                <p className="text-[10px] text-neutral-600 mt-0.5">Show tenders from domains like Construction, Medical Equipment</p>
            </div>
            <button
                onClick={() => onChange({ ...filters, includeExcluded: !filters.includeExcluded })}
                className={`relative w-10 h-5 rounded-full transition-all duration-300 ${filters.includeExcluded ? "bg-primary" : "bg-white/10"}`}
            >
                <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${filters.includeExcluded ? "left-5.5" : "left-0.5"}`}
                />
            </button>
        </div>

        {/* Apply button */}
        <button
            onClick={onApply}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
            {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Detecting…</>
            ) : (
                <><Sparkles className="w-4 h-4" />Run Detection</>
            )}
        </button>
    </div>
);

// ─────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────
export default function TendersPage() {
    const [stats, setStats] = useState<TenderStatsResponse | null>(null);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [tenders, setTenders] = useState<TenderResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [view, setView] = useState<"detection" | "all">("detection");
    const [totalShown, setTotalShown] = useState(0);
    const [totalInDataset, setTotalInDataset] = useState(0);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    const [filters, setFilters] = useState<Filters>({
        minScore: 0,
        topK: 20,
        includeExcluded: false,
        keyword: "",
    });

    // Load stats + profile on mount
    useEffect(() => {
        setStatsLoading(true);
        Promise.all([getTenderStats(), getCompanyProfile()])
            .then(([s, p]) => {
                setStats(s);
                setProfile(p);
            })
            .catch(() => toast.error("Could not connect to backend. Is the server running?"))
            .finally(() => setStatsLoading(false));
    }, []);

    // Run detection
    const runDetection = useCallback(async () => {
        setLoading(true);
        try {
            const req: TenderDetectRequest = {
                top_k: filters.topK,
                min_score: filters.minScore,
                include_excluded: filters.includeExcluded,
                keyword: filters.keyword || undefined,
            };
            const res = await detectTenders(req);
            setTenders(res.results);
            setTotalShown(res.returned);
            setTotalInDataset(res.total_tenders);
            setView("detection");
            toast.success(`${res.returned} tenders matched.`);
        } catch {
            toast.error("Detection failed. Is the backend running?");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Load all tenders
    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAllTenders(filters.includeExcluded);
            setTenders(res.results);
            setTotalShown(res.returned);
            setTotalInDataset(res.total_tenders);
            setView("all");
            toast.success(`Loaded all ${res.returned} tenders.`);
        } catch {
            toast.error("Could not load tenders.");
        } finally {
            setLoading(false);
        }
    }, [filters.includeExcluded]);

    // Auto-search with debounce
    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!searchQuery.trim() || searchQuery.length < 2) return;

        searchTimeout.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await searchTenders(searchQuery, filters.includeExcluded);
                setTenders(res.results);
                setTotalShown(res.returned);
                setTotalInDataset(res.total_tenders);
            } catch {
                /* silent */
            } finally {
                setSearching(false);
            }
        }, 500);

        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    const clearSearch = () => {
        setSearchQuery("");
        setTenders([]);
        setTotalShown(0);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* ── Page header ── */}
            <div className="border-b border-white/5 bg-black/30 backdrop-blur-sm sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Zap className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-white font-heading">Smart Tender Detection</h1>
                            <p className="text-xs text-neutral-500">AI-powered tender matching for {profile?.company_name || "your company"}</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="flex-1 max-w-sm">
                        <div className="relative">
                            {searching
                                ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary animate-spin" />
                                : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600" />
                            }
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search tenders…"
                                className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-primary/50 transition-all"
                            />
                            {searchQuery && (
                                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* View all tenders button */}
                    <button
                        onClick={loadAll}
                        disabled={loading}
                        className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-neutral-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-40"
                    >
                        <BarChart3 className="w-3.5 h-3.5" />
                        All Tenders
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* ── KPI cards ── */}
                {statsLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 h-28 animate-pulse" />
                        ))}
                    </div>
                ) : stats ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard
                            icon={<Target className="w-4 h-4 text-primary" />}
                            label="Total Tenders"
                            value={stats.total_tenders}
                            sub={`${stats.eligible_count} eligible`}
                            accent="bg-primary/10"
                        />
                        <KpiCard
                            icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
                            label="Avg Match Score"
                            value={`${stats.avg_semantic_score.toFixed(1)}`}
                            sub={`Max: ${stats.max_semantic_score.toFixed(1)}`}
                            accent="bg-emerald-500/10"
                        />
                        <KpiCard
                            icon={<Star className="w-4 h-4 text-yellow-400" />}
                            label="High Matches"
                            value={stats.score_buckets.high}
                            sub="Score ≥ 70"
                            accent="bg-yellow-500/10"
                        />
                        <KpiCard
                            icon={<Calendar className="w-4 h-4 text-orange-400" />}
                            label="Due Soon"
                            value={stats.upcoming_deadlines}
                            sub="Next 30 days"
                            accent="bg-orange-500/10"
                        />
                    </div>
                ) : (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 flex items-center gap-3">
                        <Info className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-red-400">Backend not reachable</p>
                            <p className="text-xs text-neutral-500 mt-0.5">Start the server: <code className="text-primary">uvicorn main:app --reload --port 8000</code> from the <code className="text-primary">backend/</code> folder</p>
                        </div>
                    </div>
                )}

                {/* ── Main layout: sidebar + results ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

                    {/* ── Left column ── */}
                    <div className="space-y-4">
                        {/* Filter panel */}
                        <FilterPanel
                            filters={filters}
                            onChange={setFilters}
                            onApply={runDetection}
                            loading={loading}
                        />

                        {/* Score distribution */}
                        {stats && (
                            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-4">
                                <p className="text-xs font-semibold text-neutral-400 flex items-center gap-2">
                                    <BarChart3 className="w-3.5 h-3.5 text-primary" />
                                    Score Distribution
                                </p>
                                <ScoreBuckets buckets={stats.score_buckets} />
                                <div className="pt-2 border-t border-white/5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-neutral-600">Excluded domains</span>
                                        <span className="text-red-400 font-semibold">{stats.excluded_count}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Company profile panel */}
                        {profile && <ProfilePanel profile={profile} />}
                    </div>

                    {/* ── Right column: results ── */}
                    <div className="space-y-4">
                        {/* Results header */}
                        {tenders.length > 0 && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-semibold text-white">
                                        {totalShown} results
                                    </span>
                                    <span className="text-xs text-neutral-600">
                                        of {totalInDataset} total
                                    </span>
                                    {view === "detection" && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary border border-primary/20 font-semibold">
                                            Smart Match
                                        </span>
                                    )}
                                    {searchQuery && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-neutral-400 border border-white/8 font-semibold">
                                            Search: "{searchQuery}"
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => { setTenders([]); setSearchQuery(""); }}
                                    className="text-xs text-neutral-600 hover:text-neutral-300 flex items-center gap-1 transition-colors"
                                >
                                    <X className="w-3 h-3" /> Clear
                                </button>
                            </div>
                        )}

                        {/* Empty state */}
                        {tenders.length === 0 && !loading && (
                            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-12 flex flex-col items-center justify-center gap-4 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-white">Ready to detect tenders</h3>
                                    <p className="text-sm text-neutral-500 mt-1 max-w-xs">
                                        Configure the filters and click <span className="text-primary font-semibold">Run Detection</span> to find the best matching tenders for {profile?.company_name || "your company"}.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={runDetection}
                                        disabled={loading}
                                        className="px-5 py-2.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-all flex items-center gap-2"
                                    >
                                        <Zap className="w-4 h-4" />
                                        Detect Now
                                    </button>
                                    <button
                                        onClick={loadAll}
                                        className="px-5 py-2.5 rounded-xl border border-white/10 text-sm text-neutral-400 hover:text-white transition-all flex items-center gap-2"
                                    >
                                        <Filter className="w-4 h-4" />
                                        Browse All
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Loading skeleton */}
                        {loading && (
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 h-32 animate-pulse" />
                                ))}
                            </div>
                        )}

                        {/* Tender list */}
                        {!loading && tenders.map((t, i) => (
                            <TenderCard key={`${t.title}-${i}`} tender={t} rank={i + 1} />
                        ))}

                        {/* Load more indicator */}
                        {!loading && tenders.length > 0 && tenders.length < totalInDataset && (
                            <div className="text-center py-4">
                                <button
                                    onClick={() => setFilters((f) => ({ ...f, topK: f.topK + 20 }))}
                                    className="text-xs text-neutral-500 hover:text-primary transition-colors flex items-center gap-1 mx-auto"
                                >
                                    <ArrowUpRight className="w-3 h-3" />
                                    Increase limit to see more
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
