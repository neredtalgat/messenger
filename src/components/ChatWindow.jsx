import React, { useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useMessages } from '../hooks/useMessages';
import ChatBubble from './ChatBubble.jsx';  // ✅ Импортируем новый компонент

const styles = {
  chat: { 
    flex: 1, 
    display: 'flex', 
    flexDirection: 'column', 
    backgroundColor: '#f7f9fa', 
    height: '100%' 
  },
  header: { 
    padding: '16px 20px', 
    backgroundColor: '#fff', 
    borderBottom: '1px solid #f0f0f0', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px' 
  },
  messages: { 
    flex: 1, 
    overflowY: 'auto', 
    padding: '20px', 
    display: 'flex', 
    flexDirection: 'column' 
  },
  typing: { 
    padding: '0 25px', 
    height: '20px', 
    fontSize: '12px', 
    color: '#667eea', 
    fontStyle: 'italic' 
  },
  inputBox: { 
    padding: '20px', 
    display: 'flex', 
    gap: '12px', 
    backgroundColor: '#fff' 
  },
  input: { 
    flex: 1, 
    padding: '12px 16px', 
    borderRadius: '24px', 
    border: '1px solid #e0e0e0', 
    outline: 'none', 
    fontSize: '14px' 
  },
  sendBtn: { 
    width: '45px', 
    height: '45px', 
    borderRadius: '50%', 
    border: 'none', 
    background: '#667eea', 
    color: '#fff', 
    cursor: 'pointer', 
    fontSize: '20px' 
  },
  empty: { 
    flex: 1, 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    color: '#ccc' 
  }
};

export default function ChatWindow() {
  const { user, activeChat, contacts, messages, typingUsers } = useChatStore();
  const { sendMessage, handleTyping, messagesEndRef } = useMessages();
  const [text, setText] = useState('');

  const activeContact = contacts.find(c => c.uid === activeChat);

  const onSubmit = (e) => {
    e.preventDefault();
    sendMessage(text);
    setText('');
  };

  const onChange = (e) => {
    setText(e.target.value);
    handleTyping(e.target.value);
  };

  if (!activeChat) {
    return (
      <div style={styles.chat}>
        <div style={styles.empty}>
          <span style={{ fontSize: '64px' }}>💬</span>
          <p>Select a friend to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.chat}>
      {/* Header */}
      <div style={styles.header}>
        <img 
          src={activeContact?.photoURL} 
          style={{ width: '36px', height: '36px', borderRadius: '50%' }} 
          alt="" 
        />
        <div style={{ fontWeight: '700' }}>{activeContact?.displayName}</div>
      </div>

      {/* Messages с ChatBubble */}
      <div style={styles.messages}>
        {messages.map((msg) => (
          <ChatBubble 
            key={msg.id} 
            msg={msg} 
            isMine={msg.uid === user.uid}
            showAvatar={true}  // Показывать аватар собеседника
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      <div style={styles.typing}>
        {typingUsers.length > 0 && `${typingUsers[0]} is typing...`}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} style={styles.inputBox}>
        <input 
          value={text} 
          onChange={onChange} 
          placeholder="Write a message..." 
          style={styles.input} 
        />
        <button type="submit" style={styles.sendBtn}>➤</button>
      </form>
    </div>
  );
}