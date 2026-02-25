"""Configurações do bot via variáveis de ambiente."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # Evolution API
    EVOLUTION_API_URL: str = "http://localhost:8080"
    EVOLUTION_API_KEY: str = "change-me"
    EVOLUTION_INSTANCE_NAME: str = "powerconcept-frotas"

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Bot
    BOT_PORT: int = 8001
    BOT_HOST: str = "0.0.0.0"
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"


settings = Settings()
