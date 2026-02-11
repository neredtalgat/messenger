import React, { useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuth } from '../hooks/useAuth';
import { useContacts } from '../hooks/useContacts';

const styles = {
  sidebar: { width: '350px', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', height: '100%' },
  header: { padding: '16px 20px', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '12px' },
  searchBox: { padding: '15px', borderBottom: '1px solid #f0f0f0' },
  input: { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e0e0e0', outline: 'none', fontSize: '14px', marginBottom: '8px' },
  button: { width: '100%', padding: '10px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  contact: (active) => ({ 
    padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', 
    backgroundColor: active ? '#f0f4ff' : 'transparent', 
    borderLeft: active ? '4px solid #667eea' : '4px solid transparent',
    transition: '0.2s'
  }),
  contactList: { overflowY: 'auto', flex: 1 },
  sectionTitle: { padding: '10px 20px', fontSize: '11px', color: '#999', fontWeight: 'bold' }
};

export default function Sidebar() {
  const { user, contacts, activeChat, setActiveChat } = useChatStore();
  const { logout } = useAuth();
  const { addContact } = useContacts();
  
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleAddContact = async (e) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchError('');
    
    const result = await addContact(searchEmail);
    
    if (result.error) {
      setSearchError(result.error);
    } else {
      setSearchEmail('');
    }
    
    setIsSearching(false);
  };

  return (
    <div style={styles.sidebar}>
      {/* Header */}
      <div style={styles.header}>
        <img src={user?.photoURL} style={{ width: '36px', height: '36px', borderRadius: '50%' }} alt="" />
        <div style={{ flex: 1, fontWeight: '700' }}>{user?.displayName}</div>
        <button onClick={logout} style={{ border: 'none', background: 'none', color: '#ff4d4d', cursor: 'pointer' }}>
          Logout
        </button>
      </div>

      {/* Search */}
      <div style={styles.searchBox}>
        <form onSubmit={handleAddContact}>
          <input
            type="email"
            placeholder="Find by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            style={styles.input}
          />
          <button type="submit" disabled={isSearching} style={styles.button}>
            {isSearching ? 'Searching...' : '+ Add Friend'}
          </button>
          {searchError && <span style={{ color: 'red', fontSize: '11px' }}>{searchError}</span>}
        </form>
      </div>

      {/* Contacts List */}
      <div style={styles.contactList}>
        <div style={styles.sectionTitle}>CHATS</div>
        {contacts.map(c => (
          <div 
            key={c.uid} 
            onClick={() => setActiveChat(c.uid)} 
            style={styles.contact(activeChat === c.uid)}
          >
            <img src={c.photoURL} style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.displayName}
                </div>
                {c.lastMessageAt && (
                  <span style={{ fontSize: '10px', color: '#bbb' }}>
                    {c.lastMessageAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#777', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.lastMessage || "No messages yet"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}