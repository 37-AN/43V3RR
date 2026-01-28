from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    test_database_url: str | None = None

    vector_db_host: str
    vector_db_port: int

    n8n_base_url: str
    n8n_url: str | None = None
    n8n_api_key: str | None = None
    ollama_host: str
    ollama_model: str = "llama3"

    jwt_secret: str
    log_level: str = "INFO"
    frontend_url: str
    fs_sync_root: str = "/app/projects"
    fs_sync_interval_minutes: int = 15

    model_config = SettingsConfigDict(env_prefix="", case_sensitive=False)


settings = Settings()
