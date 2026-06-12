-- Add body metrics (peso, estatura, IMC) to aplicacion_sft
-- These fields are recorded at the start of each SFT battery application.

alter table aplicacion_sft
    add column peso_kg    decimal(5, 2) null after observaciones,
    add column estatura_cm decimal(5, 2) null after peso_kg,
    add column imc        decimal(5, 2) null after estatura_cm;
