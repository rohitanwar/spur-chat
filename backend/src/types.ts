export interface Message {
  id: string;
  conversationId: string;
  sender: 'user' | 'ai';
  text: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}