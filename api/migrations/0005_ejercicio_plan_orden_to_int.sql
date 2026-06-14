-- 0005_ejercicio_plan_orden_to_int.sql
-- Objetivo: permitir valores negativos en ejercicio_plan.orden para
-- soportar soft-delete seguro sin colisionar en el unique key
-- (id_plan_ejercicio, dia_semana, orden).
-- smallint unsigned (0–65535) no admite negativos; int sí.

ALTER TABLE ejercicio_plan
  MODIFY COLUMN orden int NOT NULL DEFAULT 1;
