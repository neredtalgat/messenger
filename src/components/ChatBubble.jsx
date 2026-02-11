import React, { useState } from 'react';

const styles = {
  container: (isMine) => ({
    alignSelf: isMine ? 'flex-end' : 'flex-start',
    maxWidth: '70%',
    marginBottom: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: isMine ? 'flex-end' : 'flex-start',
  }),
  bubble: (isMine) => ({
    backgroundColor: isMine ? '#667eea' : '#fff',
    color: isMine ? '#fff' : '#333',
    padding: '12px 16px',
    borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    position: 'relative',
    wordBreak: 'break-word',
  }),
  senderName: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '4px',
    fontWeight: '600',
  },
  text: {
    fontSize: '15px',
    lineHeight: '1.4',
  },
  time: (isMine) => ({
    fontSize: '10px',
    opacity: 0.7,
    marginTop: '6px',
    textAlign: isMine ? 'left' : 'right',
  }),
  status: {
    fontSize: '10px',
    marginLeft: '4px',
    opacity: 0.8,
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    marginRight: '8px',
    alignSelf: 'flex-end',
  },
  row: {
    display: 'flex',
    alignItems: 'flex-end',
  },
  menu: {
    position: 'absolute',
    top: '-30px',
    right: '0',
    background: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    borderRadius: '8px',
    padding: '4px',
    display: 'flex',
    gap: '4px',
    zIndex: 10,
  },
  menuBtn: {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    fontSize: '12px',
    borderRadius: '4px',
  }
};

export default function ChatBubble({ msg, isMine, showAvatar = false }) {
  const [showMenu, setShowMenu] = useState(false);

  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return '';
    return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDelete = () => {
    // TODO: добавить логику удаления
    console.log('Delete message:', msg.id);
    setShowMenu(false);
  };

  const handleReply = () => {
    // TODO: добавить логику ответа
    console.log('Reply to:', msg.id);
    setShowMenu(false);
  };

  return (
    <div 
      style={styles.container(isMine)}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Имя отправителя (только для чужих сообщений в групповом чате) */}
      {!isMine && showAvatar && (
        <div style={styles.senderName}>{msg.displayName}</div>
      )}

      <div style={styles.row}>
        {/* Аватар собеседника */}
        {!isMine && showAvatar && (
          <img src={msg.photoURL} alt="" style={styles.avatar} />
        )}

        <div style={styles.bubble(isMine)}>
          {/* Контекстное меню */}
          {showMenu && (
            <div style={styles.menu}>
              <button onClick={handleReply} style={styles.menuBtn}>↩️</button>
              {isMine && (
                <button onClick={handleDelete} style={{...styles.menuBtn, color: '#ff4d4d'}}>🗑️</button>
              )}
            </div>
          )}

          {/* Текст сообщения */}
          <div style={styles.text}>{msg.text}</div>

          {/* Время и статус */}
          <div style={styles.time(isMine)}>
            {formatTime(msg.createdAt)}
            {isMine && (
              <span style={styles.status}>
                {msg.read ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}