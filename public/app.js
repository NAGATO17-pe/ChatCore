const socket = window.io ? io() : { emit() {}, on() {} };
const layout = document.getElementById('layout');
const usernameInput = document.getElementById('username');
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

let activeChatId = null;
let chatsCache = [];

function normalize(name) {
  return (name || '').trim().replace(/\s+/g, '_').toLowerCase();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function toggleSidebar() {
  layout.classList.toggle('sidebar-collapsed');
}

function openModal() {
  createModal.classList.add('show');
  createModal.setAttribute('aria-hidden', 'false');
  chatNameInput.focus();
}

function closeModal() {
  createModal.classList.remove('show');
  createModal.setAttribute('aria-hidden', 'true');
}

function markSelected(chatId) {
  chatList.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.chatId) === Number(chatId));
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

async function loadChats() {
  const username = normalize(usernameInput.value);
  if (!username) {
    showToast('Primero escribe tu usuario.');
    return;
  }

  const res = await fetch(`/api/chats?username=${encodeURIComponent(username)}`);
  const chats = await res.json();
  chatsCache = Array.isArray(chats) ? chats : [];
  renderChatList(chatsCache);
}

async function openChat(chatId, chatName) {
  activeChatId = chatId;
  chatTitle.textContent = chatName;
  activeChatText.textContent = 'Active now';
  markSelected(chatId);
  socket.emit('join_chat', { chatId });

  const res = await fetch(`/api/chats/${chatId}/messages`);
  const messages = await res.json();
  messagesEl.innerHTML = '';

  if (!Array.isArray(messages) || messages.length === 0) {
    messagesEl.innerHTML = '<li class="message">Aún no hay mensajes en este chat.</li>';
    return;
  }

  messages.forEach(renderMessage);
}

function renderMessage(message) {
  const li = document.createElement('li');
  const self = normalize(usernameInput.value);
  li.className = `message ${message.sender.username === self ? 'outgoing' : ''}`;
  li.innerHTML = `<strong>${message.sender.username}</strong>: ${message.content}<div class="meta">${new Date(message.createdAt).toLocaleString()}</div>`;
  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function createChat() {
  const name = chatNameInput.value.trim();
  const creator = normalize(usernameInput.value);
  const extra = chatUsersInput.value.split(',').map(normalize).filter(Boolean);
  const participants = [...new Set([creator, ...extra])];

  if (!name) {
    showToast('El chat necesita un nombre.');
    return;
  }

  const res = await fetch('/api/chats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, participants })
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

msgForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!activeChatId) {
    showToast('Selecciona un chat antes de enviar.');
    return;
  }

  socket.emit('send_message', {
    chatId: activeChatId,
    sender: normalize(usernameInput.value),
    content: msgInput.value
  });

  msgInput.value = '';
});

socket.on('new_message', (message) => {
  if (Number(message.chatId) === Number(activeChatId)) renderMessage(message);
});

socket.on('chat_error', (err) => {
  showToast(err.message || 'Error en chat');
});

searchChatsInput.addEventListener('input', () => {
  const term = searchChatsInput.value.trim().toLowerCase();
  if (!term) {
    renderChatList(chatsCache);
    return;
  }
  renderChatList(chatsCache.filter((chat) => chat.name.toLowerCase().includes(term)));
});

usernameInput.addEventListener('change', loadChats);
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
