from sqlalchemy import Boolean, Column, DateTime, Integer, String
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    hashed_password = Column(String(255), nullable=False)

    role = Column(
        String(20),
        default="EMPLOYEE",
        nullable=False,
    )

    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    verification_token = Column(String(255), nullable=True)
    verification_token_expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    password_reset_token = Column(String(255), nullable=True)
    password_reset_token_expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )
