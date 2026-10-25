import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Numeric,
    JSON,
    Boolean,
    Column,
    String,
    DateTime,
    ForeignKey,
    Date,
    UniqueConstraint,
    Index,
    func,
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
    created_by = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="organization", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="organization", cascade="all, delete-orphan")
    estimates = relationship("Estimate", back_populates="organization", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="organization", cascade="all, delete-orphan")



Index("uq_org_created_by_lower_name", Organization.created_by, func.lower(Organization.name), unique=True)

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
    quotations = relationship("Quotation", back_populates="client")


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
    estimates = relationship("Estimate", back_populates="project", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="project", cascade="all, delete-orphan")


class Estimate(Base):
    __tablename__ = "estimates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    estimate_number = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(20), nullable=False, default="building")  # building, road
    status = Column(String(20), nullable=False, default="draft")  # draft, submitted, approved, archived
    overhead_pct = Column(Numeric(5, 2), nullable=False, default=0.00)
    contingency_pct = Column(Numeric(5, 2), nullable=False, default=0.00)
    discount_pct = Column(Numeric(5, 2), nullable=False, default=0.00)
    gst_pct = Column(Numeric(5, 2), nullable=False, default=0.00)
    subtotal = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    snapshot = Column(JSON, nullable=True)
    notes = Column(String(2000), nullable=True)
    created_by = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "estimate_number", name="uq_estimates_org_number"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="estimates")
    project = relationship("Project", back_populates="estimates")
    creator = relationship("Profile", foreign_keys=[created_by])
    items = relationship("BOQItem", back_populates="estimate", cascade="all, delete-orphan", order_by="BOQItem.sort_order")
    quotations = relationship("Quotation", back_populates="estimate", cascade="all, delete-orphan")


class BOQItem(Base):
    __tablename__ = "boq_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    estimate_id = Column(String(36), ForeignKey("estimates.id", ondelete="CASCADE"), nullable=False)
    item_number = Column(String(50), nullable=False)
    description = Column(String(1000), nullable=False)
    category = Column(String(50), nullable=False, default="general")
    quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    unit = Column(String(20), nullable=False, default="nos")
    unit_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    is_manual = Column(Boolean, nullable=False, default=False)
    calculation_type = Column(String(50), nullable=True)
    calculation_details = Column(JSON, nullable=True)
    notes = Column(String(1000), nullable=True)
    sort_order = Column(Numeric, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    estimate = relationship("Estimate", back_populates="items")
    organization = relationship("Organization")


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    estimate_id = Column(String(36), ForeignKey("estimates.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    quotation_number = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False, default="draft")  # draft, issued, accepted, rejected, expired
    language = Column(String(10), nullable=False, default="en")  # en, mr, hi
    issue_date = Column(Date, nullable=True)
    valid_until_date = Column(Date, nullable=True)
    payment_terms = Column(String(2000), nullable=True)
    exclusions = Column(String(2000), nullable=True)
    notes = Column(String(2000), nullable=True)
    client_instructions = Column(String(2000), nullable=True)
    authorized_signatory_name = Column(String(255), nullable=True)
    authorized_signatory_designation = Column(String(255), nullable=True)
    tax_configured = Column(Boolean, nullable=False, default=False)
    tax_name = Column(String(100), nullable=False, default="GST")
    tax_rate = Column(Numeric(5, 2), nullable=False, default=0.00)
    subtotal = Column(Numeric(14, 2), nullable=False, default=0.00)
    overhead_pct = Column(Numeric(5, 2), nullable=False, default=0.00)
    overhead_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    contingency_pct = Column(Numeric(5, 2), nullable=False, default=0.00)
    contingency_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    discount_pct = Column(Numeric(5, 2), nullable=False, default=0.00)
    discount_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    taxable_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    tax_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    total_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    snapshot = Column(JSON, nullable=True)
    created_by = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "quotation_number", name="uq_quotations_org_number"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="quotations")
    estimate = relationship("Estimate", back_populates="quotations")
    project = relationship("Project", back_populates="quotations")
    client = relationship("Client", back_populates="quotations")
    creator = relationship("Profile", foreign_keys=[created_by])
