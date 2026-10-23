print("SecureDocs AI: main.py is loading", flush=True)
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine

# API routers
print("MAIN: importing auth", flush=True)
from app.api.auth import router as auth_router
print("MAIN: importing users", flush=True)
from app.api.users import router as users_router
print("MAIN: importing admin", flush=True)
from app.api.admin import router as admin_router
print("MAIN: importing documents", flush=True)
from app.api.documents import router as documents_router
print("MAIN: importing models", flush=True)
from app.models.documents import Document
from app.models.document_chunk import DocumentChunk

# Import models so SQLAlchemy registers their tables
from app.models.user import User
from app.models.refresh_token import RefreshToken
print("MAIN: all imports completed", flush=True)


app = FastAPI(
    title="SecureDocs AI",
    description="Enterprise Document Intelligence & Knowledge Assistant",
    version="1.0.0",
)

#Base.metadata.create_all(bind=engine)


# CORS Configuration


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        os.getenv("FRONTEND_ORIGIN", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# API Routers

app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(documents_router, prefix="/api")



# Root Route

@app.get("/")
def root():
    return {
        "message": "SecureDocs AI Backend is running",
        "status": "success",
    }


# Health Check

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SecureDocs AI API",
    }
