-- ============================================================
-- Restrict gender to 'femenino' and 'masculino' only
-- Migrates existing 'otro' and 'no_informa' values to 'masculino'
-- ============================================================

-- 1. Adulto mayor
UPDATE adulto_mayor SET genero = 'masculino' WHERE genero IN ('otro', 'no_informa');
ALTER TABLE adulto_mayor MODIFY genero ENUM('femenino', 'masculino') NOT NULL DEFAULT 'masculino';

-- 2. Perfil de usuario
UPDATE perfil_usuario SET genero = 'masculino' WHERE genero IN ('otro', 'no_informa');
ALTER TABLE perfil_usuario MODIFY genero ENUM('femenino', 'masculino') NULL;
