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

    # Handle case where only 1 candidate (scores is a single float)
    if not hasattr(scores, '__len__'):
        scores = [scores]

    # Normalize scores to 0-1 range
    min_s = float(min(scores))
    max_s = float(max(scores))
    score_range = max_s - min_s if max_s != min_s else 1.0

    for i, candidate in enumerate(candidates):
        normalized = (float(scores[i]) - min_s) / score_range
        candidate["reranker_score"] = round(normalized, 4)

    return sorted(candidates, key=lambda x: x["reranker_score"], reverse=True)