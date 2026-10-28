from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Engine configuration
engine_kwargs = {}
if "sqlite" in settings.DATABASE_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_async_engine(settings.DATABASE_URL, echo=False, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables and default developer seed data."""
    # Ensure all models are registered on Base.metadata before creating tables
    from app.models.models import (
        Profile, Organization, OrganizationMember, Client, Project,
        Estimate, BOQItem, Quotation, RateItem, ActualExpense, Invoice, ConstructionDrawing, DrawingMeasurement
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # SQLite column sync for dynamic additions
    if "sqlite" in settings.DATABASE_URL:
        async with engine.begin() as conn:
            from sqlalchemy import text
            def sync_sqlite_cols(connection):
                rows = connection.execute(text("PRAGMA table_info(rate_items)")).fetchall()
                existing_cols = {row[1] for row in rows}
                cols_to_add = [
                    ("description", "TEXT"),
                    ("equipment_rate", "NUMERIC(14, 2) DEFAULT 0.00"),
                    ("rate_source", "TEXT DEFAULT 'Manual'"),
                    ("supplier_or_source_name", "TEXT"),
                    ("location", "TEXT"),
                    ("code", "TEXT"),
                    ("rate_type", "TEXT DEFAULT 'raw_material'"),
                    ("region", "TEXT DEFAULT 'national_cpwd'"),
                    ("source_date", "TEXT"),
                    ("rate_status", "TEXT DEFAULT 'verified_source'"),
                    ("specification", "TEXT"),
                    ("is_custom", "BOOLEAN DEFAULT 0"),
                    ("is_archived", "BOOLEAN DEFAULT 0"),
                    ("canonical_id", "TEXT"),
                    ("default_item_id", "TEXT"),
                ]
                for col_name, col_def in cols_to_add:
                    if col_name not in existing_cols:
                        connection.execute(text(f"ALTER TABLE rate_items ADD COLUMN {col_name} {col_def}"))
                boq_rows = connection.execute(text("PRAGMA table_info(boq_items)")).fetchall()
                boq_cols = {row[1] for row in boq_rows}
                if "rate_item_id" not in boq_cols:
                    connection.execute(text("ALTER TABLE boq_items ADD COLUMN rate_item_id TEXT"))
            await conn.run_sync(sync_sqlite_cols)

    # Seed default developer credentials if SQLite
    if "sqlite" in settings.DATABASE_URL:
        async with AsyncSessionLocal() as session:
            from sqlalchemy.future import select
            import hashlib

            demo_email = "engineer@anumaan.in"
            res = await session.execute(select(Profile).where(Profile.email == demo_email))
            if not res.scalars().first():
                demo_user_id = "11111111-1111-1111-1111-111111111111"
                salt = "anumaan_salt_2026"
                hashed_pwd = hashlib.sha256(f"{salt}Password123".encode("utf-8")).hexdigest()

                profile = Profile(
                    id=demo_user_id,
                    email=demo_email,
                    hashed_password=hashed_pwd,
                    full_name="राजेश देशमुख (Er. Rajesh Deshmukh)",
                    language_preference="mr"
                )
                session.add(profile)

                org = Organization(
                    id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
                    name="सह्याद्री इन्फ्रास्ट्रक्चर्स प्रायव्हेट लिमिटेड",
                    owner_person="राजेश देशमुख (Er. Rajesh Deshmukh)",
                    email=demo_email,
                    phone="+91 98220 12345",
                    city="पुणे",
                    state="महाराष्ट्र",
                    pin_code="411005",
                    gstin="27AAAAA0000A1Z5"
                )
                session.add(org)

                member = OrganizationMember(
                    organization_id=org.id,
                    user_id=demo_user_id,
                    role="owner"
                )
                session.add(member)

                client1 = Client(
                    id="b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
                    organization_id=org.id,
                    name="पुणे मेट्रो विकास प्राधिकरण",
                    contact_person="आनंद कुलकर्णी",
                    email="contracts@punemetro.gov.in",
                    phone="+91 98221 54321",
                    billing_address="मेट्रो भवन, कोथरूड, पुणे",
                    gstin="27BBBBB1111B1Z2"
                )
                session.add(client1)

                client2 = Client(
                    id="c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
                    organization_id=org.id,
                    name="शान्ति कमर्शियल डेवलपर्स प्रा. लि.",
                    contact_person="सुनील वर्मा",
                    email="procurement@shantidevelopers.com",
                    phone="+91 99332 87654",
                    billing_address="सेक्टर १८, कमर्शियल हब, नवी मुंबई",
                    gstin="27CCCCC2222C1Z9"
                )
                session.add(client2)

                proj1 = Project(
                    id="e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b",
                    organization_id=org.id,
                    client_id=client1.id,
                    name="हिंजवडी - वाकड ४-लेन मुख्य रस्ता रुंदीकरण प्रकल्प",
                    project_type="road",
                    status="in_progress",
                    site_location="हिंजवडी आयटी पार्क फेज १ ते वाकड ब्रिज",
                    city="पुणे",
                    state="महाराष्ट्र",
                    description="४.५ किमी लांबीचा काँक्रीट रस्ता आणि पावसाळी गटार बांधकाम.",
                    quotation_language="mr"
                )
                session.add(proj1)

                proj2 = Project(
                    id="f6a7b89c-0d1e-2f3a-4b5c-6d7e8f9a0b1c",
                    organization_id=org.id,
                    client_id=client2.id,
                    name="शान्ति हाइट्स - १५ मजली निवासी एवं वाणिज्यिक टॉवर",
                    project_type="building",
                    status="planning",
                    site_location="प्लॉट ३४, सेक्टर २१, खारघर",
                    city="नवी मुंबई",
                    state="महाराष्ट्र",
                    description="आरसीसी फ्रेम स्ट्रक्चर, डबल बेसमेंट पार्किंग एवं फिनिशिंग कार्य।",
                    quotation_language="hi"
                )
                session.add(proj2)

                await session.commit()

        # Seed default rate library for demo organization if empty
        async with AsyncSessionLocal() as session:
            demo_org_id = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
            rate_count_res = await session.execute(
                select(RateItem).where(RateItem.organization_id == demo_org_id)
            )
            if not rate_count_res.scalars().first():
                from app.core.default_rates import get_default_catalogue
                default_items = get_default_catalogue(region="maharashtra_pwd")
                for it in default_items:
                    rate_obj = RateItem(
                        organization_id=demo_org_id,
                        code=it["code"],
                        name=it["name"],
                        category=it["category"],
                        rate_type=it["rate_type"],
                        unit=it["unit"],
                        material_rate=it["material_rate"],
                        labour_rate=it["labour_rate"],
                        equipment_rate=it["equipment_rate"],
                        combined_rate=it["combined_rate"],
                        rate_source=it["rate_source"],
                        supplier_or_source_name=it["supplier_or_source_name"],
                        source_date=it["source_date"],
                        rate_status=it["rate_status"],
                        region=it["region"],
                        specification=it["specification"],
                        description=it["description"],
                        location=it["location"],
                        supplier_or_location=it["supplier_or_location"],
                        notes=it["notes"],
                        is_custom=False,
                        default_item_id=it["code"],
                    )
                    session.add(rate_obj)
                await session.commit()
