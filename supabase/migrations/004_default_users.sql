-- =============================================================================
-- Script: Insertar Usuarios por Defecto
-- Purpose: Crear dos usuarios de prueba para el sistema Tybachá
-- =============================================================================

-- NOTA: Este script debe ejecutarse en Supabase SQL Editor
-- Los usuarios se crearán con las contraseñas especificadas

-- ─────────────────────────────────────────────────────────
-- Insertar usuario Profesional: chamber@yopmail.com
-- ─────────────────────────────────────────────────────────

-- Primero crear el usuario en auth.users
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at,
    raw_user_meta_data
) VALUES (
    gen_random_uuid(),
    'chamber@yopmail.com',
    crypt('AAA12345*', gen_salt('bf')),
    now(),
    now(),
    now(),
    now(),
    '{"full_name": "Chamber Professional", "role": "professional"}'
) ON CONFLICT (email) DO NOTHING;

-- Luego crear el perfil en public.profiles
INSERT INTO public.profiles (
    id,
    full_name,
    role,
    created_at
) SELECT 
    id,
    'Chamber Professional',
    'professional',
    now()
FROM auth.users 
WHERE email = 'chamber@yopmail.com'
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- Insertar usuario Cuidador: tristhian@yopmail.com
-- ─────────────────────────────────────────────────────────

-- Primero crear el usuario en auth.users
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at,
    raw_user_meta_data
) VALUES (
    gen_random_uuid(),
    'tristhian@yopmail.com',
    crypt('AAA12345*', gen_salt('bf')),
    now(),
    now(),
    now(),
    now(),
    '{"full_name": "Tristhian Cuidador", "role": "caregiver"}'
) ON CONFLICT (email) DO NOTHING;

-- Luego crear el perfil en public.profiles
INSERT INTO public.profiles (
    id,
    full_name,
    role,
    created_at
) SELECT 
    id,
    'Tristhian Cuidador',
    'caregiver',
    now()
FROM auth.users 
WHERE email = 'tristhian@yopmail.com'
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- Verificación: Mostrar usuarios creados
-- ─────────────────────────────────────────────────────────

SELECT 
    p.id,
    p.full_name,
    p.role,
    u.email,
    p.created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email IN ('chamber@yopmail.com', 'tristhian@yopmail.com')
ORDER BY p.role;
