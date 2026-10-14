import { describe, expect, it } from 'vitest';
import { PERMISSIONS, type PermissionCode } from '../src/domain/permissions.js';
import { canCreateRole, ROLES, ROLE_CREATION_RULES, type UserRole } from '../src/domain/roles.js';

describe('roles', () => {
  it('define los tres roles del sistema', () => {
    expect(ROLES).toEqual(['administrador', 'profesional', 'cuidador']);
  });

  it('administrador solo crea administradores y profesionales', () => {
    expect(canCreateRole('administrador', 'administrador')).toBe(true);
    expect(canCreateRole('administrador', 'profesional')).toBe(true);
    expect(canCreateRole('administrador', 'cuidador')).toBe(false);
  });

  it('profesional solo crea cuidadores', () => {
    expect(canCreateRole('profesional', 'cuidador')).toBe(true);
    expect(canCreateRole('profesional', 'profesional')).toBe(false);
    expect(canCreateRole('profesional', 'administrador')).toBe(false);
  });

  it('cuidador no crea nada', () => {
    for (const target of ROLES) {
      expect(canCreateRole('cuidador', target)).toBe(false);
    }
    expect(ROLE_CREATION_RULES.cuidador).toEqual([]);
  });

  it('cada rol tiene reglas definidas', () => {
    for (const role of ROLES) {
      expect(ROLE_CREATION_RULES[role]).toBeDefined();
    }
  });

  it('todos los roles de creación son roles válidos', () => {
    for (const targets of Object.values(ROLE_CREATION_RULES)) {
      for (const target of targets) {
        expect(ROLES).toContain(target);
      }
    }
  });
});

describe('permissions', () => {
  it('expone códigos con namespace', () => {
    expect(PERMISSIONS.usersManage).toBe('usuarios.gestionar');
    expect(PERMISSIONS.auditRead).toBe('auditoria.consultar');
    expect(PERMISSIONS.sftManage).toBe('sft.gestionar');
  });

  it('no hay códigos duplicados', () => {
    const codes = Object.values(PERMISSIONS) as PermissionCode[];
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('los códigos usan formato dominio.accion', () => {
    for (const code of Object.values(PERMISSIONS)) {
      expect(code).toMatch(/^[a-z_]+\.[a-z]+$/);
    }
  });

  it('todos los valores son strings no vacíos', () => {
    for (const code of Object.values(PERMISSIONS)) {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    }
  });
});

describe('UserRole type', () => {
  it('los valores de ROLES son UserRole', () => {
    const roles: UserRole[] = [...ROLES];
    expect(roles).toHaveLength(3);
  });
});
