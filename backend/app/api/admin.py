from fastapi import APIRouter, Depends

from app.core.dependencies import require_role
from app.models.user import User


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


@router.get("/test")
def admin_test(
    current_user: User = Depends(require_role("ADMIN")),
):
    return {
        "message": "Welcome Admin",
        "user": current_user.name,
        "role": current_user.role,
    }
@router.get("/manager-test")
def manager_test(
    current_user: User = Depends(require_role("MANAGER")),
):
    return {
        "message": "Welcome Manager",
        "user": current_user.name,
        "role": current_user.role,
    }

@router.get("/employee-test")
def employee_test(
    current_user: User = Depends(require_role("EMPLOYEE")),
):
    return {
        "message": "Welcome Employee",
        "user": current_user.name,
        "role": current_user.role,
    }