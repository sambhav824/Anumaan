# अनुमान (Anumaan) — Database & Security Model

## 1. Relational Database Schema

The database model is defined via versioned SQL migrations in `supabase/migrations/`:

```mermaid
erDiagram
    PROFILES ||--o{ ORGANIZATION_MEMBERS : "has"
    ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : "has"
    ORGANIZATIONS ||--o{ CLIENTS : "owns"
    ORGANIZATIONS ||--o{ PROJECTS : "owns"
    CLIENTS ||--o{ PROJECTS : "assigned to"

    PROFILES {
        uuid id PK "references auth.users(id)"
        text full_name
        text language_preference "en | mr | hi"
        text avatar_url
        timestamptz created_at
        timestamptz updated_at
    }

    ORGANIZATIONS {
        uuid id PK
        text name
        text owner_person
        text email
        text phone
        text business_address
        text city
        text state
        text pin_code
        text gstin
        text logo_url
        timestamptz created_at
        timestamptz updated_at
    }

    ORGANIZATION_MEMBERS {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        text role "owner | admin | member"
        timestamptz created_at
        timestamptz updated_at
    }

    CLIENTS {
        uuid id PK
        uuid organization_id FK
        text name
        text contact_person
        text email
        text phone
        text billing_address
        text gstin
        timestamptz created_at
        timestamptz updated_at
    }

    PROJECTS {
        uuid id PK
        uuid organization_id FK
        uuid client_id FK
        text name
        text project_type "building | road"
        text status "planning | in_progress | completed | archived"
        text site_location
        text city
        text state
        text description
        date start_date
        text quotation_language "en | mr | hi"
        timestamptz created_at
        timestamptz updated_at
    }
```

---

## 2. Row Level Security (RLS) Policies

All tables have Row Level Security enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). Access is restricted using stable, security-definer helper functions:

```sql
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = target_org_id
          AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
```

### Table Security Rules

1. **`profiles`**:
   - `SELECT`: `id = auth.uid()`
   - `UPDATE`: `id = auth.uid()`
2. **`organizations`**:
   - `SELECT`: `public.is_org_member(id)`
   - `INSERT`: `auth.uid() IS NOT NULL`
   - `UPDATE`: `public.is_org_admin(id)`
3. **`organization_members`**:
   - `SELECT`: `public.is_org_member(organization_id)`
   - `INSERT`: `public.is_org_admin(organization_id)` or self-enrollment as initial `owner`
   - `UPDATE` / `DELETE`: `public.is_org_admin(organization_id)`
4. **`clients`**:
   - `SELECT` / `INSERT` / `UPDATE`: `public.is_org_member(organization_id)`
   - `DELETE`: `public.is_org_admin(organization_id)`
5. **`projects`**:
   - `SELECT` / `INSERT` / `UPDATE`: `public.is_org_member(organization_id)`
   - `DELETE`: `public.is_org_admin(organization_id)`

---

## 3. Storage Bucket Security

Two private Supabase storage buckets are configured:
- `project-drawings` (up to 50MB per file: PDF, PNG, JPG, DWG, SVG)
- `project-documents` (up to 25MB per file: PDF, XLSX, DOCX, JPG, PNG)

### Path Convention & RLS:
Objects must be stored following the hierarchical key structure:
`/{organization_id}/{project_id}/{filename}`

Storage RLS enforces that `(storage.foldername(name))[1]::uuid` matches an organization where `auth.uid()` has verified membership.

---

## 4. API Authorization & JWT Security

1. **Bearer Token Validation**: Every request to the FastAPI backend requires `Authorization: Bearer <token>`. The backend validates the Supabase HS256 signature using `SUPABASE_JWT_SECRET` and checks token expiration.
2. **Untrusted Client Identifiers**: The backend never accepts an `organization_id` header or URL parameter blindly. It queries the membership table before every operation. If a user attempts to access an organization they do not belong to, an HTTP 403 Forbidden is returned.
3. **Secret Hygiene**: The Supabase Service Role key (`SUPABASE_SERVICE_ROLE_KEY`) is strictly confined to the backend environment and never bundled or exposed in client-side code.
