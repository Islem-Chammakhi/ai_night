from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/smarttender.db")
EMBEDDINGS_PATH = os.getenv("EMBEDDINGS_PATH", "./data/embeddings/")
CVS_PATH = os.getenv("CVS_PATH", "./data/cvs/")

# AI Models config
EMBEDDING_MODEL = "BAAI/bge-m3"
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
GROQ_MODEL = "llama-3.1-8b-instant"

# Matching config
TOP_K_EMBEDDING = 20      # How many CVs to keep after Judge 1
TOP_K_FINAL = 10          # How many CVs to show in final results

# Weights for final score
WEIGHT_EMBEDDING = 0.30
WEIGHT_RERANKER = 0.40
WEIGHT_SKILL = 0.30

MINIMUM_SCORE_THRESHOLD = 0.55