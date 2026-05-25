export const ROLES = ['administrador', 'profesional', 'cuidador'] as const;

export type UserRole = (typeof ROLES)[number];

export const ROLE_CREATION_RULES: Record<UserRole, UserRole[]> = {
  administrador: ['administrador', 'profesional'],
  profesional: ['cuidador'],
  cuidador: [],
};

export function canCreateRole(actorRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_CREATION_RULES[actorRole].includes(targetRole);
}

