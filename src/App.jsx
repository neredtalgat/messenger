import React from 'react';
import { useChatStore } from './store/useChatStore';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar.jsx';
import ChatWindow from './components/ChatWindow.jsx';

const styles = {
  container: { 
    display: 'flex', 
    maxWidth: '1100px', 
    height: '95vh', 
    margin: '10px auto', 
    backgroundColor: '#fff', 
    borderRadius: '16px', 
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)', 
    overflow: 'hidden', 
    fontFamily: 'Inter, system-ui, sans-serif' 
  },
  loading: { padding: '50px', textAlign: 'center' },
  login: { 
    height: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
  },
  loginBtn: { 
    padding: '15px 30px', 
    borderRadius: '12px', 
    border: 'none', 
    cursor: 'pointer', 
    fontWeight: 'bold', 
    fontSize: '16px' 
  }
};

export default function App() {
  const { user, loading } = useChatStore();
  const { login } = useAuth();

  if (loading) return <div style={styles.loading}>Loading...</div>;

  if (!user) return (
    <div style={styles.login}>
      <button onClick={login} style={styles.loginBtn}>
        Sign in with Google
      </button>
    </div>
  );

  return (
    <div style={styles.container}>
      <Sidebar />
      <ChatWindow />
    </div>
  );
}