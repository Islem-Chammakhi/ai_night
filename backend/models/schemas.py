from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# ──────────────────────────────────────────────────────────────────────────────
#  CV / Matching schemas
# ──────────────────────────────────────────────────────────────────────────────

class CVResponse(BaseModel):
    id: int
    job_id: int
    filename: str
    candidate_name: Optional[str]
    skills: Optional[List[str]]
    uploaded_at: datetime

    class Config:
        from_attributes = True


class MatchRequest(BaseModel):
    requirements: str
    job_id: int


class CandidateMatch(BaseModel):
    cv_id: int
    filename: str
    candidate_name: Optional[str]
    final_score: float
    embedding_score: float
    reranker_score: float
    skill_score: float
    match_tier: str
    matched_skills: List[str]
    missing_skills: List[str]


class NearMissCandidate(BaseModel):
    cv_id: int
    filename: str
    candidate_name: Optional[str]
    their_domain: str
    their_skills: List[str]
    required_skills: List[str]
    skills_they_have: List[str]
    skills_they_lack: List[str]
    suggestion: str


class MatchResponse(BaseModel):
    total_cvs_scanned: int
    top_candidates: List[CandidateMatch]
    match_found: bool
    explanation: Optional[str] = None
    near_misses: Optional[List[NearMissCandidate]] = None
    suggestions: Optional[List[str]] = None


# ──────────────────────────────────────────────────────────────────────────────
#  Smart Tender Detection schemas
# ──────────────────────────────────────────────────────────────────────────────

class TenderResult(BaseModel):
    """A single tender with its computed match scores."""
    title: str
    issuing_authority: str
    project_description: str
    required_skills: List[str]
    publication_date: str
    submission_deadline: str
    days_to_deadline: Optional[int] = None
    contract_duration_months: Optional[int] = None
    budget_currency: Optional[str] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    semantic_score: float           # 0-100 scale
    semantic_similarity: float      # raw cosine similarity (0-1)
    is_excluded: bool = False       # matched an excluded domain


class TenderDetectRequest(BaseModel):
    """Query parameters for the /tenders/detect endpoint."""
    top_k: Optional[int] = 10
    min_score: Optional[float] = 0.0
    include_excluded: Optional[bool] = False
    keyword: Optional[str] = None   # optional free-text filter on title/description


class TenderDetectResponse(BaseModel):
    """Response envelope for tender detection."""
    total_tenders: int
    returned: int
    company: str
    results: List[TenderResult]


class CompanyProfile(BaseModel):
    """Readable company profile returned by /tenders/company-profile."""
    company_name: str
    focus_domains: List[str]
    secondary_domains: List[str]
    core_skills: List[str]
    ml_skills: List[str]
    excluded_domains: List[str]
    regions: List[str]
    min_budget_eur: int
    max_budget_eur: int
    preferred_contract_duration_months: List[int]
    required_language: List[str]
    text: str


class TenderStatsResponse(BaseModel):
    """Summary statistics about the tender dataset."""
    total_tenders: int
    avg_semantic_score: float
    max_semantic_score: float
    min_semantic_score: float
    excluded_count: int
    eligible_count: int
    score_buckets: dict   # e.g. {"high": 12, "medium": 30, "low": 58}
    upcoming_deadlines: int   # tenders with deadline in next 30 days