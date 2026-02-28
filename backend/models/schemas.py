from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class CVResponse(BaseModel):
    id: int
    filename: str
    candidate_name: Optional[str]
    skills: Optional[List[str]]
    uploaded_at: datetime

    class Config:
        from_attributes = True


class MatchRequest(BaseModel):
    requirements: str


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


class MatchResponse(BaseModel):
    total_cvs_scanned: int
    top_candidates: List[CandidateMatch]