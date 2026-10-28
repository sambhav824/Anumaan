import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Numeric,
    Integer,
    Text,
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
    rate_items = relationship("RateItem", back_populates="organization", cascade="all, delete-orphan")
    actual_expenses = relationship("ActualExpense", back_populates="organization", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="organization", cascade="all, delete-orphan")




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
    invoices = relationship("Invoice", back_populates="project", cascade="all, delete-orphan")


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
    actual_expenses = relationship("ActualExpense", back_populates="estimate", cascade="all, delete-orphan")



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
    rate_item_id = Column(String(36), nullable=True)
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


class RateItem(Base):
    __tablename__ = "rate_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(50), nullable=True)
    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, default="material")  # material, labour, equipment, other, composite, subcontract
    rate_type = Column(String(50), nullable=False, default="raw_material")  # raw_material, labour_only, equipment_only, completed_work, composite
    description = Column(String(1000), nullable=True)
    unit = Column(String(20), nullable=False, default="nos")  # kg, tonne, bag, piece, cum, sqm, sqft, rmt, day, hour, ls
    material_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    labour_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    equipment_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    combined_rate = Column(Numeric(14, 2), nullable=False, default=0.00)
    rate_source = Column(String(50), nullable=False, default="Manual")  # Manual, Supplier Quote, Schedule of Rates
    supplier_or_source_name = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    supplier_or_location = Column(String(255), nullable=True)
    region = Column(String(100), nullable=False, default="national_cpwd")
    source_date = Column(String(50), nullable=True)
    rate_status = Column(String(50), nullable=False, default="verified_source")  # verified_source, illustrative_needs_verification
    specification = Column(String(500), nullable=True)
    is_custom = Column(Boolean, nullable=False, default=False)
    is_archived = Column(Boolean, nullable=False, default=False)
    canonical_id = Column(String(36), nullable=True)
    default_item_id = Column(String(50), nullable=True)
    notes = Column(String(1000), nullable=True)
    created_by = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="rate_items")
    creator = relationship("Profile", foreign_keys=[created_by])


class ActualExpense(Base):
    __tablename__ = "actual_expenses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    estimate_id = Column(String(36), ForeignKey("estimates.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(50), nullable=False, default="material")  # material, labour, equipment, transport, subcontract, other
    description = Column(String(500), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    expense_date = Column(Date, nullable=False)
    vendor_or_payee = Column(String(255), nullable=True)
    invoice_or_voucher_ref = Column(String(100), nullable=True)
    notes = Column(String(1000), nullable=True)
    created_by = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="actual_expenses")
    estimate = relationship("Estimate", back_populates="actual_expenses")
    creator = relationship("Profile", foreign_keys=[created_by])



class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    quotation_id = Column(String(36), ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True, index=True)
    invoice_number = Column(String(50), nullable=False)
    milestone_name = Column(String(255), nullable=False)
    percentage = Column(Numeric(5, 2), nullable=False, default=0.00)
    amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    status = Column(String(20), nullable=False, default="draft")  # draft, sent, paid, partially_paid, overdue
    due_date = Column(Date, nullable=True)
    paid_date = Column(Date, nullable=True)
    paid_amount = Column(Numeric(14, 2), nullable=False, default=0.00)
    payment_method = Column(String(50), nullable=True)
    notes = Column(String(1000), nullable=True)
    created_by = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "invoice_number", name="uq_invoices_org_number"),
    )

    organization = relationship("Organization", back_populates="invoices")
    project = relationship("Project", back_populates="invoices")
    quotation = relationship("Quotation")
    creator = relationship("Profile", foreign_keys=[created_by])


class ConstructionDrawing(Base):
    __tablename__ = "construction_drawings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    estimate_id = Column(String(36), ForeignKey("estimates.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_format = Column(String(20), nullable=False, default="PDF")
    file_size_bytes = Column(Integer, nullable=False, default=0)
    page_count = Column(Integer, nullable=False, default=1)
    file_data_base64 = Column(Text, nullable=True)
    storage_path = Column(String(500), nullable=True)
    scale_calibration = Column(JSON, nullable=True)
    created_by = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    organization = relationship("Organization")
    project = relationship("Project")
    measurements = relationship("DrawingMeasurement", back_populates="drawing", cascade="all, delete-orphan")


class DrawingMeasurement(Base):
    __tablename__ = "drawing_measurements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    drawing_id = Column(String(36), ForeignKey("construction_drawings.id", ondelete="CASCADE"), nullable=False, index=True)
    page_number = Column(Integer, nullable=False, default=1)
    name = Column(String(255), nullable=False)
    measurement_type = Column(String(50), nullable=False)  # "length", "area", "count"
    quantity = Column(Numeric(14, 4), nullable=False, default=0.0000)
    unit = Column(String(20), nullable=False, default="m")
    coordinates = Column(JSON, nullable=True)
    construction_mapping = Column(JSON, nullable=True)
    is_confirmed = Column(Boolean, nullable=False, default=False)
    notes = Column(String(1000), nullable=True)
    created_by = Column(String(36), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    drawing = relationship("ConstructionDrawing", back_populates="measurements")
    creator = relationship("Profile", foreign_keys=[created_by])
