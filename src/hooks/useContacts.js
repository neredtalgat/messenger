import { useEffect } from 'react';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, setDoc, getDoc, getDocs, where, serverTimestamp } from 'firebase/firestore';
import { useChatStore } from '../store/useChatStore';
import { db } from '../firebase';

export const useContacts = () => {
  const { user, setContacts, setActiveChat } = useChatStore();

  // Замени orderBy на фильтрацию в коде
useEffect(() => {
  if (!user) return;
  
  const q = query(
    collection(db, 'users', user.uid, 'myContacts')
    // ❌ Убрано: orderBy('lastMessageAt', 'desc') — вызывает проблемы с индексами
  );
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const usersList = snapshot.docs
      .map(doc => doc.data())
      .sort((a, b) => {
        // Сортируем вручную, ставим без lastMessageAt в конец
        const aTime = a.lastMessageAt?.toMillis?.() || 0;
        const bTime = b.lastMessageAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
    setContacts(usersList);
  });
  
  return () => unsubscribe();
}, [user, setContacts]);

  const addContact = async (email) => {
    if (!user || !email) return { error: 'Invalid data' };
    
    const targetEmail = email.toLowerCase().trim();
    if (targetEmail === user.email) return { error: 'Cannot add yourself' };

    try {
      const q = query(collection(db, 'users'), where('email', '==', targetEmail));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return { error: 'User not found' };

      const foundUser = snapshot.docs[0].data();
      const contactRef = doc(db, 'users', user.uid, 'myContacts', foundUser.uid);
      const contactSnap = await getDoc(contactRef);

      if (contactSnap.exists()) return { error: 'Contact already exists' };

      const sharedData = { 
        addedAt: serverTimestamp(), 
        lastMessage: "", 
        lastMessageAt: serverTimestamp() 
      };

      await Promise.all([
        setDoc(doc(db, 'users', user.uid, 'myContacts', foundUser.uid), {
          ...sharedData, 
          uid: foundUser.uid, 
          displayName: foundUser.displayName, 
          photoURL: foundUser.photoURL, 
          email: foundUser.email
        }),
        setDoc(doc(db, 'users', foundUser.uid, 'myContacts', user.uid), {
          ...sharedData, 
          uid: user.uid, 
          displayName: user.displayName, 
          photoURL: user.photoURL, 
          email: user.email
        })
      ]);

      return { success: true };
    } catch (err) {
      console.error(err);
      return { error: 'Failed to add contact' };
    }
  };

  return { addContact };
};