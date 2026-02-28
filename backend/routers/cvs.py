from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import os, json, shutil

from database import get_db, CV
from models.schemas import CVResponse
from services.parser import clean_text, extract_text_from_pdf, extract_candidate_name
from services.skill_extractor import extract_skills_from_text
from services.embedder import add_cv_to_index
from config import CVS_PATH

os.makedirs(CVS_PATH, exist_ok=True)
router = APIRouter(prefix="/cvs", tags=["CVs"])


@router.post("/upload", response_model=CVResponse)
async def upload_cv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # Check duplicate
    existing = db.query(CV).filter(CV.filename == file.filename).first()
    if existing:
        raise HTTPException(status_code=400, detail="CV with this filename already exists")

    # Save PDF to disk
    file_path = os.path.join(CVS_PATH, file.filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Extract text
    raw_text = extract_text_from_pdf(file_path)
    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from this PDF")

    # Extract name BEFORE cleaning (needs newlines)
    candidate_name = extract_candidate_name(raw_text)

    # Clean text AFTER extracting name
    from services.parser import clean_text
    raw_text = clean_text(raw_text)

    # Extract skills from cleaned text
    skills = extract_skills_from_text(raw_text)

    # Save to database
    cv = CV(
        filename=file.filename,
        candidate_name=candidate_name,
        raw_text=raw_text,
        skills=json.dumps(skills)
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)

    # Add to FAISS index
    add_cv_to_index(cv.id, raw_text)

    return CVResponse(
        id=cv.id,
        filename=cv.filename,
        candidate_name=cv.candidate_name,
        skills=skills,
        uploaded_at=cv.uploaded_at
    )


@router.get("/", response_model=list[CVResponse])
def get_all_cvs(db: Session = Depends(get_db)):
    cvs = db.query(CV).all()
    result = []
    for cv in cvs:
        result.append(CVResponse(
            id=cv.id,
            filename=cv.filename,
            candidate_name=cv.candidate_name,
            skills=json.loads(cv.skills) if cv.skills else [],
            uploaded_at=cv.uploaded_at
        ))
    return result


@router.delete("/{cv_id}")
def delete_cv(cv_id: int, db: Session = Depends(get_db)):
    cv = db.query(CV).filter(CV.id == cv_id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    
    # Delete file from disk
    file_path = os.path.join(CVS_PATH, cv.filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    db.delete(cv)
    db.commit()
    return {"message": f"CV {cv_id} deleted successfully"}