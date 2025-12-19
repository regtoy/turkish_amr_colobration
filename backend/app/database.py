from contextlib import contextmanager
from typing import Iterator

from sqlmodel import Session, SQLModel, create_engine

from .config import get_settings

settings = get_settings()
engine = create_engine(settings.database_url, echo=settings.database_echo, future=True)


def init_db() -> None:
    """Create database tables."""

    SQLModel.metadata.create_all(engine)


@contextmanager
def session_scope() -> Iterator[Session]:
    """Provide a scoped session without managing transactions.

    Transaction boundaries (commit/rollback) should be handled explicitly by callers.
    """
    session = Session(engine)
    try:
        yield session
    finally:
        session.close()


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a database session.

    Callers are responsible for transaction management.
    """
    with session_scope() as session:
        yield session
