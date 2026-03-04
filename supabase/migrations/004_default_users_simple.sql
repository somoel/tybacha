-- =============================================================================
-- Script Simplificado para Supabase Dashboard
-- Purpose: Crear usuarios por defecto usando el sistema de auth de Supabase
-- =============================================================================

-- OPCIÓN 1: Si tienes acceso a SQL Editor (recomendado)
-- Ejecuta el contenido de 004_default_users.sql

-- OPCIÓN 2: Manualmente desde Supabase Dashboard
-- 1. Ve a Authentication > Users
-- 2. Click en "Add user"
-- 3. Para cada usuario:

-- Usuario 1 - Profesional:
-- Email: chamber@yopmail.com
-- Contraseña: AAA12345*
-- Role: professional
-- User metadata: {"full_name": "Chamber Professional", "role": "professional"}

-- Usuario 2 - Cuidador:
-- Email: tristhian@yopmail.com  
-- Contraseña: AAA12345*
-- Role: caregiver
-- User metadata: {"full_name": "Tristhian Cuidador", "role": "caregiver"}

-- ─────────────────────────────────────────────────────────
-- Verificación después de crear los usuarios
-- ─────────────────────────────────────────────────────────

-- Este query te ayudará a verificar que los usuarios se crearon correctamente
SELECT 
    p.id,
    p.full_name,
    p.role,
    u.email,
    p.created_at as profile_created,
    u.created_at as user_created
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email IN ('chamber@yopmail.com', 'tristhian@yopmail.com')
ORDER BY p.role;
