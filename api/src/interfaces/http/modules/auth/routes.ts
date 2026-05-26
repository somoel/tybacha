import type { FastifyInstance } from 'fastify';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../../../../infrastructure/db/pool.js';
import { verifyPassword } from '../../../../infrastructure/auth/passwords.js';
import { createAccessToken, createRefreshToken, hashToken, verifyRefreshToken } from '../../../../infrastructure/auth/tokens.js';
import { unauthorized } from '../../httpErrors.js';

const loginSchema = z.object({
  correo: z.string().email(),
  contrasena: z.string().min(8),
  dispositivo: z.string().max(120).optional(),
  recordarSesion: z.boolean().default(false),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

interface UserRow extends RowDataPacket {
  id_usuario: number;
  correo: string;
  contrasena_hash: string;
  rol: 'administrador' | 'profesional' | 'cuidador';
  estado: 'pendiente' | 'activo' | 'bloqueado' | 'inactivo';
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/login', async (request) => {
    const body = loginSchema.parse(request.body);
    const [rows] = await pool.query<UserRow[]>(
      `select id_usuario, correo, contrasena_hash, rol, estado
       from usuario
       where correo = :correo
       limit 1`,
      { correo: body.correo.toLowerCase() },
    );

    const user = rows[0];
    if (!user || user.estado !== 'activo') {
      throw unauthorized('Credenciales invalidas o usuario inactivo');
    }

    const valid = await verifyPassword(body.contrasena, user.contrasena_hash);
    if (!valid) {
      throw unauthorized('Credenciales invalidas');
    }

    const tokenUser = {
      idUsuario: user.id_usuario,
      correo: user.correo,
      rol: user.rol,
    };
    const accessToken = await createAccessToken(tokenUser);
    const refreshToken = await createRefreshToken(tokenUser);
    const refreshHash = hashToken(refreshToken);
    const days = body.recordarSesion ? 30 : 7;

    await pool.query(
      `insert into sesion_usuario
        (id_usuario, token_refresco_hash, dispositivo, direccion_ip, agente_usuario, recordar_sesion, expira_en)
       values
        (:idUsuario, :refreshHash, :dispositivo, :ip, :agente, :recordarSesion, date_add(current_timestamp(3), interval :days day))`,
      {
        idUsuario: user.id_usuario,
        refreshHash,
        dispositivo: body.dispositivo ?? null,
        ip: request.ip,
        agente: request.headers['user-agent'] ?? null,
        recordarSesion: body.recordarSesion ? 1 : 0,
        days,
      },
    );

    await pool.query(
      `update usuario set ultimo_acceso_en = current_timestamp(3) where id_usuario = :idUsuario`,
      { idUsuario: user.id_usuario },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        idUsuario: user.id_usuario,
        correo: user.correo,
        rol: user.rol,
      },
    };
  });

  app.post('/auth/refresh', async (request) => {
    const body = refreshSchema.parse(request.body);
    let tokenUser;

    try {
      tokenUser = await verifyRefreshToken(body.refreshToken);
    } catch {
      throw unauthorized('Sesion expirada');
    }

    const refreshHash = hashToken(body.refreshToken);
    const [sessionRows] = await pool.query<RowDataPacket[]>(
      `select s.id_sesion_usuario, u.estado
       from sesion_usuario s
       join usuario u on u.id_usuario = s.id_usuario
       where s.id_usuario = :idUsuario
         and s.token_refresco_hash = :refreshHash
         and s.revocada_en is null
         and s.expira_en > current_timestamp(3)
       limit 1`,
      {
        idUsuario: tokenUser.idUsuario,
        refreshHash,
      },
    );

    const session = sessionRows[0] as { estado?: string } | undefined;
    if (!session || session.estado !== 'activo') {
      throw unauthorized('Sesion expirada');
    }

    return {
      accessToken: await createAccessToken(tokenUser),
    };
  });
}
