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

    # Normalize scores to 0-1 range
    min_s, max_s = min(scores), max(scores)
    score_range = max_s - min_s if max_s != min_s else 1

    for i, candidate in enumerate(candidates):
        normalized = (scores[i] - min_s) / score_range
        candidate["reranker_score"] = round(float(normalized), 4)

    return sorted(candidates, key=lambda x: x["reranker_score"], reverse=True)