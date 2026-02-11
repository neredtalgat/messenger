import { useEffect } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useChatStore } from '../store/useChatStore';
import { auth, db } from '../firebase';

export const useAuth = () => {
  const setUser = useChatStore((state) => state.setUser);
  const setLoading = useChatStore((state) => state.setLoading);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        try {
          // Обновляем данные пользователя в Firestore
          await setDoc(doc(db, 'users', u.uid), {
            uid: u.uid,
            email: u.email.toLowerCase(),
            displayName: u.displayName || 'Anonymous',
            photoURL: u.photoURL || 'https://via.placeholder.com/40',
            lastSeen: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error("Ошибка при сохранении юзера:", error);
        }
      }
      
      setLoading(false); // Выключаем загрузку только после всех операций
    });
    
    return () => unsubscribe();
  }, [setUser, setLoading]);

  const login = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  return { login, logout };
};