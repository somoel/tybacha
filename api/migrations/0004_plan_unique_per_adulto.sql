-- 0004_plan_unique_per_adulto.sql
-- Objetivo: garantizar un plan_ejercicio por adulto mayor.
-- Regla de backfill: el plan mas reciente por creado_en se conserva.

-- 1. Auditoria previa (no destructiva)
-- Ejecutar primero para revisar antes de borrar:
-- SELECT id_adulto_mayor, COUNT(*) AS planes
-- FROM plan_ejercicio
-- GROUP BY id_adulto_mayor
-- HAVING COUNT(*) > 1;

-- 2. Backfill: eliminar planes duplicados conservando el mas reciente por adulto_mayor
--    Las tablas hijas con ON DELETE CASCADE (ejercicio_plan, generacion_ia_plan,
--    cambio_estado_plan, alerta_programada) se eliminan en cascada automaticamente.
--    registro_actividad_diaria y estadistica_progreso usan ON DELETE SET NULL,
--    por lo que sus FKs apuntaran a NULL.
DELETE pe1 FROM plan_ejercicio pe1
INNER JOIN plan_ejercicio pe2
  ON pe1.id_adulto_mayor = pe2.id_adulto_mayor
 AND pe1.creado_en < pe2.creado_en;

-- 3. Agregar UNIQUE constraint para garantizar 1:1
ALTER TABLE plan_ejercicio
  ADD CONSTRAINT uk_plan_ejercicio_adulto_mayor UNIQUE (id_adulto_mayor);
