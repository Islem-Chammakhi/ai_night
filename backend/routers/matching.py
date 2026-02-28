from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from collections import Counter
import json

from database import get_db, CV
from models.schemas import (
    MatchRequest, MatchResponse,
    CandidateMatch, NearMissCandidate
)
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


def build_suggestions(
    results: list,
    near_misses: list,
    req_profile: dict,
    total_cvs: int
) -> list[str]:
    suggestions = []
    req_domain = req_profile.get("domain", "the required domain")
    missing_across_all = []

    if results:
        for r in results:
            missing_across_all += r.missing_skills
    else:
        for nm in near_misses:
            missing_across_all += nm.skills_they_lack

    common_missing = [
        skill for skill, _ in Counter(missing_across_all).most_common(5)
    ]

    if results:
        strong = [r for r in results if r.match_tier == "Strong Match"]
        partial = [r for r in results if r.match_tier == "Partial Match"]

        if strong:
            suggestions.append(
                f"✅ You have {len(strong)} strong match(es). "
                f"We recommend prioritizing: "
                f"{', '.join([r.candidate_name for r in strong[:3]])}."
            )
        if partial:
            suggestions.append(
                f"⚠️ You have {len(partial)} partial match(es). "
                f"These candidates could be suitable with minor upskilling: "
                f"{', '.join([r.candidate_name for r in partial[:3]])}."
            )
        if common_missing:
            suggestions.append(
                f"📌 The most common missing skills across your candidates are: "
                f"{', '.join(common_missing)}. "
                f"Consider filtering for CVs that include these skills."
            )
        if all(r.skill_score < 0.6 for r in results):
            suggestions.append(
                f"🔍 All matched candidates have skill coverage below 60%. "
                f"Consider reviewing if all requirements are strictly necessary, "
                f"or expand your CV pool for better results."
            )
    else:
        suggestions.append(
            f"❌ No matching candidates found for '{req_domain}'. "
            f"Your current CV pool does not cover this domain."
        )
        if common_missing:
            suggestions.append(
                f"📌 To fill this tender, you need candidates with: "
                f"{', '.join(common_missing[:5])}. "
                f"Consider sourcing CVs specifically for {req_domain} profiles."
            )

    if total_cvs < 5:
        suggestions.append(
            f"📂 Your CV database only has {total_cvs} candidate(s). "
            f"Upload more CVs to improve matching accuracy and coverage."
        )

    if not results and near_misses:
        closest = near_misses[0]
        if closest.skills_they_have:
            suggestions.append(
                f"💡 {closest.candidate_name} is your closest candidate. "
                f"They already have: {', '.join(closest.skills_they_have[:4])}. "
                f"With training on {', '.join(closest.skills_they_lack[:3])}, "
                f"they could become viable for future {req_domain} tenders."
            )

    return suggestions


def build_near_miss(
    candidate: dict,
    cv_profile: dict,
    req_profile: dict,
    matched: list,
    missing: list
) -> NearMissCandidate:
    their_domain = cv_profile.get("domain", "Unknown domain")
    their_skills = list(set(
        cv_profile.get("skills", []) +
        cv_profile.get("experience_keywords", []) +
        cv_profile.get("project_keywords", [])
    ))[:15]
    req_domain = req_profile.get("domain", "the required domain")
    suggestion = (
        f"{candidate['candidate_name']} specializes in {their_domain}. "
        f"They match {len(matched)} out of {len(matched) + len(missing)} "
        f"required signals for {req_domain}. "
        f"They are missing key skills: {', '.join(missing[:5])}."
    )
    return NearMissCandidate(
        cv_id=candidate["cv_id"],
        filename=candidate["filename"],
        candidate_name=candidate["candidate_name"],
        their_domain=their_domain,
        their_skills=their_skills,
        required_skills=req_profile.get("required_skills", []),
        skills_they_have=matched,
        skills_they_lack=missing,
        suggestion=suggestion
    )


@router.post("/", response_model=MatchResponse)
def match_cvs(request: MatchRequest, db: Session = Depends(get_db)):

    if not request.requirements.strip():
        raise HTTPException(
            status_code=400,
            detail="Requirements text cannot be empty"
        )

    # Count only CVs for this specific job
    total_cvs = db.query(CV).filter(CV.job_id == request.job_id).count()
    if total_cvs == 0:
        raise HTTPException(
            status_code=400,
            detail="No CVs uploaded for this job. Please upload CVs first."
        )

    print(f"\n{'='*50}")
    print(f"[MATCHING] Job {request.job_id} — Total CVs: {total_cvs}")

    # --- JUDGE 1: Embedding Search ---
    print(f"\n[JUDGE 1] Running embedding search...")
    top_matches = search_similar_cvs(
        request.job_id,
        request.requirements,
        top_k=TOP_K_EMBEDDING
    )

    # ✅ DEDUP HERE — before building candidates
    seen_ids: set[int] = set()
    unique_matches = []
    for match in top_matches:
        if match["cv_id"] not in seen_ids:
            seen_ids.add(match["cv_id"])
            unique_matches.append(match)
    top_matches = unique_matches
    print(f"[JUDGE 1] {len(top_matches)} unique candidates after dedup")

    if not top_matches:
        return MatchResponse(
            total_cvs_scanned=total_cvs,
            top_candidates=[],
            match_found=False,
            explanation="No candidates found for these requirements.",
            near_misses=[],
            suggestions=[]
        )

    # Fetch CV details — scoped to this job only
    cv_ids = [m["cv_id"] for m in top_matches]
    cvs_map = {
        cv.id: cv
        for cv in db.query(CV).filter(
            CV.id.in_(cv_ids),
            CV.job_id == request.job_id
        ).all()
    }

    # Build candidates list — one entry per unique cv_id
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
    print(f"\n[JUDGE 2] Running reranker on {len(candidates)} candidates...")
    candidates = rerank_candidates(request.requirements, candidates)
    for c in candidates:
        print(f"  → {c['candidate_name']} | reranker: {c['reranker_score']}")

    # --- JUDGE 3: Deep Profile Matching ---
    print(f"\n[JUDGE 3] Extracting requirements profile...")
    req_profile = extract_requirements_profile(request.requirements)
    print(f"  Domain: {req_profile.get('domain')}")
    print(f"  Required skills: {req_profile.get('required_skills')}")

    all_results = []
    all_near_misses = []

    for candidate in candidates:
        print(f"\n  Analyzing: {candidate['candidate_name']}...")
        cv_profile = extract_cv_profile(candidate["raw_text"])

        skill_score, matched, missing = compute_full_profile_score(
            cv_profile, req_profile
        )

        final_score = round(
            WEIGHT_EMBEDDING * candidate["embedding_score"] +
            WEIGHT_RERANKER * candidate["reranker_score"] +
            WEIGHT_SKILL * skill_score,
            4
        )

        print(f"  Embedding: {candidate['embedding_score']} | "
              f"Reranker: {candidate['reranker_score']} | "
              f"Skill: {skill_score} | Final: {final_score}")

        passes = skill_score > 0.0 and final_score >= MINIMUM_SCORE_THRESHOLD

        if passes:
            all_results.append(CandidateMatch(
                cv_id=candidate["cv_id"],
                filename=candidate["filename"],
                candidate_name=candidate["candidate_name"],
                final_score=final_score,
                embedding_score=candidate["embedding_score"],
                reranker_score=candidate["reranker_score"],
                skill_score=round(skill_score, 4),
                match_tier=get_match_tier(final_score),
                matched_skills=matched,
                missing_skills=missing
            ))
        else:
            near_miss = build_near_miss(
                candidate, cv_profile, req_profile, matched, missing
            )
            all_near_misses.append((final_score, near_miss))

    # Sort results by final score
    all_results.sort(key=lambda x: x.final_score, reverse=True)

    # ✅ Guarantee at least top 3 if they have any skill match
    if len(all_results) < 3:
        fallback = [
            nm for score, nm in sorted(all_near_misses, key=lambda x: x[0], reverse=True)
            if nm.cv_id not in {r.cv_id for r in all_results}
        ]
        for nm in fallback[:3 - len(all_results)]:
            # Promote near miss to result with weak tier
            all_results.append(CandidateMatch(
                cv_id=nm.cv_id,
                filename=nm.filename,
                candidate_name=nm.candidate_name,
                final_score=0.0,
                embedding_score=0.0,
                reranker_score=0.0,
                skill_score=0.0,
                match_tier="Weak Match",
                matched_skills=nm.skills_they_have,
                missing_skills=nm.skills_they_lack
            ))

    # Sort near misses and take top 5
    all_near_misses.sort(key=lambda x: x[0], reverse=True)
    top_near_misses = [nm for _, nm in all_near_misses[:5]]

    # No matches at all
    if not any(r.skill_score > 0 for r in all_results):
        req_domain = req_profile.get("domain", "the required domain")
        req_skills = req_profile.get("required_skills", [])
        explanation = (
            f"No candidates in the database match the requirements for '{req_domain}'. "
            f"The tender requires expertise in: {', '.join(req_skills[:6])}. "
            f"The {len(top_near_misses)} candidate(s) shown below are from different "
            f"domains and lack the core required skills. "
            f"Consider uploading CVs from professionals in {req_domain}."
        )
        print(f"\n[MATCHING] No matches. Showing {len(top_near_misses)} near misses.")
        print(f"{'='*50}\n")
        return MatchResponse(
            total_cvs_scanned=total_cvs,
            top_candidates=[],
            match_found=False,
            explanation=explanation,
            near_misses=top_near_misses,
            suggestions=build_suggestions([], top_near_misses, req_profile, total_cvs)
        )

    # Final result — only matched candidates (skill > 0)
    final_results = [r for r in all_results if r.skill_score > 0.0]
    final_results.sort(key=lambda x: x.final_score, reverse=True)

    print(f"\n[MATCHING] {len(final_results)} match(es) found.")
    if final_results:
        print(f"Top: {final_results[0].candidate_name} — {final_results[0].final_score}")
    print(f"{'='*50}\n")

    return MatchResponse(
        total_cvs_scanned=total_cvs,
        top_candidates=final_results[:TOP_K_FINAL],
        match_found=True,
        explanation=None,
        near_misses=top_near_misses if top_near_misses else None,
        suggestions=build_suggestions(final_results[:TOP_K_FINAL], [], req_profile, total_cvs)
    )