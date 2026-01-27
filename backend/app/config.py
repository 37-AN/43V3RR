from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    postgres_user: str
    postgres_password: str
    postgres_db: str
    postgres_host: str
    postgres_port: int

    vector_db_host: str
    vector_db_port: int

    n8n_base_url: str
    ollama_host: str
    ollama_model: str = "llama3"

    jwt_secret: str
    log_level: str = "INFO"
    frontend_url: str
    fs_sync_root: str = "/app/projects"
    fs_sync_interval_minutes: int = 15

    class Config:
        env_prefix = ""
        case_sensitive = False


settings = Settings()
