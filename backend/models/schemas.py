from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


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