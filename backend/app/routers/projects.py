from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..dependencies import admin_user, CurrentUser
from ..models import Project
from ..schemas import ProjectCreate

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    session: Session = Depends(get_session),
    _: CurrentUser = Depends(admin_user),
) -> Project:
    existing = session.exec(select(Project).where(Project.name == payload.name)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Proje adı kullanılıyor")
    project = Project(**payload.dict())
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@router.get("", response_model=list[Project])
def list_projects(session: Session = Depends(get_session)) -> list[Project]:
    return list(session.exec(select(Project)))
