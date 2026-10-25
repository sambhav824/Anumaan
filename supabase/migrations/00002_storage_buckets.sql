-- ==============================================================================
-- Migration: 00002_storage_buckets.sql
-- Product: अनुमान (Anumaan) — Multilingual Construction Estimation SaaS
-- Description: Private Supabase Storage buckets for construction drawings
--              and project documents with strict organization-scoped RLS.
-- ==============================================================================

-- 1. Create Private Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'project-drawings',
        'project-drawings',
        false,
        52428800, -- 50MB limit for CAD / DWG / PDF drawings
        ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml', 'application/vnd.dwg', 'application/octet-stream']
    ),
    (
        'project-documents',
        'project-documents',
        false,
        26214400, -- 25MB limit for quotations, invoices, specs
        ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'image/jpeg', 'image/png']
    )
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Objects Row Level Security
-- Objects are organized by folder structure: <organization_id>/<project_id>/<filename>

-- Allow organization members to read drawings and documents in their organization folder
CREATE POLICY "Allow members to read organization drawings and docs"
    ON storage.objects FOR SELECT
    USING (
        bucket_id IN ('project-drawings', 'project-documents')
        AND (
            public.is_org_member((storage.foldername(name))[1]::uuid)
        )
    );

-- Allow organization members to upload drawings and documents
CREATE POLICY "Allow members to upload organization drawings and docs"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id IN ('project-drawings', 'project-documents')
        AND (
            public.is_org_member((storage.foldername(name))[1]::uuid)
        )
    );

-- Allow organization members to update their files
CREATE POLICY "Allow members to update organization drawings and docs"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id IN ('project-drawings', 'project-documents')
        AND (
            public.is_org_member((storage.foldername(name))[1]::uuid)
        )
    );

-- Allow organization admins to delete files
CREATE POLICY "Allow admins to delete organization drawings and docs"
    ON storage.objects FOR DELETE
    USING (
        bucket_id IN ('project-drawings', 'project-documents')
        AND (
            public.is_org_admin((storage.foldername(name))[1]::uuid)
        )
    );
