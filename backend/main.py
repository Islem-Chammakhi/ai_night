from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables
from routers import cvs, matching

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
