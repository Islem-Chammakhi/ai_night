from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL
import json
import re

client = Groq(api_key=GROQ_API_KEY)


def extract_skills_from_text(text: str) -> list[str]:
    prompt = f"""
You are an expert HR analyst. Analyze the following CV or job requirements text carefully.

Extract ALL of the following into a single JSON array:
- Technical skills (programming languages, frameworks, libraries, tools)
- Domain knowledge (e.g. cybersecurity, machine learning, embedded systems, DevOps)
- Methodologies (e.g. Agile, Scrum, TDD, CI/CD)
- Certifications (e.g. CISSP, AWS Certified, PMP)
- Soft skills (e.g. teamwork, leadership, communication)
- Keywords from project descriptions and experience (e.g. REST API, microservices, real-time systems)
- Any technology or tool mentioned ANYWHERE in the text

Return ONLY a valid JSON array of strings. No explanation, no markdown, no extra text.
Example: ["Python", "REST API", "Docker", "Agile", "machine learning", "cybersecurity", "CISSP"]

Text to analyze:
{text[:4000]}
"""
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=800
        )
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        skills = json.loads(raw)
        return [s.strip() for s in skills if isinstance(s, str)]
    except Exception as e:
        print(f"[Skill extraction ERROR]: {type(e).__name__}: {e}")
        return []


def extract_requirements_profile(requirements_text: str) -> dict:
    prompt = f"""
You are an expert HR analyst reading a job requirements document.

Extract the following and return ONLY a valid JSON object. No markdown, no explanation.

{{
  "required_skills": ["list of all required technical skills, tools, frameworks, APIs"],
  "domain": "main domain (e.g. AI development, backend development, web development, DevOps, cybersecurity)",
  "experience_level": "junior / mid / senior",
  "keywords": ["important domain keywords that indicate expertise in this field"],
  "certifications": ["any required certifications or qualifications"]
}}

IMPORTANT:
- For AI jobs: include keywords like generative AI, machine learning, AI APIs, deep learning
- For backend jobs: include keywords like microservices, containerization, CI/CD
- Be comprehensive — missing a keyword means a qualified candidate might be missed

Requirements text:
{requirements_text[:3000]}
"""
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=600
        )
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        profile = json.loads(raw)
        return profile
    except Exception as e:
        print(f"[Requirements extraction ERROR]: {type(e).__name__}: {e}")
        return {
            "required_skills": [],
            "domain": "",
            "experience_level": "",
            "keywords": [],
            "certifications": []
        }


def extract_cv_profile(cv_text: str) -> dict:
    prompt = f"""
You are an expert HR analyst reading a candidate CV.

Extract the following and return ONLY a valid JSON object. No markdown, no explanation.

{{
  "skills": ["ALL technical skills, tools, frameworks mentioned anywhere in the CV"],
  "domain": "main domain of the candidate (e.g. web development, AI development, DevOps, backend development)",
  "experience_keywords": ["keywords from experience section — what they built, what problems they solved"],
  "project_keywords": ["ALL technologies, APIs, tools and concepts mentioned in EVERY project description"],
  "certifications": ["any certifications or awards mentioned, including hackathon wins"]
}}

IMPORTANT: 
- Extract skills from EVERY section: skills section, experience, projects, summary
- If a project uses an AI API or generative AI tool, include it explicitly
- Include hackathon participation as a keyword
- Do not miss any technology mentioned anywhere in the text

CV text:
{cv_text[:4000]}
"""
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=800
        )
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        profile = json.loads(raw)
        return profile
    except Exception as e:
        print(f"[CV profile extraction ERROR]: {type(e).__name__}: {e}")
        return {
            "skills": [],
            "domain": "",
            "experience_keywords": [],
            "project_keywords": [],
            "certifications": []
        }


def compute_full_profile_score(
    cv_profile: dict,
    req_profile: dict
) -> tuple[float, list[str], list[str]]:

    # Collect all CV signals — use set to avoid duplicates
    cv_all_signals = set()
    for s in cv_profile.get("skills", []):
        cv_all_signals.add(s.lower())
    for s in cv_profile.get("experience_keywords", []):
        cv_all_signals.add(s.lower())
    for s in cv_profile.get("project_keywords", []):
        cv_all_signals.add(s.lower())
    for s in cv_profile.get("certifications", []):
        cv_all_signals.add(s.lower())
    if cv_profile.get("domain"):
        cv_all_signals.add(cv_profile["domain"].lower())

    # Collect all required signals — use set to avoid duplicates
    req_all_signals = set()
    for s in req_profile.get("required_skills", []):
        req_all_signals.add(s.lower())
    for s in req_profile.get("keywords", []):
        req_all_signals.add(s.lower())
    for s in req_profile.get("certifications", []):
        req_all_signals.add(s.lower())

    if not req_all_signals:
        return 0.0, [], []

    matched = []
    missing = []

    for req_signal in req_all_signals:
        found = any(
            req_signal in cv_s or cv_s in req_signal
            for cv_s in cv_all_signals
        )
        if found:
            matched.append(req_signal)
        else:
            missing.append(req_signal)

    # Domain bonus
    domain_bonus = 0.0
    cv_domain = cv_profile.get("domain", "").lower()
    req_domain = req_profile.get("domain", "").lower()
    if cv_domain and req_domain and (
        cv_domain in req_domain or req_domain in cv_domain
    ):
        domain_bonus = 0.20
        print(f"  [Domain MATCH] '{cv_domain}' ↔ '{req_domain}' → +20% bonus")

    base_score = len(matched) / len(req_all_signals)
    final_score = min(1.0, base_score + domain_bonus)

    return round(final_score, 4), matched, missing


def compute_full_profile_score(
    cv_profile: dict,
    req_profile: dict
) -> tuple[float, list[str], list[str]]:
    """
    Deep scoring that compares CV profile against requirements profile.
    Considers skills + domain match + experience keywords + project keywords.
    """

    # Collect all CV signals into one pool
    cv_all_signals = []
    cv_all_signals += [s.lower() for s in cv_profile.get("skills", [])]
    cv_all_signals += [s.lower() for s in cv_profile.get("experience_keywords", [])]
    cv_all_signals += [s.lower() for s in cv_profile.get("project_keywords", [])]
    cv_all_signals += [s.lower() for s in cv_profile.get("certifications", [])]
    if cv_profile.get("domain"):
        cv_all_signals.append(cv_profile["domain"].lower())

    # Collect all required signals into one pool
    req_all_signals = []
    req_all_signals += [s.lower() for s in req_profile.get("required_skills", [])]
    req_all_signals += [s.lower() for s in req_profile.get("keywords", [])]
    req_all_signals += [s.lower() for s in req_profile.get("certifications", [])]

    if not req_all_signals:
        return 0.0, [], []

    matched = []
    missing = []

    for req_signal in req_all_signals:
        found = any(
            req_signal in cv_s or cv_s in req_signal
            for cv_s in cv_all_signals
        )
        if found:
            matched.append(req_signal)
        else:
            missing.append(req_signal)

    # Domain bonus — if domains match give extra 20% boost
    domain_bonus = 0.0
    cv_domain = cv_profile.get("domain", "").lower()
    req_domain = req_profile.get("domain", "").lower()
    if cv_domain and req_domain and (
        cv_domain in req_domain or req_domain in cv_domain
    ):
        domain_bonus = 0.20
        print(f"  [Domain MATCH] '{cv_domain}' ↔ '{req_domain}' → +20% bonus")

    base_score = len(matched) / len(req_all_signals)
    final_score = min(1.0, base_score + domain_bonus)

    return round(final_score, 4), matched, missing