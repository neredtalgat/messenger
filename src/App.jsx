import React, { useState, useEffect, useRef } from 'react';
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
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const messagesEndRef = useRef(null);

  // 1. Authentication and Profile Setup
  useEffect(() => {
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

  // 2. Listen to Personal Contacts
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'myContacts'),
      orderBy('addedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = [];
      snapshot.forEach((doc) => usersList.push(doc.data()));
      setContacts(usersList);
    });
    return () => unsubscribe();
  }, [user]);

  // Shared Chat ID Generator
  const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');

  // 3. Search and Mutual Contact Addition
  const addContactByEmail = async (e) => {
    e.preventDefault();
    const targetEmail = searchEmail.toLowerCase().trim();
    
    if (!targetEmail) return;
    if (targetEmail === user.email) {
      setSearchError("You cannot add your own email");
      return;
    }

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

      // Check if already in contacts
      const contactRef = doc(db, 'users', user.uid, 'myContacts', foundUser.uid);
      const contactSnap = await getDoc(contactRef);

      if (contactSnap.exists()) {
        setSearchError("Contact already in your list");
        return;
      }

      // Add friend to YOUR list
      await setDoc(doc(db, 'users', user.uid, 'myContacts', foundUser.uid), {
        uid: foundUser.uid,
        displayName: foundUser.displayName,
        photoURL: foundUser.photoURL,
        email: foundUser.email,
        addedAt: serverTimestamp()
      });

      // Add YOU to friend's list (Mutual)
      await setDoc(doc(db, 'users', foundUser.uid, 'myContacts', user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        email: user.email,
        addedAt: serverTimestamp()
      });

      setSearchEmail("");
      alert("Contact added successfully!");
    } catch (err) {
      console.error(err);
      setSearchError("Access error");
    } finally {
      setIsSearching(false);
    }
  };

  // 4. Load Chat Messages
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
    });
    return () => unsubscribe();
  }, [user, activeChat]);

  // 5. Send Message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeChat) return;

    const chatId = getChatId(user.uid, activeChat);
    await addDoc(collection(db, 'messages'), {
      chatId,
      text: newMessage,
      createdAt: serverTimestamp(),
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      recipientId: activeChat
    });
    setNewMessage("");
    await setDoc(doc(db, 'typingStatus', user.uid), { isTyping: false }, { merge: true });
  };

  const handleTyping = async (e) => {
    setNewMessage(e.target.value);
    if (user && activeChat) {
      await setDoc(doc(db, 'typingStatus', user.uid), {
        displayName: user.displayName,
        isTyping: e.target.value.length > 0,
        chattingWith: activeChat
      }, { merge: true });
    }
  };

  // 6. "Is Typing..." Status
  useEffect(() => {
    if (!user || !activeChat) return;
    const unsubscribe = onSnapshot(doc(db, 'typingStatus', activeChat), (doc) => {
      const data = doc.data();
      if (data?.isTyping && data?.chattingWith === user.uid) {
        setTypingUsers([data.displayName]);
      } else {
        setTypingUsers([]);
      }
    });
    return () => unsubscribe();
  }, [user, activeChat]);

  const styles = {
    container: { display: 'flex', maxWidth: '1100px', height: '95vh', margin: '10px auto', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', overflow: 'hidden', fontFamily: '-apple-system, system-ui, sans-serif' },
    sidebar: { width: '350px', borderRight: '1px solid #f0f0f0', backgroundColor: '#fff', display: 'flex', flexDirection: 'column' },
    chat: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f7f9fa' },
    header: { padding: '16px 20px', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '12px' },
    contact: (active) => ({ padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: active ? '#f0f4ff' : 'transparent', transition: '0.2s', borderLeft: active ? '4px solid #667eea' : '4px solid transparent' }),
    bubble: (isMine) => ({ alignSelf: isMine ? 'flex-end' : 'flex-start', backgroundColor: isMine ? '#667eea' : '#fff', color: isMine ? '#fff' : '#333', padding: '10px 16px', borderRadius: isMine ? '16px 16px 2px 16px' : '16px 16px 16px 2px', maxWidth: '70%', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '4px' }),
    searchBox: { padding: '20px', borderBottom: '1px solid #f0f0f0' },
    input: { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0e0e0', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading application...</div>;

  if (!user) {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, #4f46e5, #7c3aed, #2563eb)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Card Container */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '3rem',
        borderRadius: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>

        {/* Text Section */}
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: '800',
          color: '#111827',
          marginBottom: '0.5rem',
          letterSpacing: '-0.025em'
        }}>
          Welcome to Pro Chat
        </h1>
        
        <p style={{
          color: '#4b5563',
          fontSize: '1rem',
          marginBottom: '2.5rem',
          lineHeight: '1.5'
        }}>
          Experience seamless real-time messaging with your friends worldwide.
        </p>

        {/* Google Button */}
        <button 
          onClick={() => signInWithPopup(auth, googleProvider)}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            width: '100%',
            padding: '0.875rem',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            color: '#374151',
            fontWeight: '600',
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            style={{ width: '20px', height: '20px' }} 
          />
          Sign in with Google
        </button>

        {/* Footer */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #f3f4f6',
          fontSize: '0.875rem',
          color: '#9ca3af'
        }}>
          Secure login powered by Firebase
        </div>
      </div>
    </div>
  );
}

  const activeContact = contacts.find(c => c.uid === activeChat);

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <img src={user.photoURL} style={{ width: '36px', height: '36px', borderRadius: '50%' }} alt="" />
          <div style={{ flex: 1, fontWeight: '700' }}>{user.displayName}</div>
          <button onClick={() => signOut(auth)} style={{ border: 'none', background: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '13px' }}>Logout</button>
        </div>

        <div style={styles.searchBox}>
          <form onSubmit={addContactByEmail} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input 
              type="email" 
              placeholder="Friend's email..." 
              value={searchEmail} 
              onChange={(e) => setSearchEmail(e.target.value)} 
              style={styles.input} 
            />
            <button type="submit" disabled={isSearching} style={{ padding: '8px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              {isSearching ? 'Searching...' : '+ Add Contact'}
            </button>
            {searchError && <span style={{ color: 'red', fontSize: '11px' }}>{searchError}</span>}
          </form>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '15px 20px', fontSize: '11px', color: '#999', fontWeight: 'bold' }}>MY CONTACTS ({contacts.length})</div>
          {contacts.map(c => (
            <div key={c.uid} onClick={() => setActiveChat(c.uid)} style={styles.contact(activeChat === c.uid)}>
              <img src={c.photoURL} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt="" />
              <div style={{ fontWeight: '600' }}>{c.displayName}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT AREA */}
      <div style={styles.chat}>
        {activeChat ? (
          <>
            <div style={styles.header}>
              <img src={activeContact?.photoURL} style={{ width: '36px', height: '36px', borderRadius: '50%' }} alt="" />
              <div style={{ fontWeight: '700' }}>{activeContact?.displayName}</div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' }}>
              {messages.map((msg) => (
                <div key={msg.id} style={styles.bubble(msg.uid === user.uid)}>
                  <div style={{ fontSize: '15px' }}>{msg.text}</div>
                  <div style={{ fontSize: '10px', opacity: 0.7, textAlign: 'right', marginTop: '4px' }}>
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
              <input 
                value={newMessage} 
                onChange={handleTyping}
                placeholder="Type a message..." 
                style={{ ...styles.input, borderRadius: '24px', padding: '12px 20px' }} 
              />
              <button type="submit" style={{ width: '45px', height: '45px', borderRadius: '50%', border: 'none', background: '#667eea', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                ➤
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
            <span style={{ fontSize: '60px' }}>💬</span>
            <p>Select a chat or add a friend via Email</p>
          </div>
        )}
      </div>
    </div>
  );
}