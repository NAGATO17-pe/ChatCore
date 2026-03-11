import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import morgan from 'morgan';
import { Server } from 'socket.io';
import { prisma, getOrCreateUser } from './db.js';
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

app.get('/api/chats', async (req, res) => {
  const username = normalizeUsername(req.query.username);
  if (!username) return res.status(400).json({ error: 'username requerido' });

  const chats = await prisma.chat.findMany({
    where: {
      participants: {
        some: {
          user: { username }
        }
      }
    },
    include: {
      participants: { include: { user: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(chats);
});

app.post('/api/chats', async (req, res) => {
  const name = (req.body.name || '').trim();
  const rawParticipants = Array.isArray(req.body.participants) ? req.body.participants : [];
  const participants = [...new Set(rawParticipants.map(normalizeUsername).filter(Boolean))];

  if (!name) return res.status(400).json({ error: 'nombre de chat requerido' });
  if (participants.length < 2) {
    return res.status(400).json({ error: 'requiere al menos 2 participantes' });
  }

  const users = await Promise.all(participants.map((username) => getOrCreateUser(username)));

  const chat = await prisma.chat.create({
    data: {
      name,
      participants: {
        create: users.map((u) => ({ userId: u.id }))
      }
    },
    include: {
      participants: { include: { user: true } }
    }
  });

  res.status(201).json(chat);
});

app.get('/api/chats/:chatId/messages', async (req, res) => {
  const chatId = Number(req.params.chatId);
  if (Number.isNaN(chatId)) return res.status(400).json({ error: 'chatId inválido' });

  const messages = await prisma.message.findMany({
    where: { chatId },
    include: { sender: true },
    orderBy: { createdAt: 'asc' },
    take: 500
  });

  res.json(messages);
});

io.on('connection', (socket) => {
  socket.on('join_chat', async ({ chatId }) => {
    const chatIdNum = Number(chatId);
    if (!Number.isNaN(chatIdNum)) {
      socket.join(`chat:${chatIdNum}`);
    }
  });

  socket.on('send_message', async ({ chatId, sender, content }) => {
    const chatIdNum = Number(chatId);
    const username = normalizeUsername(sender);

    if (Number.isNaN(chatIdNum) || !username || !isValidMessage(content)) {
      socket.emit('chat_error', { message: 'mensaje inválido' });
      return;
    }

    const user = await getOrCreateUser(username);

    const message = await prisma.message.create({
      data: {
        chatId: chatIdNum,
        senderId: user.id,
        content: content.trim()
      },
      include: { sender: true }
    });

    io.to(`chat:${chatIdNum}`).emit('new_message', message);
  });
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => {
  console.log(`ChatCore escuchando en http://0.0.0.0:${port}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
