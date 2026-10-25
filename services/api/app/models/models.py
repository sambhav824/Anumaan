import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Date,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True)  # References auth.users UUID
    email = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    language_preference = Column(String(10), nullable=False, default="en")
    avatar_url = Column(String(1024), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    memberships = relationship("OrganizationMember", back_populates="profile", cascade="all, delete-orphan")


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    owner_person = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    business_address = Column(String(1000), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pin_code = Column(String(20), nullable=True)
    gstin = Column(String(30), nullable=True)
    logo_url = Column(String(1024), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="organization", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="organization", cascade="all, delete-orphan")


class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False, default="member")  # owner, admin, member
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_org_member"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="members")
    profile = relationship("Profile", back_populates="memberships")


class Client(Base):
    __tablename__ = "clients"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    contact_person = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    billing_address = Column(String(1000), nullable=True)
    gstin = Column(String(30), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="clients")
    projects = relationship("Project", back_populates="client")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    project_type = Column(String(20), nullable=False)  # building, road
    status = Column(String(20), nullable=False, default="planning")  # planning, in_progress, completed, archived
    site_location = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    description = Column(String(2000), nullable=True)
    start_date = Column(Date, nullable=True)
    quotation_language = Column(String(10), nullable=False, default="en")  # en, mr, hi
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="projects")
    client = relationship("Client", back_populates="projects")
