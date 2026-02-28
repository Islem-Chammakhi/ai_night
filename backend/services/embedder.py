from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import os
import pickle
from config import EMBEDDING_MODEL, EMBEDDINGS_PATH

os.makedirs(EMBEDDINGS_PATH, exist_ok=True)

print("Loading embedding model...")
embedding_model = SentenceTransformer(EMBEDDING_MODEL)
print("Embedding model loaded.")


def _index_path(job_id: int) -> str:
    return os.path.join(EMBEDDINGS_PATH, f"job_{job_id}.index")


def _meta_path(job_id: int) -> str:
    return os.path.join(EMBEDDINGS_PATH, f"job_{job_id}.pkl")


def embed_text(text: str) -> np.ndarray:
    return embedding_model.encode(text, normalize_embeddings=True)


def load_index(job_id: int):
    idx_path = _index_path(job_id)
    meta_path = _meta_path(job_id)
    if os.path.exists(idx_path) and os.path.exists(meta_path):
        index = faiss.read_index(idx_path)
        with open(meta_path, "rb") as f:
            meta = pickle.load(f)
        return index, meta
    return None, []


def save_index(job_id: int, index, meta):
    faiss.write_index(index, _index_path(job_id))
    with open(_meta_path(job_id), "wb") as f:
        pickle.dump(meta, f)


def delete_index(job_id: int):
    for path in [_index_path(job_id), _meta_path(job_id)]:
        if os.path.exists(path):
            os.remove(path)
    print(f"[EMBEDDER] Deleted index for job {job_id}")


def add_cv_to_index(job_id: int, cv_id: int, text: str):
    index, meta = load_index(job_id)

    # Skip if already indexed
    if any(m["cv_id"] == cv_id for m in meta):
        print(f"[EMBEDDER] CV {cv_id} already in job {job_id} index, skipping.")
        return

    vector = embed_text(text).reshape(1, -1)
    dim = vector.shape[1]

    if index is None:
        index = faiss.IndexFlatIP(dim)

    index.add(vector)
    meta.append({"cv_id": cv_id})
    save_index(job_id, index, meta)
    print(f"[EMBEDDER] CV {cv_id} added to job {job_id}. Total: {index.ntotal}")


def search_similar_cvs(job_id: int, requirements_text: str, top_k: int = 20) -> list[dict]:
    index, meta = load_index(job_id)

    if index is None or index.ntotal == 0:
        return []

    query_vector = embed_text(requirements_text).reshape(1, -1)
    top_k = min(top_k, index.ntotal)
    scores, indices = index.search(query_vector, top_k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < len(meta):
            results.append({
                "cv_id": meta[idx]["cv_id"],
                "embedding_score": round(float(score), 4)
            })
    return results