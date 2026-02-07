import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from './store/useChatStore';
import { initializeApp } from 'firebase/app';

import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  setDoc,
  getDoc,
  getDocs, 
  where
} from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export default function App() {
  const user = useChatStore(state => state.user);
  const loading = useChatStore(state => state.loading);
  const setUser = useChatStore(state => state.setUser);
  const setLoading = useChatStore(state => state.setLoading);
  const contacts = useChatStore(state => state.contacts);
  const setContacts = useChatStore(state => state.setContacts);
  const activeChat = useChatStore(state => state.activeChat);
  const setActiveChat = useChatStore(state => state.setActiveChat);
  const messages = useChatStore(state => state.messages);
  const setMessages = useChatStore(state => state.setMessages);
  const typingUsers = useChatStore(state => state.typingUsers);
  const setTypingUsers = useChatStore(state => state.setTypingUsers);

  const [newMessage, setNewMessage] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const messagesEndRef = useRef(null);

  // 1. Auth & Profile Setup
  useEffect(() => {
    const[loading, setLoading] = useState(true);
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        await setDoc(doc(db, 'users', u.uid), {
          uid: u.uid,
          email: u.email.toLowerCase(),
          displayName: u.displayName || 'Anonymous',
          photoURL: u.photoURL || 'https://via.placeholder.com/40',
          lastSeen: serverTimestamp()
        }, { merge: true });
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Listen to Contacts (Сортировка по последнему сообщению)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'myContacts'),
      orderBy('lastMessageAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = [];
      snapshot.forEach((doc) => usersList.push(doc.data()));
      setContacts(usersList);
    }, (error) => {
        console.error("Snapshot error: ", error);
    });
    return () => unsubscribe();
  }, [user]);

  const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');

  // 3. Add Contact
  const addContactByEmail = async (e) => {
    e.preventDefault();
    const targetEmail = searchEmail.toLowerCase().trim();
    if (!targetEmail || targetEmail === user.email) return;

    setIsSearching(true);
    setSearchError("");

    try {
      const q = query(collection(db, 'users'), where('email', '==', targetEmail));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setSearchError("User not found");
        return;
      }

      const foundUser = snapshot.docs[0].data();
      const contactRef = doc(db, 'users', user.uid, 'myContacts', foundUser.uid);
      const contactSnap = await getDoc(contactRef);

      if (contactSnap.exists()) {
        setSearchError("Contact already in list");
        return;
      }

      const sharedData = { addedAt: serverTimestamp(), lastMessage: "", lastMessageAt: serverTimestamp() };

      await setDoc(doc(db, 'users', user.uid, 'myContacts', foundUser.uid), {
        ...sharedData, uid: foundUser.uid, displayName: foundUser.displayName, photoURL: foundUser.photoURL, email: foundUser.email
      });

      await setDoc(doc(db, 'users', foundUser.uid, 'myContacts', user.uid), {
        ...sharedData, uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, email: user.email
      });

      setSearchEmail("");
    } catch (err) {
      setSearchError("Error adding contact");
    } finally {
      setIsSearching(false);
    }
  };

  // 4. Load Messages
  useEffect(() => {
    if (!user || !activeChat) {
      setMessages([]);
      return;
    }
    const chatId = getChatId(user.uid, activeChat);
    const q = query(collection(db, 'messages'), where('chatId', '==', chatId), orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [user, activeChat]);

  // 5. Send Message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeChat) return;

    const chatId = getChatId(user.uid, activeChat);
    const text = newMessage;
    setNewMessage("");

    try {
      await addDoc(collection(db, 'messages'), {
        chatId, text, createdAt: serverTimestamp(), uid: user.uid,
        displayName: user.displayName, photoURL: user.photoURL, recipientId: activeChat
      });

      const updateData = { lastMessage: text, lastMessageAt: serverTimestamp() };
      await setDoc(doc(db, 'users', user.uid, 'myContacts', activeChat), updateData, { merge: true });
      await setDoc(doc(db, 'users', activeChat, 'myContacts', user.uid), updateData, { merge: true });
      await setDoc(doc(db, 'typingStatus', user.uid), { isTyping: false }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTyping = async (e) => {
    setNewMessage(e.target.value);
    const chatId = getChatId(user.uid, activeChat);
    if (user && activeChat) {
      await setDoc(doc(db,'chats', chatId, 'typing', user.uid), {
        displayName: user.displayName, isTyping: e.target.value.length > 0, updatedAt: serverTimestamp()
      })
    }
  };

  // 6. Typing Status Listener
  useEffect(() => {
    if (!user || !activeChat) return;
    const unsubscribe = onSnapshot(doc(db, 'typingStatus', activeChat), (doc) => {
      const data = doc.data();
      setTypingUsers(data?.isTyping && data?.chattingWith === user.uid ? [data.displayName] : []);
    });
    return () => unsubscribe();
  }, [user, activeChat]);

  const styles = {
    container: { display: 'flex', maxWidth: '1100px', height: '95vh', margin: '10px auto', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' },
    sidebar: { width: '350px', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' },
    chat: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f7f9fa' },
    header: { padding: '16px 20px', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '12px' },
    contact: (active) => ({ 
        padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', 
        backgroundColor: active ? '#f0f4ff' : 'transparent', borderLeft: active ? '4px solid #667eea' : '4px solid transparent',
        transition: '0.2s'
    }),
    bubble: (isMine) => ({ 
        alignSelf: isMine ? 'flex-end' : 'flex-start', backgroundColor: isMine ? '#667eea' : '#fff', 
        color: isMine ? '#fff' : '#333', padding: '10px 16px', borderRadius: isMine ? '16px 16px 2px 16px' : '16px 16px 16px 2px', 
        maxWidth: '70%', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '8px' 
    }),
    input: { width: '100%', padding: '12px 16px', borderRadius: '24px', border: '1px solid #e0e0e0', outline: 'none', fontSize: '14px' }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;

  if (!user) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <button onClick={() => signInWithPopup(auth, googleProvider)} style={{ padding: '15px 30px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>Sign in with Google</button>
    </div>
  );

  const activeContactData = contacts.find(c => c.uid === activeChat);

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <img src={user.photoURL} style={{ width: '36px', height: '36px', borderRadius: '50%' }} alt="" />
          <div style={{ flex: 1, fontWeight: '700' }}>{user.displayName}</div>
          <button onClick={() => signOut(auth)} style={{ border: 'none', background: 'none', color: '#ff4d4d', cursor: 'pointer' }}>Logout</button>
        </div>

        <div style={{ padding: '15px' }}>
          <form onSubmit={addContactByEmail} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input type="email" placeholder="Find by email..." value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} style={{ ...styles.input, borderRadius: '8px' }} />
            <button type="submit" disabled={isSearching} style={{ padding: '10px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              {isSearching ? 'Searching...' : '+ Add Friend'}
            </button>
            {searchError && <span style={{ color: 'red', fontSize: '11px' }}>{searchError}</span>}
          </form>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '10px 20px', fontSize: '11px', color: '#999', fontWeight: 'bold' }}>CHATS</div>
          {contacts.map(c => (
            <div key={c.uid} onClick={() => setActiveChat(c.uid)} style={styles.contact(activeChat === c.uid)}>
              <img src={c.photoURL} style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.displayName}</div>
                  {c.lastMessageAt && <span style={{ fontSize: '10px', color: '#bbb' }}>{c.lastMessageAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#777', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.lastMessage || "No messages yet"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.chat}>
        {activeChat ? (
          <>
            <div style={styles.header}>
              <img src={activeContactData?.photoURL} style={{ width: '36px', height: '36px', borderRadius: '50%' }} alt="" />
              <div style={{ fontWeight: '700' }}>{activeContactData?.displayName}</div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' }}>
              {messages.map((msg) => (
                <div key={msg.id} style={styles.bubble(msg.uid === user.uid)}>
                  <div style={{ fontSize: '15px' }}>{msg.text}</div>
                  <div style={{ fontSize: '10px', opacity: 0.6, textAlign: 'right', marginTop: '4px' }}>
                    {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '0 25px', height: '20px', fontSize: '12px', color: '#667eea', fontStyle: 'italic' }}>
              {typingUsers.length > 0 && `${typingUsers[0]} is typing...`}
            </div>

            <form onSubmit={sendMessage} style={{ padding: '20px', display: 'flex', gap: '12px', backgroundColor: '#fff' }}>
              <input value={newMessage} onChange={handleTyping} placeholder="Write a message..." style={styles.input} />
              <button type="submit" style={{ width: '45px', height: '45px', borderRadius: '50%', border: 'none', background: '#667eea', color: '#fff', cursor: 'pointer', fontSize: '20px' }}>➤</button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
            <span style={{ fontSize: '64px' }}>💬</span>
            <p>Select a friend to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}