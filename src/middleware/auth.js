import { getAuth } from 'firebase-admin/auth';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.firebaseUser = await getAuth().verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export async function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('no auth token'));
  try {
    socket.firebaseUser = await getAuth().verifyIdToken(token);
    next();
  } catch {
    next(new Error('invalid token'));
  }
}
