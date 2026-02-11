import { useEffect, useRef, useCallback} from 'react';
import { getFirestore, collection, query, where, orderBy, onSnapshot, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useChatStore } from '../store/useChatStore';
import useDebounce from './useDebounce';
import { db } from '../firebase';

const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');

export const useMessages = () => {
  const { user, activeChat, setMessages, setTypingUsers } = useChatStore();
  const messagesEndRef = useRef(null);

  // Load messages
  useEffect(() => {
    if (!user || !activeChat) {
      setMessages([]);
      return;
    }
    
    const chatId = getChatId(user.uid, activeChat);
    const q = query(
      collection(db, 'messages'), 
      where('chatId', '==', chatId), 
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, err => {
      console.error('Messages snapshot error:', err);
      console.error('User UID:', user?.uid)
    });
    
    return () => unsubscribe();
  }, [user, activeChat, setMessages]);

  // Listen typing status
  useEffect(() => {
    if (!user || !activeChat) {
      setTypingUsers([]);
      return;
    }
    
    const chatId = getChatId(user.uid, activeChat);
    const q = query(
      collection(db, 'chats', chatId, 'typing'),
      where('isTyping', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const typers = snapshot.docs
        .filter(doc => doc.id !== user.uid)
        .map(doc => doc.data().displayName);
      setTypingUsers(typers);
    });
    
    return () => unsubscribe();
  }, [user, activeChat, setTypingUsers]);

  // Cleanup typing on unmount/chat change
  useEffect(() => {
    return () => {
      if (user && activeChat) {
        const chatId = getChatId(user.uid, activeChat);
        setDoc(doc(db, 'chats', chatId, 'typing', user.uid), {
          isTyping: false,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(console.error);
      }
    };
  }, [user, activeChat]);

  const sendMessage = async (text) => {
    if (!text.trim() || !user || !activeChat) return;

    const chatId = getChatId(user.uid, activeChat);
    
    try {
      await addDoc(collection(db, 'messages'), {
        chatId,
        text,
        createdAt: serverTimestamp(),
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        recipientId: activeChat
      });

      const updateData = { lastMessage: text, lastMessageAt: serverTimestamp() };
      
      await Promise.all([
        setDoc(doc(db, 'users', user.uid, 'myContacts', activeChat), updateData, { merge: true }),
        setDoc(doc(db, 'users', activeChat, 'myContacts', user.uid), updateData, { merge: true }),
        setDoc(doc(db, 'chats', chatId, 'typing', user.uid), { isTyping: false }, { merge: true })
      ]);
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  // Typing status with debounce
  const updateTyping = useDebounce(async (isTyping) => {
    if (!user || !activeChat) return;
    
    const chatId = getChatId(user.uid, activeChat);
    await setDoc(doc(db, 'chats', chatId, 'typing', user.uid), {
      displayName: user.displayName,
      isTyping,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }, 500);

  const handleTyping = useCallback((text) => {
    updateTyping(text.length > 0);
  }, [updateTyping]);

  return { sendMessage, handleTyping, messagesEndRef };
};