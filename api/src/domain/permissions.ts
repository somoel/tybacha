export const PERMISSIONS = {
  usersManage: 'usuarios.gestionar',
  olderAdultsCreate: 'adultos_mayores.crear',
  olderAdultsRead: 'adultos_mayores.consultar',
  olderAdultsUpdate: 'adultos_mayores.actualizar',
  olderAdultsDeactivate: 'adultos_mayores.desactivar',
  caregiversAssign: 'cuidadores.asignar',
  sftManage: 'sft.gestionar',
  exercisePlansManage: 'planes.gestionar',
  trackingManage: 'seguimiento.gestionar',
  notificationsManage: 'notificaciones.gestionar',
  reportsGenerate: 'reportes.generar',
  consentsManage: 'consentimientos.gestionar',
  auditRead: 'auditoria.consultar',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

