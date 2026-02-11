import { LoadBundleTask } from 'firebase/firestore';
import {create} from 'zustand';

export const useChatStore = create((set) => ({
    user: null,
    loading: true,

    contacts: [],
    activeChat: null,

    messages: [],
    typingUsers: [],

    setUser: (user) =>  set({ user }),
    setLoading: (loading) => set({loading}),

    setContacts: (contacts) => set({contacts}),
    setActiveChat: (uid) => set({activeChat: uid}),

    setMessages: (messages) => set({messages}),
    setTypingUsers: (typingUsers) => set({typingUsers})

}));