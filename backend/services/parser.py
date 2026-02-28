import pdfplumber
import re


def extract_text_from_pdf(file_path: str) -> str:
    raw_lines = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                raw_lines.append(page_text)

    full_text = "\n".join(raw_lines)
    return full_text


def clean_text(text: str) -> str:
    # Remove non-ASCII but keep newlines
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)
    # Collapse multiple spaces but NOT newlines
    text = re.sub(r'[ \t]+', ' ', text)
    # Collapse multiple newlines into max 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def extract_candidate_name(raw_text: str) -> str:
    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]

    for line in lines[:5]:  # Check first 5 lines only
        words = line.split()
        # A name is typically 2-4 words, no numbers, not too long
        if (2 <= len(words) <= 4
                and len(line) < 60
                and not any(char.isdigit() for char in line)
                and not any(c in line for c in ['@', '|', '/', '\\', 'http'])):
            return line

    return "Unknown"