import { z } from 'zod';

export const createAlertSchema = z.object({
  idAdultoMayor: z.number().int().positive().optional(),
  idPlanEjercicio: z.number().int().positive().optional(),
  idUsuarioDestinatario: z.number().int().positive().optional(),
  tipoAlerta: z.enum(['recordatorio_ejercicio', 'cumplimiento', 'progreso', 'sistema', 'otro']),
  titulo: z.string().min(1).max(160),
  mensaje: z.string().min(1),
  canal: z.enum(['app', 'correo', 'sms', 'push']).default('push'),
  fechaProgramada: z.string().datetime().optional(),
  reglaProgramacion: z.record(z.string(), z.unknown()).optional(),
  condicionDisparo: z.record(z.string(), z.unknown()).optional(),
});

export const updateAlertSchema = createAlertSchema.partial();

export const alertStatusSchema = z.object({
  estado: z.enum(['activa', 'pausada', 'finalizada', 'cancelada']),
});
