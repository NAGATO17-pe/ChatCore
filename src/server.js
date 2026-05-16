import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import morgan from 'morgan';
import { Server } from 'socket.io';
import { requireAuth, socketAuthMiddleware } from './middleware/auth.js';
import {
  getOrCreateUser,
  getUserByDisplayName,
  getChatsForUser,
  createChat,
  getMessages,
  saveMessage,
} from './db.js';
import { isValidMessage, normalizeUsername } from './validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(publicDir));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Returns the public Firebase JS SDK config (safe to expose)
app.get('/api/firebase-config', (_req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
});

app.get('/api/chats', requireAuth, async (req, res) => {
  try {
    const { uid, name, email, picture } = req.firebaseUser;
    await getOrCreateUser(uid, name || email, email, picture);
    const chats = await getChatsForUser(uid);
    res.json(chats);
  } catch (error) {
    console.error('GET /api/chats error', error);
    res.status(500).json({ error: 'Error al obtener chats' });
  }
});

app.post('/api/chats', requireAuth, async (req, res) => {
  const name = (req.body.name || '').trim();
  const rawParticipants = Array.isArray(req.body.participants) ? req.body.participants : [];

  if (!name) return res.status(400).json({ error: 'nombre de chat requerido' });

  const creatorUid = req.firebaseUser.uid;
  const participantNames = [...new Set(rawParticipants.map(normalizeUsername).filter(Boolean))];
  const participantUsers = await Promise.all(participantNames.map((n) => getUserByDisplayName(n)));

  const participantUids = [...new Set([
    creatorUid,
    ...participantUsers.filter(Boolean).map((u) => u.id),
  ])];

  if (participantUids.length < 2) {
    return res.status(400).json({ error: 'requiere al menos 2 participantes válidos' });
  }

  try {
    const chat = await createChat(name, participantUids);
    res.status(201).json(chat);
  } catch (error) {
    console.error('POST /api/chats error', error);
    res.status(500).json({ error: 'Error al crear chat' });
  }
});

app.get('/api/chats/:chatId/messages', requireAuth, async (req, res) => {
  const { chatId } = req.params;
  if (!chatId) return res.status(400).json({ error: 'chatId inválido' });

  try {
    const messages = await getMessages(chatId);
    res.json(messages);
  } catch (error) {
    console.error('GET /api/chats/:chatId/messages error', error);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
  socket.on('join_chat', ({ chatId }) => {
    if (chatId) socket.join(`chat:${chatId}`);
  });

  socket.on('send_message', async ({ chatId, content }) => {
    if (!chatId || !isValidMessage(content)) {
      socket.emit('chat_error', { message: 'mensaje inválido' });
      return;
    }

    try {
      const { uid, name, email } = socket.firebaseUser;
      const senderName = name || email || uid;

      const message = await saveMessage(chatId, {
        senderId: uid,
        senderName,
        content: content.trim(),
      });

      io.to(`chat:${chatId}`).emit('new_message', message);
    } catch (error) {
      socket.emit('chat_error', { message: 'No se pudo guardar el mensaje.' });
      console.error('send_message error', error);
    }
  });
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => {
  console.log(`ChatCore escuchando en http://0.0.0.0:${port}`);
});

process.on('SIGINT', () => {
  process.exit(0);
});
