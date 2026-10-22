
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "SecureDocs AI"
    APP_VERSION: str = "1.0.0"

    DATABASE_URL: str = Field(min_length=1)

    SECRET_KEY: str = Field(min_length=32)
    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, gt=0)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, gt=0)

    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = Field(default=587, gt=0, le=65535)
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""

    FRONTEND_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=True,
    )

    @model_validator(mode="after")
    def validate_secret_key(self):
        if self.SECRET_KEY == "change-this-secret-key":
            raise ValueError(
                "Set a secure SECRET_KEY in your .env file"
            )
        return self


settings = Settings()
