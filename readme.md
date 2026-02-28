# SmartTender AI – CV Matching Backend

Intelligent system that automatically matches candidate CVs against tender requirements using a 3-judge AI pipeline.

---

## What It Does

The admin uploads CVs into the system, enters tender requirements, and the system returns ranked candidates with scores, matched/missing skills, and actionable suggestions.

---

## How It Works – The Pipeline

```
PDF CVs uploaded
      ↓
Text extraction (pdfplumber)
      ↓
Embed & index all CVs (BAAI/bge-m3 + FAISS)  ← runs once
      ↓
Admin enters tender requirements
      ↓
Extract structured profile (LLaMA 3.1 via Groq)
      ↓
JUDGE 1 — Embedding Search    → Top 20 candidates (FAISS)
      ↓
JUDGE 2 — Reranker            → Reordered by relevance (cross-encoder)
      ↓
JUDGE 3 — Deep Profile Match  → Skill + domain + experience scoring (LLaMA)
      ↓
Weighted final score = 25% embedding + 25% reranker + 50% skill
      ↓
Filter by threshold + skill_score > 0
      ↓
Ranked results with match tier, suggestions, near-misses
```

---

## AI Models

| Judge | Model | Purpose | Hosted |
|---|---|---|---|
| Embedding | `BAAI/bge-m3` | Multilingual semantic search | Local |
| Reranker | `cross-encoder/ms-marco-MiniLM-L-6-v2` | Deep relevance ranking | Local |
| Skill Extraction | `LLaMA 3.1 8B` via Groq API | Profile & skill extraction | Free API |

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | FastAPI |
| Server | Uvicorn |
| Database | SQLite + SQLAlchemy |
| PDF Parsing | pdfplumber |
| Vector Search | FAISS (faiss-cpu) |
| Embeddings | sentence-transformers |
| LLM API | Groq (free tier) |
| Validation | Pydantic |
| Config | python-dotenv |

---

## Project Structure

```
backend/
├── main.py                  # FastAPI entry point
├── config.py                # Settings and model config
├── database.py              # SQLite models and session
├── .env                     # API keys (not committed)
│
├── routers/
│   ├── cvs.py               # CV upload, list, delete
│   └── matching.py          # Matching pipeline
│
├── services/
│   ├── parser.py            # PDF text extraction
│   ├── embedder.py          # FAISS index + bge-m3
│   ├── reranker.py          # Cross-encoder reranking
│   └── skill_extractor.py   # Groq skill + profile extraction
│
├── models/
│   └── schemas.py           # Pydantic request/response models
│
└── data/
    ├── cvs/                 # Uploaded PDF files
    ├── embeddings/          # FAISS index files
    └── smarttender.db       # SQLite database
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| POST | `/cvs/upload` | Upload a CV (PDF only) |
| GET | `/cvs/` | List all CVs |
| DELETE | `/cvs/{id}` | Delete a CV |
| POST | `/match/` | Match CVs to requirements |

---

## Match Response Structure

```json
{
  "total_cvs_scanned": 3,
  "match_found": true,
  "top_candidates": [
    {
      "candidate_name": "John Doe",
      "final_score": 0.82,
      "match_tier": "Strong Match",
      "matched_skills": ["Docker", "Spring Boot", "PostgreSQL"],
      "missing_skills": ["Kubernetes"]
    }
  ],
  "near_misses": null,
  "suggestions": [
    "✅ You have 1 strong match. We recommend: John Doe.",
    "📌 Most common missing skill: Kubernetes."
  ]
}
```

**Match Tiers:**
- `Strong Match` → final score ≥ 0.65
- `Partial Match` → final score ≥ 0.40
- `Weak Match` → final score < 0.40

---

## Setup & Run

**1. Install dependencies**
```bash
pip install fastapi uvicorn pdfplumber sentence-transformers faiss-cpu groq python-multipart sqlalchemy pydantic python-dotenv
```

**2. Configure `.env`**
```env
GROQ_API_KEY=gsk_your_key_here
DATABASE_URL=sqlite:///./data/smarttender.db
EMBEDDINGS_PATH=./data/embeddings/
CVS_PATH=./data/cvs/
```

Get a free Groq key at: https://console.groq.com

**3. Run**
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

**4. Open API docs**
```
http://localhost:8000/docs
```

---

## Scoring Weights

```python
WEIGHT_EMBEDDING = 0.25   # Semantic similarity
WEIGHT_RERANKER  = 0.25   # Relevance ranking
WEIGHT_SKILL     = 0.50   # Skill + domain + experience match
MINIMUM_SCORE_THRESHOLD = 0.40
```

> A candidate with `skill_score = 0.0` is never returned, regardless of other scores.