from datetime import date, time

from pydantic import BaseModel, ConfigDict, Field


class EmployeeBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=160)
    email: str | None = Field(None, max_length=200)
    department: str | None = Field(None, max_length=120)
    role: str | None = Field(None, max_length=120)
    color: str = Field(default="#8b5cf6", pattern=r"^#[0-9A-Fa-f]{6}$")


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=160)
    email: str | None = Field(None, max_length=200)
    department: str | None = Field(None, max_length=120)
    role: str | None = Field(None, max_length=120)
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")


class EmployeeRead(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class BreakAssignmentBase(BaseModel):
    day_date: date
    start_time: time
    end_time: time
    label: str = Field(default="Pause", max_length=80)


class BreakAssignmentCreate(BreakAssignmentBase):
    employee_id: int


class BreakAssignmentSelfCreate(BreakAssignmentBase):
    """Créneau pour le collaborateur connecté (sans employee_id)."""

    pass


class BreakAssignmentRead(BreakAssignmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int


class BreakAssignmentWithEmployee(BreakAssignmentRead):
    employee: EmployeeRead


class StatsRead(BaseModel):
    employee_count: int
    assignment_count_today: int
    assignment_count_week: int


class LoginBody(BaseModel):
    email: str = Field(..., min_length=3, max_length=200)
    password: str = Field(..., min_length=1, max_length=200)


class UserMe(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    employee_id: int | None
    employee: EmployeeRead | None = None


class UserAccountCreate(BaseModel):
    email: str = Field(..., min_length=3, max_length=200)
    password: str = Field(..., min_length=6, max_length=200)
    role: str = Field(..., pattern=r"^(admin|employee)$")
    employee_id: int | None = None


class MeSummary(BaseModel):
    employee: EmployeeRead
    assignment_count_today: int
    assignment_count_week: int
