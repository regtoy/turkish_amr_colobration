from fastapi import FastAPI

from .config import get_settings
from .database import init_db
from .routers import audit, health, projects, sentences

settings = get_settings()
app = FastAPI(title=settings.app_name)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


app.include_router(health.router)
app.include_router(audit.router)
app.include_router(projects.router)
app.include_router(sentences.router)
