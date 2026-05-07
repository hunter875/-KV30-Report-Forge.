from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg2://app:app@localhost:5432/app"
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    class Config:
        env_file = ".env"


settings = Settings()