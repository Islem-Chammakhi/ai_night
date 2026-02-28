from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables

from routers import cvs, matching, tenders
from fastapi import Depends
from sqlalchemy.orm import Session
from database import get_db

app = FastAPI(
    title="SmartTender AI – API",
    description=(
        "Two modules in one API:\n"
        "1. **CV Matching** — upload CVs and match them to job requirements using embeddings + reranking.\n"
        "2. **Smart Tender Detection** — score public tenders against the company profile to find the best fits."
    ),
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create DB tables on startup
create_tables()

# ── Register routers ────────────────────────────────────────────────────────────
app.include_router(cvs.router)
app.include_router(matching.router)
app.include_router(tenders.router)   # Smart Tender Detection


@app.get("/", tags=["Health"])
def root():
    return {"message": "SmartTender AI Backend is running", "version": "1.1.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}


@app.delete("/jobs/{job_id}", tags=["CVs"])
def delete_job(job_id: int, db: Session = Depends(get_db)):
    """Called when admin deletes a job from frontend — cleans CVs + FAISS index."""
    from routers.cvs import delete_job_cvs
    return delete_job_cvs(job_id, db)


@app.post("/score-tenders")
def score_tenders(data):
    pass