"""
Tender Detection Service
Adapted from model.py — integrated into FastAPI backend.
No matplotlib, no top-level script execution.
"""

import re
import unicodedata
import json
import os
import csv
from typing import List, Optional

# ─── Skill aliases ────────────────────────────────────────────────────────────
SKILL_ALIASES = {
    "aws": "AWS",
    "amazon web services": "AWS",
    "azure": "Azure",
    "ms azure": "Azure",
    "gcp": "Google Cloud",
    "google cloud": "Google Cloud",
    "k8s": "Kubernetes",
    "kubernetes": "Kubernetes",
    "ci cd": "CI/CD",
    "cicd": "CI/CD",
    "ci/cd": "CI/CD",
    "devops": "DevOps",
    "dev sec ops": "DevSecOps",
    "devsecops": "DevSecOps",
    "gitlab ci": "GitLab CI",
    "gitlab": "GitLab CI",
    "jenkins": "Jenkins",
    "terraform": "Terraform",
}

# ─── Text normalizers ─────────────────────────────────────────────────────────

def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.strip()
    text = text.replace("–", "-").replace("—", "-")
    text = re.sub(r"\s+", " ", text)
    return text


def normalize_for_matching(text: str) -> str:
    if not text:
        return ""
    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _normalize_token(token: str) -> str:
    return re.sub(r"\s+", " ", token.strip())


def _to_matching_form(token: str) -> str:
    token = token.lower()
    token = unicodedata.normalize("NFD", token)
    token = "".join(c for c in token if unicodedata.category(c) != "Mn")
    token = re.sub(r"[^a-z0-9/+\s.-]", "", token)
    return re.sub(r"\s+", " ", token).strip()


# ─── Parsers ──────────────────────────────────────────────────────────────────

def days_to_deadline(submission_deadline: str) -> Optional[int]:
    from datetime import datetime
    if not submission_deadline:
        return None
    try:
        deadline_date = datetime.strptime(submission_deadline, "%Y-%m-%d")
        return (deadline_date - datetime.today()).days
    except ValueError:
        return None


def extract_duration_months(contract_duration: str) -> Optional[int]:
    if not contract_duration:
        return None
    duration = contract_duration.split(" ")[0]
    return int(duration) if duration.isdigit() else None


def parse_budget_range(budget_str: str) -> dict:
    if not budget_str or not isinstance(budget_str, str):
        return {"currency": None, "min": None, "max": None}
    s = budget_str.strip().replace("–", "-").replace("—", "-")
    currency = "EUR" if ("€" in s or "EUR" in s.upper()) else None
    parts = [p.strip() for p in s.split("-") if p.strip()]

    def to_number(x: str) -> Optional[int]:
        x = re.sub(r"[^\d,.\s]", "", x).replace(" ", "").replace(",", "").replace(".", "")
        return int(x) if x.isdigit() else None

    bmin = to_number(parts[0]) if len(parts) > 0 else None
    bmax = to_number(parts[1]) if len(parts) > 1 else None
    return {"currency": currency, "min": bmin, "max": bmax}


def parse_required_skills(skills_str: str):
    if not skills_str or not isinstance(skills_str, str):
        return [], []
    raw = re.split(r"[;,]", skills_str)
    display, matching, seen = [], [], set()
    for tok in raw:
        tok = _normalize_token(tok)
        if not tok:
            continue
        key = _to_matching_form(tok)
        canonical = SKILL_ALIASES.get(key, tok)
        ckey = _to_matching_form(canonical)
        if ckey in seen:
            continue
        seen.add(ckey)
        display.append(canonical)
        matching.append(ckey)
    return display, matching


# ─── Text builders ────────────────────────────────────────────────────────────

def build_tender_text(t: dict) -> str:
    skills = " ".join(t.get("required_skills_display", []))
    bmin, bmax = t.get("budget_min"), t.get("budget_max")
    cur = t.get("budget_currency") or "EUR"
    if bmin and bmax:
        budget_str = f"{bmin}-{bmax} {cur}"
    elif bmin:
        budget_str = f"{bmin} {cur}"
    else:
        budget_str = "Unknown"
    dur = t.get("contract_duration_months")
    return (
        f"Title: {t.get('title', '')}\n"
        f"Authority: {t.get('issuing_authority', '')}\n"
        f"Description: {t.get('project_description', '')}\n"
        f"Required skills: {skills}\n"
        f"Budget: {budget_str}\n"
        f"Duration: {dur} months\n"
        f"Submission deadline: {t.get('submission_deadline', '')}"
    )


def build_company_profile_text(profile: dict) -> str:
    return (
        f"Company: {profile['company_name']}\n"
        f"Focus domains: {' '.join(profile['focus_domains'])}\n"
        f"Secondary domains: {' '.join(profile['secondary_domains'])}\n"
        f"Core skills: {' '.join(profile['core_skills'])}\n"
        f"ML/Data skills: {' '.join(profile['ml_skills'])}\n"
        f"Regions: {' '.join(profile['regions'])}\n"
        f"Budget range: {profile['min_budget_eur']}-{profile['max_budget_eur']} EUR\n"
        f"Preferred duration: {profile['preferred_contract_duration_months'][0]}-"
        f"{profile['preferred_contract_duration_months'][1]} months\n"
        f"Languages: {' '.join(profile['required_language'])}\n"
        f"Excluded domains: {' '.join(profile['excluded_domains'])}\n"
        f"{profile.get('text', '')}"
    )


# ─── Normalization pipeline ───────────────────────────────────────────────────

def normalize_tender_row(row: dict) -> dict:
    skills_display, skills_match = parse_required_skills(row.get("required_skills", ""))
    budget = parse_budget_range(row.get("estimated_budget", ""))
    dur = extract_duration_months(row.get("contract_duration", ""))

    tender = {
        "issuing_authority": normalize_text(row.get("issuing_authority", "")),
        "title": normalize_text(row.get("title", "")),
        "project_description": normalize_text(row.get("project_description", "")),
        "required_skills_display": skills_display,
        "required_skills_match": skills_match,
        "publication_date": row.get("publication_date", "").strip(),
        "submission_deadline": row.get("submission_deadline", "").strip(),
        "contract_duration_months": dur,
        "budget_currency": budget["currency"],
        "budget_min": budget["min"],
        "budget_max": budget["max"],
        "days_to_deadline": days_to_deadline(row.get("submission_deadline", "")),
    }
    tender["tender_text"] = build_tender_text(tender)
    return tender


# ─── Load data ────────────────────────────────────────────────────────────────

def load_company_profile(json_path: str) -> dict:
    with open(json_path, "r", encoding="utf-8") as f:
        p = json.load(f)
    profile = dict(p)
    profile["profile_text"] = build_company_profile_text(p)
    return profile


def load_tenders_from_csv(csv_path: str) -> List[dict]:
    tenders = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tender = normalize_tender_row(dict(row))
            tenders.append(tender)
    return tenders


# ─── Scoring ─────────────────────────────────────────────────────────────────

def compute_scores(profile: dict, tenders: List[dict]) -> List[dict]:
    """
    Lazy-import sentence-transformers so the module can be imported
    without model download at startup. Scores are computed on first call.
    """
    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np
    except ImportError:
        raise RuntimeError("sentence-transformers is not installed. Run: pip install sentence-transformers")

    model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

    company_text = profile["profile_text"]
    company_vec = model.encode([company_text], normalize_embeddings=True)

    tender_texts = [t["tender_text"] for t in tenders]
    tender_vecs = model.encode(tender_texts, normalize_embeddings=True)

    sims = np.dot(tender_vecs, company_vec[0])

    scored = []
    for i, tender in enumerate(tenders):
        t = dict(tender)
        t["semantic_score"] = round(float(sims[i]) * 100, 2)
        t["semantic_similarity"] = round(float(sims[i]), 4)
        scored.append(t)

    scored.sort(key=lambda x: x["semantic_score"], reverse=True)
    return scored


def is_excluded(tender: dict, profile: dict) -> bool:
    """Check if a tender's skills/description match any excluded domain."""
    excluded = [normalize_for_matching(d) for d in profile.get("excluded_domains", [])]
    text = normalize_for_matching(
        tender.get("project_description", "") + " " +
        " ".join(tender.get("required_skills_display", []))
    )
    return any(excl in text for excl in excluded if excl)
