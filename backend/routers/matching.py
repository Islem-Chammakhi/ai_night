from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from database import get_db, CV
from models.schemas import MatchRequest, MatchResponse, CandidateMatch
from services.embedder import search_similar_cvs
from services.reranker import rerank_candidates
from services.skill_extractor import (
    extract_requirements_profile,
    extract_cv_profile,
    compute_full_profile_score
)
from config import (
    TOP_K_EMBEDDING,
    TOP_K_FINAL,
    WEIGHT_EMBEDDING,
    WEIGHT_RERANKER,
    WEIGHT_SKILL,
    MINIMUM_SCORE_THRESHOLD
)

router = APIRouter(prefix="/match", tags=["Matching"])

def get_match_tier(final_score: float) -> str:
    if final_score >= 0.65:
        return "Strong Match"
    elif final_score >= 0.40:
        return "Partial Match"
    else:
        return "Weak Match"
@router.post("/", response_model=MatchResponse)
def match_cvs(request: MatchRequest, db: Session = Depends(get_db)):

    if not request.requirements.strip():
        raise HTTPException(
            status_code=400,
            detail="Requirements text cannot be empty"
        )

    total_cvs = db.query(CV).count()
    if total_cvs == 0:
        raise HTTPException(
            status_code=400,
            detail="No CVs in the system. Please upload CVs first."
        )

    print(f"\n{'='*50}")
    print(f"[MATCHING] Starting match — Total CVs: {total_cvs}")

    # --- JUDGE 1: Embedding Search ---
    print(f"\n[JUDGE 1] Running embedding search...")
    top_matches = search_similar_cvs(
        request.requirements,
        top_k=TOP_K_EMBEDDING
    )
    print(f"[JUDGE 1] Found {len(top_matches)} candidates")

    if not top_matches:
        return MatchResponse(total_cvs_scanned=total_cvs, top_candidates=[])

    cv_ids = [m["cv_id"] for m in top_matches]
    cvs_map = {
        cv.id: cv
        for cv in db.query(CV).filter(CV.id.in_(cv_ids)).all()
    }

    candidates = []
    for match in top_matches:
        cv = cvs_map.get(match["cv_id"])
        if cv:
            candidates.append({
                "cv_id": cv.id,
                "filename": cv.filename,
                "candidate_name": cv.candidate_name,
                "raw_text": cv.raw_text,
                "embedding_score": match["embedding_score"]
            })
            print(f"  → {cv.candidate_name} | embedding: {match['embedding_score']}")

    # --- JUDGE 2: Reranking ---
    print(f"\n[JUDGE 2] Running reranker...")
    candidates = rerank_candidates(request.requirements, candidates)
    for c in candidates:
        print(f"  → {c['candidate_name']} | reranker: {c['reranker_score']}")

    # --- JUDGE 3: Deep Profile Matching ---
    print(f"\n[JUDGE 3] Extracting requirements profile...")
    req_profile = extract_requirements_profile(request.requirements)
    print(f"  Domain: {req_profile.get('domain')}")
    print(f"  Required skills: {req_profile.get('required_skills')}")
    print(f"  Keywords: {req_profile.get('keywords')}")

    results = []
    for candidate in candidates:
        print(f"\n  Analyzing CV: {candidate['candidate_name']}...")
        cv_profile = extract_cv_profile(candidate["raw_text"])
        print(f"  CV domain: {cv_profile.get('domain')}")
        print(f"  CV skills: {cv_profile.get('skills')}")

        skill_score, matched, missing = compute_full_profile_score(
            cv_profile, req_profile
        )

        final_score = (
            WEIGHT_EMBEDDING * candidate["embedding_score"] +
            WEIGHT_RERANKER * candidate["reranker_score"] +
            WEIGHT_SKILL * skill_score
        )

        print(f"  Scores → Embedding: {candidate['embedding_score']} | "
              f"Reranker: {candidate['reranker_score']} | "
              f"Skill: {skill_score}")
        print(f"  Final Score: {round(final_score, 4)}")
        print(f"  Matched: {matched}")
        print(f"  Missing: {missing}")

        results.append(CandidateMatch(
    cv_id=candidate["cv_id"],
    filename=candidate["filename"],
    candidate_name=candidate["candidate_name"],
    final_score=round(final_score, 4),
    embedding_score=candidate["embedding_score"],
    reranker_score=candidate["reranker_score"],
    skill_score=round(skill_score, 4),
    match_tier=get_match_tier(round(final_score, 4)),  # add this
    matched_skills=matched,
    missing_skills=missing
))

    # Sort and filter
    results.sort(key=lambda x: x.final_score, reverse=True)
    results = [
    r for r in results
    if r.final_score >= MINIMUM_SCORE_THRESHOLD
    and r.skill_score > 0.0
]

    if results:
        print(f"\n[MATCHING] Top: {results[0].candidate_name} "
              f"— score {results[0].final_score}")
    else:
        print(f"\n[MATCHING] No candidates passed the threshold.")
    print(f"{'='*50}\n")

    return MatchResponse(
        total_cvs_scanned=total_cvs,
        top_candidates=results[:TOP_K_FINAL]
    )