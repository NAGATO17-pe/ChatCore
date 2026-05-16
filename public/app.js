import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js';
import {
  getDatabase,
  ref as dbRef,
  onChildAdded,
  off,
} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js';

// UI elements
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const layout = document.getElementById('layout');
const signInBtn = document.getElementById('sign-in-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const userDisplayEl = document.getElementById('user-display');
const searchChatsInput = document.getElementById('search-chats');
const chatList = document.getElementById('chat-list');
const emptyChatList = document.getElementById('empty-chat-list');
const messagesEl = document.getElementById('messages');
const activeChatText = document.getElementById('active-chat');
const chatTitle = document.getElementById('chat-title');
const msgForm = document.getElementById('message-form');
const msgInput = document.getElementById('message-input');
const chatNameInput = document.getElementById('chat-name');
const chatUsersInput = document.getElementById('chat-users');
const createModal = document.getElementById('create-chat-modal');
const toast = document.getElementById('toast');

let auth, rtdbClient;
let currentUser = null;
let socket = { emit() {}, on() {} };
let activeChatId = null;
let chatsCache = [];
let toastTimer = null;
let rtdbActiveRef = null;

function normalize(name) {
  return (name || '').trim().replace(/\s+/g, '_').toLowerCase();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function toggleSidebar() {
  layout.classList.toggle('sidebar-collapsed');
}

function openModal() {
  createModal.hidden = false;
  createModal.classList.add('show');
  createModal.setAttribute('aria-hidden', 'false');
  chatNameInput.focus();
}

function closeModal() {
  createModal.classList.remove('show');
  createModal.setAttribute('aria-hidden', 'true');
  createModal.hidden = true;
}

function markSelected(chatId) {
  chatList.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.chatId === chatId);
  });
}

function renderChatList(chats) {
  chatList.innerHTML = '';

  if (!Array.isArray(chats) || chats.length === 0) {
    emptyChatList.style.display = 'block';
    return;
  }

  emptyChatList.style.display = 'none';

  chats.forEach((chat) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.chatId = chat.id;
    button.textContent = chat.name;
    button.addEventListener('click', () => openChat(chat.id, chat.name));
    li.appendChild(button);
    chatList.appendChild(li);
  });

  if (activeChatId) markSelected(activeChatId);
}

async function getAuthHeaders() {
  if (!currentUser) return {};
  const token = await currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function loadChats() {
  if (!currentUser) return;

  const headers = await getAuthHeaders();
  const res = await fetch('/api/chats', { headers });
  if (!res.ok) { showToast('Error al cargar chats.'); return; }
  const chats = await res.json();
  chatsCache = Array.isArray(chats) ? chats : [];
  renderChatList(chatsCache);
}

async function openChat(chatId, chatName) {
  // Detach previous RTDB listener
  if (rtdbActiveRef) {
    off(rtdbActiveRef);
    rtdbActiveRef = null;
  }

  activeChatId = chatId;
  chatTitle.textContent = chatName;
  activeChatText.textContent = 'Active now';
  markSelected(chatId);
  socket.emit('join_chat', { chatId });

  const headers = await getAuthHeaders();
  const res = await fetch(`/api/chats/${chatId}/messages`, { headers });
  const messages = await res.json();
  messagesEl.innerHTML = '';

  if (!Array.isArray(messages) || messages.length === 0) {
    messagesEl.innerHTML = '<li class="message system-hint">Aún no hay mensajes en este chat.</li>';
  } else {
    messages.forEach(renderMessage);
  }

  // Subscribe to RTDB for real-time new messages
  if (rtdbClient) {
    const msgRef = dbRef(rtdbClient, `messages/${chatId}`);
    rtdbActiveRef = msgRef;
    onChildAdded(msgRef, (snap) => {
      const msg = { id: snap.key, ...snap.val() };
      if (msg.chatId !== activeChatId) return;
      if (messagesEl.querySelector(`[data-msg-id="${msg.id}"]`)) return;
      renderMessage(msg);
    });
  }
}

function renderMessage(message) {
  const li = document.createElement('li');
  const senderName = message.senderName || message.sender?.username || 'unknown';
  const isSelf = currentUser && message.senderId === currentUser.uid;
  li.className = `message ${isSelf ? 'outgoing' : ''}`;
  if (message.id) li.dataset.msgId = message.id;

  const senderEl = document.createElement('strong');
  senderEl.textContent = senderName;

  const contentEl = document.createTextNode(`: ${message.content}`);

  const metaEl = document.createElement('div');
  metaEl.className = 'meta';
  metaEl.textContent = new Date(message.createdAt || Date.now()).toLocaleString();

  li.append(senderEl, contentEl, metaEl);
  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function createChat() {
  const name = chatNameInput.value.trim();
  const extra = chatUsersInput.value.split(',').map(normalize).filter(Boolean);

  if (!name) { showToast('El chat necesita un nombre.'); return; }
  if (extra.length === 0) { showToast('Agrega al menos otro participante.'); return; }

  const headers = await getAuthHeaders();
  const res = await fetch('/api/chats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ name, participants: extra }),
  });

  if (!res.ok) {
    showToast('No se pudo crear el chat.');
    return;
  }

  chatNameInput.value = '';
  chatUsersInput.value = '';
  closeModal();
  showToast('Chat creado correctamente.');
  await loadChats();
}

async function initSocket() {
  if (!currentUser || !window.io) return;
  const token = await currentUser.getIdToken();
  socket = window.io({ auth: { token }, transports: ['websocket', 'polling'] });
  socket.on('new_message', (message) => {
    if (message.chatId !== activeChatId) return;
    if (messagesEl.querySelector(`[data-msg-id="${message.id}"]`)) return;
    renderMessage(message);
  });
  socket.on('chat_error', (err) => showToast(err.message || 'Error en chat'));
}

async function handleAuthStateChange(user) {
  currentUser = user;
  if (user) {
    authSection.hidden = true;
    appSection.hidden = false;
    userDisplayEl.textContent = user.displayName || user.email;
    await initSocket();
    await loadChats();
  } else {
    authSection.hidden = false;
    appSection.hidden = true;
    socket = { emit() {}, on() {} };
    if (rtdbActiveRef) { off(rtdbActiveRef); rtdbActiveRef = null; }
    activeChatId = null;
  }
}

async function init() {
  const res = await fetch('/api/firebase-config');
  const config = await res.json();
  const firebaseApp = initializeApp(config);
  auth = getAuth(firebaseApp);
  rtdbClient = getDatabase(firebaseApp);

  onAuthStateChanged(auth, handleAuthStateChange);

  signInBtn?.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      showToast('Error al iniciar sesión.');
      console.error(err);
    }
  });

  signOutBtn?.addEventListener('click', async () => {
    await signOut(auth);
    showToast('Sesión cerrada.');
  });
}

msgForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeChatId) { showToast('Selecciona un chat antes de enviar.'); return; }
  const content = msgInput.value.trim();
  if (!content) return;
  socket.emit('send_message', { chatId: activeChatId, content });
  msgInput.value = '';
});

searchChatsInput.addEventListener('input', () => {
  const term = searchChatsInput.value.trim().toLowerCase();
  if (!term) { renderChatList(chatsCache); return; }
  renderChatList(chatsCache.filter((chat) => chat.name.toLowerCase().includes(term)));
});

document.getElementById('refresh-chats').addEventListener('click', loadChats);
document.getElementById('open-create-chat-modal').addEventListener('click', openModal);
document.getElementById('create-chat').addEventListener('click', createChat);
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('cancel-create-chat').addEventListener('click', closeModal);
document.getElementById('toggle-sidebar-top').addEventListener('click', toggleSidebar);
document.getElementById('toggle-sidebar-left').addEventListener('click', toggleSidebar);

createModal.addEventListener('click', (event) => {
  if (event.target === createModal) closeModal();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && createModal.classList.contains('show')) {
    closeModal();
  }
});

init().catch(console.error);
