from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from database import get_db, CV
from models.schemas import MatchRequest, MatchResponse, CandidateMatch
from services.embedder import search_similar_cvs
from services.reranker import rerank_candidates
from services.skill_extractor import extract_skills_from_text, compute_skill_score
from config import (
    TOP_K_EMBEDDING,
    TOP_K_FINAL,
    WEIGHT_EMBEDDING,
    WEIGHT_RERANKER,
    WEIGHT_SKILL
)

router = APIRouter(prefix="/match", tags=["Matching"])


@router.post("/", response_model=MatchResponse)
def match_cvs(request: MatchRequest, db: Session = Depends(get_db)):

    # --- Validation ---
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
    print(f"[MATCHING] Starting match for requirements:")
    print(f"{request.requirements[:200]}...")
    print(f"[MATCHING] Total CVs in database: {total_cvs}")

    # --- JUDGE 1: Embedding Search ---
    print(f"\n[JUDGE 1] Running embedding search...")
    top_matches = search_similar_cvs(
        request.requirements,
        top_k=TOP_K_EMBEDDING
    )
    print(f"[JUDGE 1] Found {len(top_matches)} candidates")

    if not top_matches:
        return MatchResponse(total_cvs_scanned=total_cvs, top_candidates=[])

    # Fetch CV details from DB
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
                "skills": json.loads(cv.skills) if cv.skills else [],
                "embedding_score": match["embedding_score"]
            })
            print(f"  → {cv.candidate_name} | embedding score: {match['embedding_score']}")

    # --- JUDGE 2: Reranking ---
    print(f"\n[JUDGE 2] Running reranker...")
    candidates = rerank_candidates(request.requirements, candidates)
    for c in candidates:
        print(f"  → {c['candidate_name']} | reranker score: {c['reranker_score']}")

    # --- JUDGE 3: Skill Matching ---
    print(f"\n[JUDGE 3] Extracting required skills from tender...")
    required_skills = extract_skills_from_text(request.requirements)
    print(f"[JUDGE 3] Required skills: {required_skills}")

    results = []
    for candidate in candidates:
        skill_score, matched, missing = compute_skill_score(
            candidate["skills"],
            required_skills
        )

        # Weighted Final Score
        final_score = (
            WEIGHT_EMBEDDING * candidate["embedding_score"] +
            WEIGHT_RERANKER * candidate["reranker_score"] +
            WEIGHT_SKILL * skill_score
        )

        print(f"\n  Candidate: {candidate['candidate_name']}")
        print(f"  Embedding: {candidate['embedding_score']} | "
              f"Reranker: {candidate['reranker_score']} | "
              f"Skills: {skill_score}")
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
            matched_skills=matched,
            missing_skills=missing
        ))

    # Sort by final score
    results.sort(key=lambda x: x.final_score, reverse=True)

    print(f"\n[MATCHING] Done. Top candidate: "
          f"{results[0].candidate_name} with score {results[0].final_score}")
    print(f"{'='*50}\n")

    return MatchResponse(
        total_cvs_scanned=total_cvs,
        top_candidates=results[:TOP_K_FINAL]
    )