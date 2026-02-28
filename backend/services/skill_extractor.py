from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL
import json
import re

client = Groq(api_key=GROQ_API_KEY)


def _call_groq(prompt: str, max_tokens: int = 1000) -> str:
    """Single reusable Groq call."""
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=max_tokens
    )
    raw = response.choices[0].message.content.strip()
    return re.sub(r"```json|```", "", raw).strip()


def _safe_list(value) -> list:
    """Ensure a value is a list of strings only."""
    if not isinstance(value, list):
        return []
    return [s for s in value if isinstance(s, str)]


def extract_skills_from_text(text: str) -> list[str]:
    prompt = f"""
You are an expert analyst with knowledge across all professional domains.

Analyze the following text and extract ALL signals of competence.
Think broadly — extract not just explicit skills but also implied ones.

Rules:
- Extract the CONCEPT behind the tool, not just the tool name
- Include both the specific skill AND the broader category it belongs to
- Works for ANY domain: tech, business, medicine, law, engineering, finance, etc.

Examples:
- "built REST APIs" → include "API development", "backend development"
- "financial modeling in Excel" → include "financial modeling", "Excel", "data analysis"
- "conducted patient assessments" → include "clinical assessment", "patient care", "healthcare"
- "managed legal contracts" → include "contract management", "legal analysis", "law"
- "led cross-functional teams" → include "team leadership", "project management"

Return ONLY a valid JSON array of strings. No explanation, no markdown.

Text:
{text[:4000]}
"""
    try:
        raw = _call_groq(prompt)
        skills = json.loads(raw)
        return list(set(s.strip() for s in skills if isinstance(s, str)))
    except Exception as e:
        print(f"[Skill extraction ERROR]: {type(e).__name__}: {e}")
        return []


def extract_requirements_profile(requirements_text: str) -> dict:
    prompt = f"""
You are a senior analyst and recruiter with expertise across ALL professional domains.

Read this job/tender requirements text carefully.
Understand what the hiring manager REALLY wants — not just the exact words used.
This could be any domain: technology, medicine, law, finance, engineering, education, etc.

Extract a comprehensive profile and return ONLY a valid JSON object.
No markdown, no explanation, no extra text.

{{
  "required_skills": [
    "every explicit skill, tool, certification, or competency mentioned",
    "also include the CONCEPT behind each requirement",
    "expand abbreviations and technical shorthand",
    "example tech: 'containerization' → add 'Docker', 'Kubernetes'",
    "example finance: 'financial modeling' → add 'Excel', 'forecasting', 'valuation'",
    "example medical: 'patient triage' → add 'clinical assessment', 'emergency care'",
    "example legal: 'due diligence' → add 'contract review', 'legal research'"
  ],
  "domain": "single main domain of this job — be specific, e.g. 'software backend development', 'financial analysis', 'clinical medicine', 'civil engineering', 'marketing', 'legal consulting', 'data science'",
  "experience_level": "junior / mid / senior / expert",
  "keywords": [
    "key concepts and problems this person will solve",
    "industry-specific terminology for this domain",
    "synonyms and related terms for the main requirements",
    "what TYPE of person succeeds in this role"
  ],
  "certifications": ["any required certifications, licenses, or qualifications"],
  "implied_skills": [
    "skills NOT explicitly mentioned but clearly required for this role",
    "think about what every professional in this domain must know",
    "example: DevOps role implies Linux, networking, scripting",
    "example: financial analyst implies Excel, data analysis, reporting",
    "example: doctor implies diagnosis, patient communication, medical ethics",
    "example: lawyer implies legal research, writing, negotiation"
  ]
}}

Requirements text:
{requirements_text[:3000]}
"""
    try:
        raw = _call_groq(prompt, max_tokens=1000)
        profile = json.loads(raw)
        for key in ["required_skills", "keywords", "certifications", "implied_skills"]:
            profile[key] = _safe_list(profile.get(key, []))
        return profile
    except Exception as e:
        print(f"[Requirements extraction ERROR]: {type(e).__name__}: {e}")
        return {
            "required_skills": [],
            "domain": "",
            "experience_level": "",
            "keywords": [],
            "certifications": [],
            "implied_skills": []
        }


def extract_cv_profile(cv_text: str) -> dict:
    prompt = f"""
You are a senior analyst reviewing a candidate's CV.
This could be any profession: software engineer, doctor, lawyer, accountant, teacher, etc.

Read the CV carefully and extract a comprehensive profile.
Think beyond exact words — understand what the candidate can ACTUALLY do.

Return ONLY a valid JSON object. No markdown, no explanation, no extra text.

{{
  "skills": [
    "every skill, tool, technology, or competency mentioned anywhere in the CV",
    "include the specific skill AND the broader category it belongs to",
    "tech example: 'Docker' → also add 'containerization', 'infrastructure'",
    "finance example: 'DCF modeling' → also add 'financial modeling', 'valuation'",
    "medical example: 'ECG interpretation' → also add 'cardiology', 'diagnostics'",
    "legal example: 'contract drafting' → also add 'legal writing', 'contract law'"
  ],
  "domain": "single main domain this candidate specializes in — be specific, e.g. 'software backend development', 'financial analysis', 'clinical medicine', 'civil engineering', 'marketing', 'data science'",
  "experience_keywords": [
    "what did they BUILD, ACHIEVE, or DELIVER in their experience",
    "what PROBLEMS did they solve",
    "what was the IMPACT of their work",
    "use action concepts: 'built payment systems', 'diagnosed patients', 'managed legal cases'"
  ],
  "project_keywords": [
    "for EACH project or case study: what was it and what skills were used",
    "extract the DOMAIN and PURPOSE of each project",
    "example: 'AI wellness app' → 'AI application development', 'health tech', 'generative AI'",
    "example: 'M&A due diligence' → 'financial analysis', 'legal review', 'corporate finance'"
  ],
  "certifications": [
    "all certifications, licenses, degrees, awards, hackathon wins"
  ],
  "implied_capabilities": [
    "what can this person CLEARLY do based on evidence in the CV",
    "infer capabilities from their tools and experience",
    "tech: React + Next.js + Tailwind → 'responsive UI development', 'modern frontend'",
    "finance: Excel + PowerBI + SQL → 'data-driven reporting', 'business intelligence'",
    "medical: 5 years hospital + surgery → 'surgical procedures', 'clinical decision making'"
  ]
}}

CV text:
{cv_text[:4000]}
"""
    try:
        raw = _call_groq(prompt, max_tokens=1000)
        profile = json.loads(raw)
        for key in ["skills", "experience_keywords", "project_keywords",
                    "certifications", "implied_capabilities"]:
            profile[key] = _safe_list(profile.get(key, []))
        return profile
    except Exception as e:
        print(f"[CV profile extraction ERROR]: {type(e).__name__}: {e}")
        return {
            "skills": [],
            "domain": "",
            "experience_keywords": [],
            "project_keywords": [],
            "certifications": [],
            "implied_capabilities": []
        }


# ─────────────────────────────────────────────────────
# UNIVERSAL SYNONYM MAP — all professional domains
# ─────────────────────────────────────────────────────
SYNONYM_MAP: dict[str, list[str]] = {

    # ── SOFTWARE / TECH ──────────────────────────────
    "containerization": ["docker", "kubernetes", "k8s", "docker swarm", "container"],
    "container orchestration": ["kubernetes", "docker swarm", "k8s"],
    "docker": ["containerization", "container", "docker swarm", "devops"],
    "cloud infrastructure": ["aws", "azure", "gcp", "cloud", "ec2", "s3", "infrastructure"],
    "cloud": ["aws", "azure", "gcp", "heroku", "vercel", "cloud infrastructure"],
    "aws": ["cloud", "amazon web services", "cloud infrastructure"],
    "devops": ["docker", "ci/cd", "jenkins", "github actions", "linux", "infrastructure"],
    "ci/cd": ["github actions", "jenkins", "gitlab ci", "devops", "pipeline", "automation"],
    "backend development": ["spring boot", "nest.js", "express", "fastapi", "django", "rest api"],
    "rest api": ["api development", "backend development", "spring boot", "fastapi", "nest.js"],
    "api design": ["rest api", "api development", "graphql", "backend development"],
    "microservices": ["spring boot", "nest.js", "docker", "backend development", "distributed systems"],
    "frontend development": ["react.js", "next.js", "vue", "angular", "ui development", "html", "css"],
    "ui development": ["react.js", "next.js", "tailwind", "frontend development", "css"],
    "machine learning": ["tensorflow", "pytorch", "scikit-learn", "ai", "deep learning", "ml"],
    "deep learning": ["tensorflow", "pytorch", "neural network", "machine learning", "ai"],
    "ai development": ["tensorflow", "generative ai", "ai apis", "machine learning", "llm", "openai"],
    "generative ai": ["ai apis", "llm", "openai", "gpt", "ai development", "chatbot"],
    "database management": ["postgresql", "mysql", "mongodb", "sql", "database", "orm"],
    "sql": ["postgresql", "mysql", "database", "sql server", "query optimization"],
    "version control": ["git", "github", "gitlab", "bitbucket", "source control"],
    "monitoring": ["prometheus", "grafana", "observability", "logging", "alerting"],
    "linux systems": ["linux", "shell scripting", "bash", "ubuntu", "unix", "command line"],
    "shell scripting": ["bash", "linux", "scripting", "automation", "python scripting"],
    "networking": ["tcp/ip", "dns", "http", "network security", "linux", "firewall"],
    "agile": ["scrum", "kanban", "sprint", "jira", "agile development", "iterative development"],
    "clean architecture": ["solid principles", "design patterns", "software architecture", "oop"],
    "javascript": ["typescript", "node.js", "react.js", "next.js", "js", "es6"],
    "python": ["django", "fastapi", "tensorflow", "pandas", "scripting", "data analysis"],
    "java": ["spring boot", "hibernate", "maven", "gradle", "oop"],
    "cybersecurity": ["penetration testing", "network security", "firewall", "security"],
    "penetration testing": ["kali linux", "metasploit", "security testing", "cybersecurity"],
    "responsive design": ["tailwind", "css", "frontend development", "ui development"],
    "testing": ["unit testing", "integration testing", "qa", "test automation", "jest", "junit"],
    "data structures": ["algorithms", "computer science", "problem solving", "programming"],

    # ── FINANCE / ACCOUNTING ─────────────────────────
    "financial modeling": ["excel", "dcf", "valuation", "forecasting", "financial analysis"],
    "financial analysis": ["financial modeling", "excel", "ratio analysis", "reporting", "budgeting"],
    "valuation": ["dcf", "financial modeling", "m&a", "investment analysis", "corporate finance"],
    "corporate finance": ["m&a", "valuation", "capital markets", "investment banking", "financial modeling"],
    "accounting": ["gaap", "ifrs", "bookkeeping", "financial reporting", "tax", "audit"],
    "audit": ["internal audit", "external audit", "financial review", "compliance", "accounting"],
    "tax": ["tax planning", "tax compliance", "accounting", "financial reporting"],
    "risk management": ["financial risk", "credit risk", "market risk", "compliance", "risk assessment"],
    "investment analysis": ["portfolio management", "equity research", "valuation", "financial modeling"],
    "budgeting": ["financial planning", "forecasting", "cost analysis", "financial modeling"],
    "excel": ["financial modeling", "data analysis", "pivot tables", "vba", "spreadsheet"],
    "powerbi": ["business intelligence", "data visualization", "reporting", "analytics"],
    "bloomberg": ["financial data", "market analysis", "investment research", "trading"],
    "bookkeeping": ["accounting", "accounts payable", "accounts receivable", "financial records"],
    "ifrs": ["accounting standards", "financial reporting", "gaap", "accounting"],
    "gaap": ["accounting standards", "financial reporting", "ifrs", "accounting"],

    # ── MEDICINE / HEALTHCARE ─────────────────────────
    "clinical assessment": ["patient evaluation", "diagnosis", "triage", "medical examination"],
    "patient care": ["clinical assessment", "nursing", "bedside manner", "healthcare"],
    "diagnosis": ["clinical assessment", "medical imaging", "lab interpretation", "differential diagnosis"],
    "surgery": ["surgical procedures", "operating room", "clinical skills", "anatomy"],
    "pharmacology": ["drug therapy", "medication management", "clinical pharmacology", "prescribing"],
    "medical research": ["clinical trials", "evidence-based medicine", "research methodology"],
    "emergency care": ["triage", "resuscitation", "acute care", "patient stabilization"],
    "healthcare management": ["hospital administration", "patient flow", "clinical operations"],
    "nursing": ["patient care", "clinical skills", "medication administration", "healthcare"],
    "radiology": ["medical imaging", "mri", "ct scan", "x-ray", "diagnostics"],
    "physical therapy": ["rehabilitation", "physiotherapy", "patient care", "musculoskeletal"],

    # ── LAW / LEGAL ───────────────────────────────────
    "legal research": ["case law", "statutory interpretation", "legal writing", "litigation"],
    "contract law": ["contract drafting", "contract review", "legal agreements", "negotiation"],
    "litigation": ["court proceedings", "legal arguments", "case preparation", "trial"],
    "due diligence": ["legal review", "contract analysis", "corporate law", "m&a"],
    "compliance": ["regulatory compliance", "legal compliance", "risk management", "governance"],
    "intellectual property": ["ip law", "patent", "trademark", "copyright"],
    "corporate law": ["m&a", "due diligence", "corporate governance", "securities law"],
    "negotiation": ["contract negotiation", "mediation", "dispute resolution", "communication"],
    "legal writing": ["contract drafting", "legal research", "brief writing", "documentation"],
    "regulatory affairs": ["compliance", "fda", "regulatory submissions", "legal compliance"],

    # ── ENGINEERING ───────────────────────────────────
    "mechanical engineering": ["cad", "solidworks", "autocad", "thermodynamics", "manufacturing"],
    "civil engineering": ["structural analysis", "autocad", "construction management", "geotechnical"],
    "electrical engineering": ["circuit design", "pcb", "embedded systems", "signal processing"],
    "embedded systems": ["c programming", "microcontrollers", "rtos", "firmware", "can bus"],
    "cad design": ["solidworks", "autocad", "catia", "3d modeling", "engineering drawing"],
    "quality assurance": ["testing", "qa", "iso", "quality control", "compliance"],
    "manufacturing": ["production", "lean manufacturing", "six sigma", "quality control"],
    "structural analysis": ["finite element analysis", "fea", "civil engineering", "stress analysis"],
    "autocad": ["cad design", "mechanical engineering", "civil engineering", "drafting"],
    "solidworks": ["cad design", "3d modeling", "mechanical engineering", "product design"],

    # ── MARKETING / BUSINESS ─────────────────────────
    "digital marketing": ["seo", "social media", "google ads", "content marketing", "analytics"],
    "seo": ["search engine optimization", "keyword research", "content marketing", "digital marketing"],
    "content marketing": ["copywriting", "content creation", "seo", "social media", "blogging"],
    "data analytics": ["sql", "python", "excel", "tableau", "powerbi", "business intelligence"],
    "business development": ["sales", "partnership", "strategy", "market research", "crm"],
    "product management": ["roadmap", "agile", "user research", "product strategy", "stakeholders"],
    "market research": ["data analysis", "consumer insights", "competitive analysis", "surveys"],
    "crm": ["salesforce", "hubspot", "customer relationship", "sales", "business development"],
    "copywriting": ["content writing", "marketing", "communication", "content creation"],
    "brand management": ["marketing", "brand strategy", "advertising", "communications"],

    # ── EDUCATION / TRAINING ─────────────────────────
    "curriculum development": ["lesson planning", "instructional design", "teaching", "education"],
    "teaching": ["curriculum development", "classroom management", "student assessment", "pedagogy"],
    "training": ["facilitation", "instructional design", "learning development", "coaching"],
    "e-learning": ["lms", "instructional design", "online education", "content development"],
    "coaching": ["mentoring", "training", "leadership development", "performance management"],

    # ── DATA SCIENCE ─────────────────────────────────
    "data science": ["machine learning", "python", "statistics", "data analysis", "modeling"],
    "data analysis": ["python", "sql", "excel", "statistics", "data visualization", "pandas"],
    "data visualization": ["tableau", "powerbi", "matplotlib", "seaborn", "reporting"],
    "statistics": ["data analysis", "hypothesis testing", "regression", "probability"],
    "big data": ["hadoop", "spark", "data engineering", "etl", "data pipeline"],
    "etl": ["data pipeline", "data engineering", "sql", "data transformation"],

    # ── SOFT SKILLS (universal) ───────────────────────
    "leadership": ["team management", "team lead", "mentoring", "decision making", "management"],
    "communication": ["presentation", "public speaking", "writing", "stakeholder management"],
    "problem solving": ["analytical thinking", "critical thinking", "troubleshooting", "innovation"],
    "teamwork": ["collaboration", "cross-functional", "team player", "interpersonal skills"],
    "project management": ["planning", "coordination", "delivery", "agile", "pmp"],
    "research": ["data collection", "analysis", "literature review", "methodology", "reporting"],
    "writing": ["technical writing", "report writing", "documentation", "communication"],
    "presentation": ["public speaking", "communication", "powerpoint", "storytelling"],
    "time management": ["organization", "prioritization", "efficiency", "deadline management"],
    "critical thinking": ["problem solving", "analytical thinking", "decision making"],
}


def _check_synonyms(req_signal: str, cv_signals: set[str]) -> bool:
    """
    Universal semantic synonym check.
    Works across all professional domains.
    """
    req_lower = req_signal.lower().strip()

    # Direct synonym lookup
    synonyms = SYNONYM_MAP.get(req_lower, [])
    for synonym in synonyms:
        if any(synonym in cv_s or cv_s in synonym for cv_s in cv_signals):
            return True

    # Reverse lookup — check if any cv_signal maps to req_signal
    for cv_s in cv_signals:
        cv_synonyms = SYNONYM_MAP.get(cv_s, [])
        if req_lower in cv_synonyms:
            return True
        if any(req_lower in syn or syn in req_lower for syn in cv_synonyms):
            return True

    return False


def compute_full_profile_score(
    cv_profile: dict,
    req_profile: dict
) -> tuple[float, list[str], list[str]]:
    """
    Universal semantic scoring.
    Works for any professional domain.
    Uses 4 matching strategies + synonym map + domain bonus.
    """

    # Build CV signal pool — strings only
    cv_signals: set[str] = set()
    for key in ["skills", "experience_keywords", "project_keywords",
                "certifications", "implied_capabilities"]:
        for s in cv_profile.get(key, []):
            if isinstance(s, str):
                cv_signals.add(s.lower().strip())
    if cv_profile.get("domain") and isinstance(cv_profile["domain"], str):
        cv_signals.add(cv_profile["domain"].lower().strip())

    # Build requirements signal pool — strings only
    req_signals: set[str] = set()
    for key in ["required_skills", "keywords", "certifications", "implied_skills"]:
        for s in req_profile.get(key, []):
            if isinstance(s, str):
                req_signals.add(s.lower().strip())

    if not req_signals:
        return 0.0, [], []

    matched = []
    missing = []

    for req_signal in req_signals:
        req_words = set(req_signal.split())

        # Strategy 1: Exact match
        exact = req_signal in cv_signals

        # Strategy 2: Substring match
        substring = any(
            req_signal in cv_s or cv_s in req_signal
            for cv_s in cv_signals
        )

        # Strategy 3: Word overlap (50%+ words in common)
        word_overlap = False
        if len(req_words) > 1:
            word_overlap = any(
                len(req_words & set(cv_s.split())) / max(len(req_words), 1) >= 0.5
                for cv_s in cv_signals
            )

        # Strategy 4: Universal synonym map
        synonym_match = _check_synonyms(req_signal, cv_signals)

        if exact or substring or word_overlap or synonym_match:
            matched.append(req_signal)
        else:
            missing.append(req_signal)

    # Domain bonus — domains align = +20%
    domain_bonus = 0.0
    cv_domain = cv_profile.get("domain", "")
    req_domain = req_profile.get("domain", "")

    if (isinstance(cv_domain, str) and isinstance(req_domain, str)
            and cv_domain and req_domain):
        cv_d = cv_domain.lower()
        req_d = req_domain.lower()
        cv_words_d = set(cv_d.split())
        req_words_d = set(req_d.split())
        overlap = cv_words_d & req_words_d

        if overlap or cv_d in req_d or req_d in cv_d:
            domain_bonus = 0.20
            print(f"  [Domain MATCH] '{cv_d}' ↔ '{req_d}' → +20%")

    base_score = len(matched) / len(req_signals)
    final_score = min(1.0, base_score + domain_bonus)

    return round(final_score, 4), matched, missing