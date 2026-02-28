from sentence_transformers import CrossEncoder
from config import RERANKER_MODEL

print("Loading reranker model...")
reranker = CrossEncoder(RERANKER_MODEL)
print("Reranker model loaded.")


def rerank_candidates(requirements: str, candidates: list[dict]) -> list[dict]:
    if not candidates:
        return []

    pairs = [(requirements, c["raw_text"]) for c in candidates]
    scores = reranker.predict(pairs)

    # Handle single candidate
    if not hasattr(scores, '__len__'):
        scores = [scores]

    scores = [float(s) for s in scores]

    # If only 1 candidate, give it full score
    if len(scores) == 1:
        candidates[0]["reranker_score"] = 1.0
        return candidates

    # Normalize scores to 0-1 range
    min_s = min(scores)
    max_s = max(scores)
    score_range = max_s - min_s if max_s != min_s else 1.0

    for i, candidate in enumerate(candidates):
        normalized = (scores[i] - min_s) / score_range
        candidate["reranker_score"] = round(normalized, 4)

    return sorted(candidates, key=lambda x: x["reranker_score"], reverse=True)