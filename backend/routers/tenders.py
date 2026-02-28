"""
Smart Tender Detection Router
Endpoints for scoring and filtering public tenders against the company profile.
Data files live at: backend/data/company_data.json  and  backend/data/tenders.csv
"""

from fastapi import APIRouter, HTTPException, Query
from functools import lru_cache
from typing import Optional
import os

from models.schemas import (
    TenderDetectRequest,
    TenderDetectResponse,
    TenderResult,
    CompanyProfile,
    TenderStatsResponse,
)
from services.tender_detector import (
    load_company_profile,
    load_tenders_from_csv,
    compute_scores,
    is_excluded,
)

router = APIRouter(prefix="/tenders", tags=["Tender Detection"])

# ── Absolute paths relative to this file ──────────────────────────────────────
_HERE = os.path.dirname(os.path.abspath(__file__))
COMPANY_JSON = os.path.join(_HERE, "..", "data", "company_data.json")
DATA_CSV     = os.path.join(_HERE, "..", "data", "tenders.csv")


# ── Cached loaders (models / files load once per process) ─────────────────────

@lru_cache(maxsize=1)
def _get_profile() -> dict:
    path = os.path.abspath(COMPANY_JSON)
    if not os.path.exists(path):
        raise FileNotFoundError(f"company_data.json not found at {path}")
    return load_company_profile(path)


@lru_cache(maxsize=1)
def _get_tenders() -> list:
    path = os.path.abspath(DATA_CSV)
    if not os.path.exists(path):
        raise FileNotFoundError(f"tenders.csv not found at {path}")
    return load_tenders_from_csv(path)


@lru_cache(maxsize=1)
def _get_scored_tenders() -> list:
    """Compute and cache the fully-scored tender list (heavy — done once)."""
    profile = _get_profile()
    tenders = _get_tenders()
    return compute_scores(profile, tenders)


# ── Helper ─────────────────────────────────────────────────────────────────────

def _tender_to_result(t: dict, profile: dict) -> TenderResult:
    return TenderResult(
        title=t["title"],
        issuing_authority=t["issuing_authority"],
        project_description=t["project_description"],
        required_skills=t["required_skills_display"],
        publication_date=t["publication_date"],
        submission_deadline=t["submission_deadline"],
        days_to_deadline=t.get("days_to_deadline"),
        contract_duration_months=t.get("contract_duration_months"),
        budget_currency=t.get("budget_currency"),
        budget_min=t.get("budget_min"),
        budget_max=t.get("budget_max"),
        semantic_score=t["semantic_score"],
        semantic_similarity=t["semantic_similarity"],
        is_excluded=is_excluded(t, profile),
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/company-profile", response_model=CompanyProfile)
def get_company_profile():
    """
    Return the company profile that is used to score tenders.
    Loaded from backend/data/company_data.json.
    """
    try:
        profile = _get_profile()
        return CompanyProfile(
            company_name=profile.get("company_name", ""),
            focus_domains=profile.get("focus_domains", []),
            secondary_domains=profile.get("secondary_domains", []),
            core_skills=profile.get("core_skills", []),
            ml_skills=profile.get("ml_skills", []),
            excluded_domains=profile.get("excluded_domains", []),
            regions=profile.get("regions", []),
            min_budget_eur=profile.get("min_budget_eur", 0),
            max_budget_eur=profile.get("max_budget_eur", 0),
            preferred_contract_duration_months=profile.get(
                "preferred_contract_duration_months", [0, 0]
            ),
            required_language=profile.get("required_language", []),
            text=profile.get("text", ""),
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/detect", response_model=TenderDetectResponse)
def detect_tenders(request: TenderDetectRequest):
    """
    Score all tenders against the company profile and return the top matches.

    - **top_k**: how many results to return (default 10)
    - **min_score**: minimum semantic score (0-100) to include
    - **include_excluded**: if true, also return tenders matching excluded domains
    - **keyword**: optional keyword filter on title / description
    """
    try:
        profile  = _get_profile()
        scored   = _get_scored_tenders()
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    results = []
    for t in scored:
        excluded = is_excluded(t, profile)

        if excluded and not request.include_excluded:
            continue

        if t["semantic_score"] < (request.min_score or 0.0):
            continue

        # Optional keyword filter
        if request.keyword:
            kw = request.keyword.lower()
            if kw not in t["title"].lower() and kw not in t["project_description"].lower():
                continue

        results.append(_tender_to_result(t, profile))

    top_k   = request.top_k or 10
    returned = results[:top_k]

    return TenderDetectResponse(
        total_tenders=len(scored),
        returned=len(returned),
        company=profile.get("company_name", ""),
        results=returned,
    )


@router.get("/all", response_model=TenderDetectResponse)
def list_all_tenders(
    include_excluded: bool = Query(False, description="Include excluded-domain tenders"),
):
    """
    Return ALL tenders with their semantic scores (no top-k limit).
    Useful for table views or exploration in the frontend.
    """
    try:
        profile = _get_profile()
        scored  = _get_scored_tenders()
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    results = []
    for t in scored:
        excluded = is_excluded(t, profile)
        if excluded and not include_excluded:
            continue
        results.append(_tender_to_result(t, profile))

    return TenderDetectResponse(
        total_tenders=len(scored),
        returned=len(results),
        company=profile.get("company_name", ""),
        results=results,
    )


@router.get("/top", response_model=TenderDetectResponse)
def top_tenders(
    k: int = Query(10, ge=1, le=100, description="Number of top tenders to return"),
    min_score: float = Query(0.0, ge=0.0, le=100.0, description="Minimum semantic score"),
):
    """
    Quick GET version of /detect — returns top-k eligible tenders above min_score.
    Perfect for dashboard widgets.
    """
    try:
        profile = _get_profile()
        scored  = _get_scored_tenders()
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    eligible = [
        t for t in scored
        if not is_excluded(t, profile) and t["semantic_score"] >= min_score
    ]

    results = [_tender_to_result(t, profile) for t in eligible[:k]]

    return TenderDetectResponse(
        total_tenders=len(scored),
        returned=len(results),
        company=profile.get("company_name", ""),
        results=results,
    )


@router.get("/stats", response_model=TenderStatsResponse)
def tender_stats():
    """
    Return summary statistics about the full tender dataset and matching scores.
    Useful for dashboard charts and KPIs.
    """
    try:
        profile = _get_profile()
        scored  = _get_scored_tenders()
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not scored:
        raise HTTPException(status_code=404, detail="No tenders found in dataset.")

    scores           = [t["semantic_score"] for t in scored]
    excluded_list    = [t for t in scored if is_excluded(t, profile)]
    eligible_list    = [t for t in scored if not is_excluded(t, profile)]

    # Count tenders expiring in next 30 days
    upcoming = sum(
        1 for t in scored
        if isinstance(t.get("days_to_deadline"), int) and 0 <= t["days_to_deadline"] <= 30
    )

    # Score buckets: high ≥ 70, medium 40–69, low < 40
    buckets = {
        "high":   sum(1 for s in scores if s >= 70),
        "medium": sum(1 for s in scores if 40 <= s < 70),
        "low":    sum(1 for s in scores if s < 40),
    }

    return TenderStatsResponse(
        total_tenders=len(scored),
        avg_semantic_score=round(sum(scores) / len(scores), 2),
        max_semantic_score=max(scores),
        min_semantic_score=min(scores),
        excluded_count=len(excluded_list),
        eligible_count=len(eligible_list),
        score_buckets=buckets,
        upcoming_deadlines=upcoming,
    )


@router.get("/search", response_model=TenderDetectResponse)
def search_tenders(
    q: str = Query(..., min_length=2, description="Keyword to search in title and description"),
    include_excluded: bool = Query(False),
):
    """
    Free-text search across tender titles and project descriptions.
    Returns all matching tenders ordered by semantic score desc.
    """
    try:
        profile = _get_profile()
        scored  = _get_scored_tenders()
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    kw = q.lower()
    results = []
    for t in scored:
        excluded = is_excluded(t, profile)
        if excluded and not include_excluded:
            continue
        if kw in t["title"].lower() or kw in t["project_description"].lower():
            results.append(_tender_to_result(t, profile))

    return TenderDetectResponse(
        total_tenders=len(scored),
        returned=len(results),
        company=profile.get("company_name", ""),
        results=results,
    )
