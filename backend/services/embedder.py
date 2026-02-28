from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import os
import pickle
from config import EMBEDDING_MODEL, EMBEDDINGS_PATH

os.makedirs(EMBEDDINGS_PATH, exist_ok=True)

INDEX_FILE = os.path.join(EMBEDDINGS_PATH, "faiss.index")
META_FILE = os.path.join(EMBEDDINGS_PATH, "meta.pkl")

# Load model once at startup
print("Loading embedding model...")
embedding_model = SentenceTransformer(EMBEDDING_MODEL)
print("Embedding model loaded.")


def embed_text(text: str) -> np.ndarray:
    return embedding_model.encode(text, normalize_embeddings=True)


def load_index():
    if os.path.exists(INDEX_FILE) and os.path.exists(META_FILE):
        index = faiss.read_index(INDEX_FILE)
        with open(META_FILE, "rb") as f:
            meta = pickle.load(f)
        return index, meta
    return None, []


def save_index(index, meta):
    faiss.write_index(index, INDEX_FILE)
    with open(META_FILE, "wb") as f:
        pickle.dump(meta, f)


def add_cv_to_index(cv_id: int, text: str):
    index, meta = load_index()
    vector = embed_text(text).reshape(1, -1)
    dim = vector.shape[1]

    if index is None:
        index = faiss.IndexFlatIP(dim)  # Inner product = cosine similarity (with normalized vectors)

    index.add(vector)
    meta.append({"cv_id": cv_id})
    save_index(index, meta)


def search_similar_cvs(requirements_text: str, top_k: int = 20) -> list[dict]:
    index, meta = load_index()

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