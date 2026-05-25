export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = 'HTTP_ERROR',
  ) {
    super(message);
  }
}

export const badRequest = (message: string, code = 'BAD_REQUEST') =>
  new HttpError(400, message, code);

export const unauthorized = (message = 'No autenticado') =>
  new HttpError(401, message, 'UNAUTHORIZED');

export const forbidden = (message = 'No autorizado') =>
  new HttpError(403, message, 'FORBIDDEN');

export const notFound = (message = 'No encontrado') =>
  new HttpError(404, message, 'NOT_FOUND');

