from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL
import json
import re

client = Groq(api_key=GROQ_API_KEY)


def extract_skills_from_text(text: str) -> list[str]:
    prompt = f"""
Extract all technical skills, programming languages, frameworks, tools,
certifications, and methodologies from the following text.

Return ONLY a valid JSON array of strings.
No explanation, no markdown, no extra text.
Example output: ["Python", "FastAPI", "Docker", "AWS", "Agile"]

Text:
{text[:3000]}
"""
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=500
        )
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        skills = json.loads(raw)
        return [s.strip() for s in skills if isinstance(s, str)]
    except Exception as e:
        print(f"[Skill extraction ERROR]: {type(e).__name__}: {e}")
        return []


def compute_skill_score(
    cv_skills: list[str],
    required_skills: list[str]
) -> tuple[float, list[str], list[str]]:

    if not required_skills:
        return 0.0, [], []

    cv_skills_lower = [s.lower() for s in cv_skills]

    matched = []
    missing = []

    for req_skill in required_skills:
        req_lower = req_skill.lower()
        found = any(
            req_lower in cv_s or cv_s in req_lower
            for cv_s in cv_skills_lower
        )
        if found:
            matched.append(req_skill)
        else:
            missing.append(req_skill)

    score = len(matched) / len(required_skills)
    return round(score, 4), matched, missing