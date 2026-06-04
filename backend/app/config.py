import os
from pydantic_settings import BaseSettings

current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
env_path = os.path.join(project_root, ".env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "Autonomous Multi-Agent DevOps & Productivity Platform"
    SECRET_KEY: str = os.getenv("JWT_SECRET", "supersecretkey_devops_platform_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./devops.db")

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "")

    # ChromaDB
    CHROMA_DB_DIR: str = os.getenv("CHROMA_DB_DIR", "./chromadb_storage")

    # API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # Code execution settings
    SANDBOX_DOCKER_IMAGE: str = "python:3.10-slim"
    LOCAL_STORAGE_DIR: str = "./workspace_storage"

    class Config:
        case_sensitive = True
        env_file = env_path
        extra = "ignore"

settings = Settings()

