from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

print("DATABASE: starting import", flush=True)

from app.core.config import settings

print("DATABASE: config loaded", flush=True)


engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 10},
)
print("DATABASE: engine created", flush=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()
print("DATABASE: module loaded successfully", flush=True)
