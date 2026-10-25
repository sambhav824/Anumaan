-- ==============================================================================
-- Development Seed Data: seed.sql
-- Product: अनुमान (Anumaan) — Multilingual Construction Estimation SaaS
-- Note: Replace UUIDs or use in development environments with active auth users.
-- ==============================================================================

-- 1. Create Sample Organization (Maharashtra Infrastructure & Commercial)
INSERT INTO public.organizations (
    id, name, owner_person, email, phone, business_address, city, state, pin_code, gstin
) VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'सह्याद्री इन्फ्रास्ट्रक्चर्स प्रायव्हेट लिमिटेड',
    'राजेश देशमुख (Rajesh Deshmukh)',
    'contact@sahyadriinfra.in',
    '+91 98220 12345',
    'प्लॉट क्र. ४५, शिवाजी नगर',
    'पुणे (Pune)',
    'महाराष्ट्र (Maharashtra)',
    '411005',
    '27AAAAA0000A1Z5'
) ON CONFLICT (id) DO NOTHING;

-- 2. Create Sample Clients for Organization
-- Client 1: Pune Metro Infra (Marathi)
INSERT INTO public.clients (
    id, organization_id, name, contact_person, email, phone, billing_address, gstin
) VALUES (
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'पुणे मेट्रो विकास प्राधिकरण',
    'आनंद कुलकर्णी',
    'contracts@punemetro.gov.in',
    '+91 98221 54321',
    'मेट्रो भवन, कोथरूड, पुणे',
    '27BBBBB1111B1Z2'
) ON CONFLICT (id) DO NOTHING;

-- Client 2: Shanti Commercial Developers (Hindi)
INSERT INTO public.clients (
    id, organization_id, name, contact_person, email, phone, billing_address, gstin
) VALUES (
    'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'शान्ति कमर्शियल डेवलपर्स प्रा. लि.',
    'सुनील वर्मा',
    'procurement@shantidevelopers.com',
    '+91 99332 87654',
    'सेक्टर १८, कमर्शियल हब, नवी मुंबई',
    '27CCCCC2222C1Z9'
) ON CONFLICT (id) DO NOTHING;

-- Client 3: Apex Roadways India (English)
INSERT INTO public.clients (
    id, organization_id, name, contact_person, email, phone, billing_address, gstin
) VALUES (
    'd4e5f6a7-b89c-0d1e-2f3a-4b5c6d7e8f9a',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Apex Roadways Infrastructure Corp',
    'Vikram Malhotra',
    'billing@apexroadways.in',
    '+91 98110 33445',
    'Level 4, Express Towers, Nariman Point, Mumbai',
    '27DDDDD3333D1Z1'
) ON CONFLICT (id) DO NOTHING;

-- 3. Create Sample Projects
-- Project 1: Road Project (Marathi)
INSERT INTO public.projects (
    id, organization_id, client_id, name, project_type, status,
    site_location, city, state, description, start_date, quotation_language
) VALUES (
    'e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    'हिंजवडी - वाकड ४-लेन मुख्य रस्ता रुंदीकरण प्रकल्प',
    'road',
    'in_progress',
    'हिंजवडी आयटी पार्क फेज १ ते वाकड ब्रिज',
    'पुणे',
    'महाराष्ट्र',
    '४.५ किमी लांबीचा काँक्रीट रस्ता आणि पावसाळी गटार बांधकाम.',
    '2026-03-01',
    'mr'
) ON CONFLICT (id) DO NOTHING;

-- Project 2: Building Project (Hindi)
INSERT INTO public.projects (
    id, organization_id, client_id, name, project_type, status,
    site_location, city, state, description, start_date, quotation_language
) VALUES (
    'f6a7b89c-0d1e-2f3a-4b5c-6d7e8f9a0b1c',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    'शान्ति हाइट्स - १५ मजली निवासी एवं वाणिज्यिक टॉवर',
    'building',
    'planning',
    'प्लॉट ३४, सेक्टर २१, खारघर',
    'नवी मुंबई',
    'महाराष्ट्र',
    'आरसीसी फ्रेम स्ट्रक्चर, डबल बेसमेंट पार्किंग एवं फिनिशिंग कार्य।',
    '2026-04-15',
    'hi'
) ON CONFLICT (id) DO NOTHING;

-- Project 3: Highway Express Link (English)
INSERT INTO public.projects (
    id, organization_id, client_id, name, project_type, status,
    site_location, city, state, description, start_date, quotation_language
) VALUES (
    'a7b89c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'd4e5f6a7-b89c-0d1e-2f3a-4b5c6d7e8f9a',
    'Mumbai-Pune Expressway Spur Road Pavement Rehab',
    'road',
    'completed',
    'Km 42 to 48, Panvel Section',
    'Panvel',
    'Maharashtra',
    'Bituminous concrete overlay, lane marking, and drainage rectification.',
    '2025-11-10',
    'en'
) ON CONFLICT (id) DO NOTHING;
