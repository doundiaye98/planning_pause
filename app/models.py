from datetime import date, time

from sqlalchemy import Boolean, Date, ForeignKey, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    department: Mapped[str | None] = mapped_column(String(120), nullable=True)
    role: Mapped[str | None] = mapped_column(String(120), nullable=True)
    color: Mapped[str] = mapped_column(String(7), default="#8b5cf6")

    assignments: Mapped[list["BreakAssignment"]] = relationship(
        back_populates="employee", cascade="all, delete-orphan"
    )
    user_account: Mapped["UserAccount | None"] = relationship(
        back_populates="employee",
        uselist=False,
        cascade="all, delete-orphan",
    )


class UserAccount(Base):
    __tablename__ = "user_accounts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20))
    employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=True,
        unique=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    employee: Mapped["Employee | None"] = relationship(back_populates="user_account")


class BreakAssignment(Base):
    __tablename__ = "break_assignments"
    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "day_date",
            "start_time",
            name="uq_employee_day_start",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    day_date: Mapped[date] = mapped_column(Date)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    label: Mapped[str] = mapped_column(String(80), default="Pause")

    employee: Mapped["Employee"] = relationship(back_populates="assignments")
