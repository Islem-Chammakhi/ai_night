from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
import os, json, shutil

from database import get_db, CV
from models.schemas import CVResponse
from services.parser import extract_text_from_pdf, extract_candidate_name, clean_text
from services.skill_extractor import extract_skills_from_text
from services.embedder import add_cv_to_index, delete_index
from config import CVS_PATH

os.makedirs(CVS_PATH, exist_ok=True)
router = APIRouter(prefix="/cvs", tags=["CVs"])


@router.post("/upload", response_model=CVResponse)
async def upload_cv(
    file: UploadFile = File(...),
    job_id: int = Form(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # Unique per job — same file allowed in different jobs
    existing = db.query(CV).filter(
        CV.filename == file.filename,
        CV.job_id == job_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"This CV is already uploaded for this job"
        )

    # Save PDF with job prefix to avoid file conflicts
    safe_filename = f"job{job_id}_{file.filename}"
    file_path = os.path.join(CVS_PATH, safe_filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Extract text
    raw_text = extract_text_from_pdf(file_path)
    if not raw_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from this PDF"
        )

    candidate_name = extract_candidate_name(raw_text)
    raw_text = clean_text(raw_text)
    skills = extract_skills_from_text(raw_text)

    # Save to DB
    cv = CV(
        job_id=job_id,
        filename=file.filename,
        candidate_name=candidate_name,
        raw_text=raw_text,
        skills=json.dumps(skills)
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)

    # Add to job-specific FAISS index
    add_cv_to_index(job_id, cv.id, raw_text)

    return CVResponse(
        id=cv.id,
        job_id=cv.job_id,
        filename=cv.filename,
        candidate_name=cv.candidate_name,
        skills=skills,
        uploaded_at=cv.uploaded_at
    )


@router.get("/job/{job_id}", response_model=list[CVResponse])
def get_cvs_by_job(job_id: int, db: Session = Depends(get_db)):
    cvs = db.query(CV).filter(CV.job_id == job_id).all()
    return [
        CVResponse(
            id=cv.id,
            job_id=cv.job_id,
            filename=cv.filename,
            candidate_name=cv.candidate_name,
            skills=json.loads(cv.skills) if cv.skills else [],
            uploaded_at=cv.uploaded_at
        )
        for cv in cvs
    ]


@router.delete("/job/{job_id}")
def delete_job_cvs(job_id: int, db: Session = Depends(get_db)):
    """Delete ALL CVs and index for a specific job"""
    cvs = db.query(CV).filter(CV.job_id == job_id).all()

    # Delete PDF files from disk
    for cv in cvs:
        file_path = os.path.join(CVS_PATH, f"job{job_id}_{cv.filename}")
        if os.path.exists(file_path):
            os.remove(file_path)

    # Delete from DB
    db.query(CV).filter(CV.job_id == job_id).delete()
    db.commit()

    # Delete FAISS index for this job
    delete_index(job_id)

    return {"message": f"All CVs for job {job_id} deleted successfully"}


@router.delete("/{cv_id}")
def delete_single_cv(cv_id: int, db: Session = Depends(get_db)):
    cv = db.query(CV).filter(CV.id == cv_id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    file_path = os.path.join(CVS_PATH, f"job{cv.job_id}_{cv.filename}")
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(cv)
    db.commit()
    return {"message": f"CV {cv_id} deleted"}