# SmartTender AI

**SmartTender AI** is an intelligent, automated platform built to streamline and supercharge the tendering workflow. From automatically detecting relevant public tenders that align with a company's profile, to parsing and scoring candidate CVs against specific job or tender requirements, SmartTender AI acts as a smart assistant to augment your organizational reach and capabilities.

## 🚀 Key Features

*   **Smart Tender Detection:** Scans a dataset of public tenders and intelligently matches them against your company profile (focus domains, core skills, regions, budgets, and excluded domains), using semantic search (Embeddings) to surface the best opportunities.
*   **CV-to-Requirement Matching:** An AI-fueled CV parsing engine that digests multiple PDF candidate resumes, extracts hard skills via LLMs (Groq / Llama 3), calculates semantic similarity between the candidate and the job requirements, and ranks the candidates.
*   **Intuitive Dashboards:** A sleek, dark-themed dashboard built with modern web technologies that offers visual KPIs, matching scores, near-miss suggestions, and interactive filtering.

---

## 🏗 System Architecture

The project is split into two main sections: a **FastAPI backend** handling the AI processing and a **Next.js frontend** powering the sleek user interface.

### 1. Backend (Python & FastAPI)
Located in the `backend/` directory.

The backend exposes RESTful APIs to handle document uploads, run AI pipelines, trigger the LLM for skill extraction, and query the local SQLite database.

**Core Tech Stack & Processes:**
*   **FastAPI:** High-performance API framework providing RESTful endpoints for the frontend.
*   **SQLAlchemy & SQLite:** Database management to persist Job descriptions, CV paths, extracted texts, and structured candidate skills. The database allows for persistent session history so previous matching jobs can be revisited.
*   **Sentence-Transformers:** (`BAAI/bge-m3` for CV text mapping, `paraphrase-multilingual-MiniLM-L12-v2` for Tender mapping) Generates dense vector embeddings. Once text is converted to vectors, we use FAISS to rapidly compute similarity scores against requirements.
*   **Cross-Encoders:** (`ms-marco-MiniLM-L-6-v2`) Used to rerank the top retrieved candidates for higher accuracy in CV matching. It analyzes the specific relation between a job description and a CV.
*   **Groq API (Llama-3.1-8b-instant):** Leverages blazing-fast LLM inference to accurately extract specific technical skills, programming languages, and competencies directly from raw CV text. It outputs this data dynamically as structured JSON which the app uses for skill overlap scoring.
*   **PyMuPDF (`fitz`):** Reads and parses raw text structure directly from candidate PDF files immediately after upload.

**Running the Backend:**
1. Navigate to the `backend/` directory.
2. Install dependencies (e.g., via `pip install -r requirements.txt` if available).
3. Review `config.py` (API keys and paths are stored securely here).
4. Run the server:
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```
5. The API docs will be available at `http://localhost:8000/docs`.

### 2. Frontend (Next.js & React)
Located in the `front/` directory.

The React frontend handles the presentation layer. It provides smooth animations (Framer Motion), interactive components (Radix UI), and data fetching (Axios).

**Core Tech Stack & Architecture:**
*   **Next.js 15 (App Router):** The React framework used for server-side structure, utilizing the App directory structure (`/app`) for organized routing (e.g., Marketing pages vs Dashboard).
*   **Tailwind CSS (v4):** Functional CSS classes for rapid UI building, establishing a visually rich "dark mode" interface natively.
*   **Framer Motion:** Used heavily in the marketing pages (like the Hero section and Navbar) for sophisticated fade-ins, stagger effects, and smooth layout transitions.
*   **Radix UI / shadcn/ui:** Unstyled, accessible component primitives. We use these for complex interactive elements like Modals (Dialogs), dropdowns, and sliders, ensuring semantic correctness and accessibility.
*   **Zustand (or React Context/Hooks):** State management handling active jobs, CV lists, and matching results dynamically across components without unnecessary prop drilling.
*   **Lucide React:** Beautiful, consistent SVG icons used across metric cards and buttons.
*   **Axios:** HTTP client configured to communicate with the FastAPI backend, utilizing interceptors for streamlined API calls.

**Running the Frontend:**
1. Navigate to the `front/` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the application at `http://localhost:3000`.

---

## 📂 Project Structure

```text
ai_night/
├── backend/                  # Python FastAPI application
│   ├── config.py             # Global configurations & hardcoded keys/paths
│   ├── database.py           # SQLite connection & SQLAlchemy base
│   ├── main.py               # Application entry point & health checks
│   ├── data/                 # JSON, CSV, Embeddings arrays, SQLite DB, and uploaded CVs
│   ├── models/               # Pydantic models for request/response & SQLAlchemy schemas
│   ├── routers/              # API Endpoints (cvs, matching, tenders)
│   └── services/             # Core logic (PDF parsing, embedder, reranker, LLM skill extraction, tender matching)
│
└── front/                    # Next.js React frontend
    ├── next.config.ts        # Next.js configuration
    ├── package.json          # Node dependencies
    ├── src/
    │   ├── app/              # Next.js App routing (marketing landing page, dashboard, tenders)
    │   ├── components/       # Reusable UI elements (Hero, KPI cards, navigation, etc.)
    │   ├── constants/        # Fixed data assets (Links, base definitions)
    │   ├── lib/              # Utility functions (Tailwind merge integration, formatting)
    │   ├── services/         # API abstraction (Axios wrappers calling localhost:8000)
    │   └── types/            # TypeScript interfaces aligned with Backend schemas
    └── public/               # Static assets (images, icons)
```

## 🧠 AI Pipeline Summary

1. **Information Extraction:** When a CV is uploaded, the backend extracts the raw text. Groq's superfast Llama 3 model is instructed to parse this unstructured text and return a structured JSON containing technical skills.
2. **Semantic Matching (Stage 1):** Both the requirement string (or company profile) and the document strings are embedded into a vector space using state-of-the-art embedding models. A dot-product/cosine-similarity search gives an initial score.
3. **Semantic Reranking (Stage 2 - CVs only):** The top candidates from the embedding phase are passed through a Cross-Encoder. This tests the direct logical semantic relation between the job requirement and the candidate's experience.
4. **Final Scoring:** The system calculates a weighted average of Semantic Similarity, Reranker Score, and Direct Skill Overlap to offer a normalized `0 to 100` score.

---

## 🔄 User Journey & Key Workflows

### Workflow 1: CV-to-Requirement Matching
1. **Create a Job:** The user navigates to the 'CV Matcher' dashboard and clicks "Add Job", typing out the specific requirements for a role.
2. **Upload CVs:** The user drags-and-drops a batch of PDF CVs into the newly created job panel.
3. **Processing (Backend):** 
   - The frontend sends the PDFs to the FastAPI backend.
   - `PyMuPDF` extracts the raw text.
   - `Groq` LLM pulls out the specific skills as JSON.
   - The document is saved in the SQLite Database.
4. **Execution & Results:** The user clicks "Run CV Matching". The backend vectorizes the text, compares it via `sentence-transformers`, reranks the top results, and returns an ordered list. The frontend instantly categorizes candidates into "Strong Matches" and "Near Misses".

### Workflow 2: Smart Tender Detection
1. **Configure Profile:** The backend relies on a predefined company profile containing relevant domains, excluded keywords, and budgets.
2. **Filter & Search:** The user visits the 'Tender Detection' page and uses interactive sliders to set minimum scores and result limits.
3. **Semantic Discovery:** The backend embeds the company profile, compares it against the pre-embedded tender dataset via cosine similarity, filtering out explicitly excluded domains (unless toggled).
4. **Insights:** Tenders are displayed visually with a score ring, alongside deadlines, budget requirements, and specific skill tags dynamically generated by the system.

---

## 🛠 Troubleshooting

* **Backend not reachable (CORS or Error):** Make sure the FastAPI backend is running on port `8000`. The frontend specifically looks for `http://localhost:8000`. 
* **Missing Models on first run:** The first time you trigger endpoints that invoke `sentence-transformers`, downloading the models to your machine may take some time depending on your internet connection.
* **Environment Configuration:** Check `backend/config.py` to ensure valid API key values (e.g. `GROQ_API_KEY`) are present, as the `.env` paradigm has been securely embedded here per design.
