
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)

    owner_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    original_filename = Column(String(255), nullable=False)

    stored_filename = Column(String(255), unique=True, nullable=False)

    file_path = Column(String(1000), nullable=False)

    file_type = Column(String(20), nullable=False)

    file_size = Column(Integer, nullable=False)

    status = Column(
        String(30),
        nullable=False,
        default="UPLOADED",
    )

    extracted_text = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
