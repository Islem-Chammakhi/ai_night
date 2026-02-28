import re
import unicodedata
import json
import pandas as pd
from sentence_transformers import SentenceTransformer
import numpy as np
import matplotlib.pyplot as plt

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


def normalize_text(text):
    if not text:
        return ""
    
    # 1. Trim
    text = text.strip()
    
    # 2. Normalize dashes
    text = text.replace("–", "-").replace("—", "-")
    
    # 3. Remove extra spaces
    text = re.sub(r"\s+", " ", text)
    
    return text

def normalize_for_matching(text):
    if not text:
        return ""
    
    # Lowercase
    text = text.lower()
    
    # Remove accents
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    
    # Keep only letters, numbers, spaces
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    
    # Remove extra spaces
    text = re.sub(r"\s+", " ", text).strip()
    
    return text

def days_to_deadline (submission_deadline ):
    from datetime import datetime
    if not submission_deadline:
        return None
    
    try:
        deadline_date = datetime.strptime(submission_deadline, "%Y-%m-%d")
        today = datetime.today()
        delta = (deadline_date - today).days
        return delta
    except ValueError:
        return None

def extract_duration_month(contract_duration):
    duration = contract_duration.split(" ")[0]
    return int(duration) if duration.isdigit() else None

def parse_budget_range(budget_str: str):
    if not budget_str or not isinstance(budget_str, str):
        return {"currency": None, "min": None, "max": None, "warning": "missing_budget"}

    s = budget_str.strip()
    s = s.replace("–", "-").replace("—", "-")

    # Detect currency
    currency = None
    if "€" in s or "EUR" in s.upper():
        currency = "EUR"

    # Extract numbers (keep digits, commas, dots, spaces)
    # Example: "€2,500,000 - €3,000,000"
    parts = [p.strip() for p in s.split("-") if p.strip()]

    def to_number(x: str):
        # remove currency symbols/letters
        x = re.sub(r"[^\d,.\s]", "", x)
        # remove spaces
        x = x.replace(" ", "")
        # handle formats:
        # - "2,500,000" -> remove commas
        # - "2.500.000" -> remove dots
        # choose: if there are both comma and dot, keep digits only
        # simplest MVP: remove both commas and dots
        x = x.replace(",", "").replace(".", "")
        return int(x) if x.isdigit() else None

    bmin =  to_number(parts[0])
    bmax =  to_number(parts[1])
        

    return {"currency": currency, "min": bmin, "max": bmax}

def _normalize_token(token: str) -> str:
    token = token.strip()
    token = re.sub(r"\s+", " ", token)
    return token

def _to_matching_form(token: str) -> str:
    token = token.lower()
    token = unicodedata.normalize("NFD", token)
    token = "".join(c for c in token if unicodedata.category(c) != "Mn")
    token = re.sub(r"[^a-z0-9/+\s.-]", "", token)  # keep / + . -
    token = re.sub(r"\s+", " ", token).strip()
    return token

def parse_required_skills(skills_str: str):
    if not skills_str or not isinstance(skills_str, str):
        return [], []

    # split on ; or , (robust)
    raw = re.split(r"[;,]", skills_str)

    display = []
    matching = []
    seen = set()

    for tok in raw:
        tok = _normalize_token(tok)
        if not tok:
            continue

        key = _to_matching_form(tok)

        # map aliases
        canonical = SKILL_ALIASES.get(key, None)
        if canonical is None:
            # fallback: keep original but clean it
            canonical = tok

        # build matching key from canonical to dedupe properly
        canonical_key = _to_matching_form(canonical)
        if canonical_key in seen:
            continue
        seen.add(canonical_key)

        display.append(canonical)
        matching.append(canonical_key)

    return display, matching

def build_tender_text(t: dict) -> str:
    # texte stable pour embeddings
    skills_joined = "".join(t["required_skills_match"]) if t["required_skills_match"] else "Unknown"
    bmin = t.get("budget_min")
    bmax = t.get("budget_max")
    cur = t.get("budget_currency") or "Unknown"

    budget_str = "Unknown"
    if bmin is not None and bmax is not None:
        budget_str = f"{bmin}-{bmax} {cur}"
    elif bmin is not None:
        budget_str = f"{bmin} {cur}"

    dur = t.get("contract_duration_months")
    dur_str = f"{dur} months" if dur is not None else "Unknown"

    deadline = t.get("submission_deadline") or "Unknown"
    pub = t.get("publication_date") or "Unknown"
    return (
        f"Title: {t['title_display']}\n"
        f"Authority: {t['issuing_authority_display']}\n"
        f"Description: {t['project_description_display']}\n"
        f"Required skills: {skills_joined}\n"
        f"Budget: {budget_str}\n"
        f"Duration: {dur_str}\n"
        f"Publication date: {pub}\n"
        f"Submission deadline: {deadline}"
    )

def build_company_profile_text(profile: dict) -> str:
    focus = " ".join(profile["focus_domains_display"])
    secondary = " ".join(profile["secondary_domains_display"])
    core_skills = " ".join(profile["core_skills_display"])
    ml_skills = " ".join(profile["ml_skills_display"])
    regions = " ".join(profile["regions_display"])
    excluded = " ".join(profile["excluded_domains_display"])
    languages = " ".join(profile["required_language_display"])

    min_budget = profile["min_budget_eur"]
    max_budget = profile["max_budget_eur"]

    duration_min = profile["preferred_contract_duration_months"][0]
    duration_max = profile["preferred_contract_duration_months"][1]

    return (
        f"Company: {profile['company_name_display']}\n"
        f"Focus domains: {focus}\n"
        f"Secondary domains: {secondary}\n"
        f"Core skills: {core_skills}\n"
        f"ML/Data skills: {ml_skills}\n"
        f"Regions: {regions}\n"
        f"Budget range: {min_budget}-{max_budget} EUR\n"
        f"Preferred contract duration: {duration_min}-{duration_max} months\n"
        f"Required languages: {languages}\n"
        f"Excluded domains: {excluded}"
    )

def normalize_tender_row(row: dict):
    # Text fields
    issuing_authority_display = normalize_text(row["issuing_authority"])
    issuing_authority_match = normalize_for_matching(row["issuing_authority"])

    title_display = normalize_text(row["title"])
    title_match = normalize_for_matching(row["title"])

    project_description_display = normalize_text(row["project_description"])
    project_description_match = normalize_for_matching(row["project_description"])

    # Skills
    required_skills_display, required_skills_match = parse_required_skills(row["required_skills"])

    # Duration
    contract_duration_months = extract_duration_month(row["contract_duration"])

    # Budget
    budget_parsed = parse_budget_range(row["estimated_budget"])
    budget_currency = budget_parsed["currency"]
    budget_min = budget_parsed["min"]
    budget_max = budget_parsed["max"]

    # Dates (already ISO in your dataset, just keep as is)
    publication_date = row["publication_date"].strip()
    submission_deadline = row["submission_deadline"].strip()

    tender_norm = {
        "issuing_authority_display": issuing_authority_display,
        "issuing_authority_match": issuing_authority_match,

        "title_display": title_display,
        "title_match": title_match,

        "project_description_display": project_description_display,
        "project_description_match": project_description_match,

        "required_skills_display": required_skills_display,
        "required_skills_match": required_skills_match,

        "publication_date": publication_date,
        "submission_deadline": submission_deadline,

        "contract_duration_months": contract_duration_months,

        "budget_currency": budget_currency,
        "budget_min": budget_min,
        "budget_max": budget_max,
    }
    for k, v in tender_norm.items():
        tender_norm[k]=normalize_for_matching(str(v))

    tender_norm["tender_match_text"] = build_tender_text(tender_norm)
    # tender_norm["tender_match_text"] = normalize_for_matching(tender_norm["tender_text"])  # utile pour exclusions
    return tender_norm

def load_company_profile(json_path: str):
    with open(json_path, "r", encoding="utf-8") as f:
        p = json.load(f)

    profile = {
        "company_name_display": normalize_text(p["company_name"]),
        "company_name_match": normalize_for_matching(p["company_name"]),

        "focus_domains_display": [normalize_text(x) for x in p["focus_domains"]],
        "focus_domains_match": [normalize_for_matching(x) for x in p["focus_domains"]],

        "secondary_domains_display": [normalize_text(x) for x in p["secondary_domains"]],
        "secondary_domains_match": [normalize_for_matching(x) for x in p["secondary_domains"]],

        "core_skills_display": parse_required_skills(" ".join(p["core_skills"]))[0],
        "core_skills_match": parse_required_skills(" ".join(p["core_skills"]))[1],

        "ml_skills_display": parse_required_skills(" ".join(p["ml_skills"]))[0],
        "ml_skills_match": parse_required_skills(" ".join(p["ml_skills"]))[1],

        "excluded_domains_display": [normalize_text(x) for x in p["excluded_domains"]],
        "excluded_domains_match": [normalize_for_matching(x) for x in p["excluded_domains"]],

        "regions_display": [normalize_text(x) for x in p["regions"]],
        "regions_match": [normalize_for_matching(x) for x in p["regions"]],

        "min_budget_eur": p["min_budget_eur"],
        "max_budget_eur": p["max_budget_eur"],

        "preferred_contract_duration_months": p["preferred_contract_duration_months"],

        "required_language_display": [normalize_text(x) for x in p["required_language"]],
        "required_language_match": [normalize_for_matching(x) for x in p["required_language"]],

        "company_profile_text": normalize_text(p["text"]),
        "company_profile_match_text": normalize_for_matching(p["text"])
    }
    for k, v in profile.items():
        if isinstance(v, str):
            profile[k] = normalize_for_matching(v)
        elif isinstance(v, list):
            profile[k] = [normalize_for_matching(str(x)) for x in v]
    profile["company_profile_match_text"] = build_company_profile_text(profile)
    return profile

def load_and_prepare_tenders(csv_path: str):

    df = pd.read_csv(csv_path)

    normalized_tenders = df.apply(
        lambda row: normalize_tender_row(row.to_dict()),
        axis=1
    )

    tenders_df = pd.DataFrame(normalized_tenders.tolist())

    return tenders_df

def compute_semantic_scores(profile: dict, tenders_df, model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"):
    # 1) Load model
    model = SentenceTransformer(model_name)

    # 2) Encode company profile (1 vector)
    company_text = profile["company_profile_match_text"]
    company_vec = model.encode([company_text], normalize_embeddings=True)  # shape (1, d)

    # 3) Encode tenders (N vectors)
    tender_texts = tenders_df["tender_match_text"].tolist()
    tender_vecs = model.encode(tender_texts, normalize_embeddings=True)    # shape (N, d)

    # 4) Cosine similarity with dot product (because normalized)
    sims = np.dot(tender_vecs, company_vec[0])  # shape (N,)

    # 5) Convert to 0-100 score
    tenders_df = tenders_df.copy()
    tenders_df["semantic_similarity"] = sims
    tenders_df["semantic_score"] = (sims * 100).round(2)

    # 6) Sort by score desc
    tenders_df = tenders_df.sort_values("semantic_score", ascending=False).reset_index(drop=True)

    return tenders_df

profile = load_company_profile("company_data.json")
tenders_df = load_and_prepare_tenders("data.csv")
tenders_with_scores = compute_semantic_scores(profile, tenders_df)
print(tenders_with_scores[["title_display","issuing_authority_display","semantic_score"]].head(10))

def plot_similarity_distribution(df):
    plt.figure()
    plt.hist(df["semantic_score"], bins=20)
    plt.xlabel("Semantic Score")
    plt.ylabel("Number of Tenders")
    plt.title("Distribution of Semantic Similarity Scores")
    plt.show()

def plot_semantic_vs_final(df):
    df = df.copy()
    df["final_score"] = 0.75 * df["semantic_score"]
    plt.figure()
    plt.scatter(df["semantic_score"], df["final_score"])
    plt.xlabel("Semantic Score")
    plt.ylabel("Final Score")
    plt.title("Semantic Score vs Final Score")
    plt.show()

plot_similarity_distribution(tenders_with_scores)
plot_semantic_vs_final(tenders_with_scores)