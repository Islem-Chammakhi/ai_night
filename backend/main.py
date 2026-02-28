from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables

from routers import cvs, matching
from fastapi import Depends
from sqlalchemy.orm import Session
from database import get_db
app = FastAPI(
    title="SmartTender AI – CV Matching API",
    description="Automated CV to requirement matching using AI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create DB tables on startup
create_tables()

# Register routers
app.include_router(cvs.router)
app.include_router(matching.router)


@app.get("/")
def root():
    return {"message": "SmartTender AI Backend is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.delete("/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    """Called when admin deletes a job from frontend — cleans everything"""
    from routers.cvs import delete_job_cvs
    return delete_job_cvs(job_id, db)
