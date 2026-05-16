import { firestoreDb, rtdb } from './firebase-admin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { ServerValue } from 'firebase-admin/database';

export async function getOrCreateUser(uid, displayName, email, photoURL = '') {
  const ref = firestoreDb.collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({ displayName, email, photoURL, createdAt: FieldValue.serverTimestamp() });
  }
  return { id: uid, displayName, email };
}

export async function getUserByDisplayName(displayName) {
  const snap = await firestoreDb.collection('users')
    .where('displayName', '==', displayName)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function getChatsForUser(uid) {
  const snap = await firestoreDb.collection('chats')
    .where('participants', 'array-contains', uid)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
    participants: doc.data().participants,
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
  }));
}

export async function createChat(name, participantUids) {
  const ref = await firestoreDb.collection('chats').add({
    name,
    participants: participantUids,
    createdAt: FieldValue.serverTimestamp(),
  });
  const snap = await ref.get();
  return {
    id: snap.id,
    name: snap.data().name,
    participants: snap.data().participants,
    createdAt: snap.data().createdAt?.toDate?.()?.toISOString() ?? null,
  };
}

export async function getMessages(chatId, limit = 500) {
  const snap = await rtdb.ref(`messages/${chatId}`)
    .orderByChild('createdAt')
    .limitToLast(limit)
    .once('value');
  const messages = [];
  snap.forEach((child) => {
    messages.push({ id: child.key, ...child.val() });
  });
  return messages;
}

export async function saveMessage(chatId, { senderId, senderName, content }) {
  const messageData = {
    chatId,
    senderId,
    senderName,
    content,
    createdAt: ServerValue.TIMESTAMP,
  };
  const ref = await rtdb.ref(`messages/${chatId}`).push(messageData);
  return { id: ref.key, chatId, senderId, senderName, content, createdAt: Date.now() };
}
