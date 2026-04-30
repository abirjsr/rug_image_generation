import { Conversation, Message, ImageConfig } from "../types";

const API_BASE = "/api";

export const api = {
  getConversations: async (): Promise<Conversation[]> => {
    const res = await fetch(`${API_BASE}/conversations`);
    return res.json();
  },
  createConversation: async (name?: string): Promise<Conversation> => {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return res.json();
  },
  getConversationMessages: async (id: number): Promise<Message[]> => {
    const res = await fetch(`${API_BASE}/conversations/${id}`);
    const data = await res.json();
    return data.messages;
  },
  renameConversation: async (id: number, name: string): Promise<Conversation> => {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return res.json();
  },
  deleteConversation: async (id: number): Promise<void> => {
    await fetch(`${API_BASE}/conversations/${id}`, { method: "DELETE" });
  },
  addMessage: async (
    conversationId: number,
    role: "user" | "model",
    content: string,
    imageUrl?: string,
    generatedImageUrl?: string,
    config?: ImageConfig
  ): Promise<Message> => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content, image_url: imageUrl, generated_image_url: generatedImageUrl, config }),
    });
    return res.json();
  },
  updateMessage: async (id: number, content: string): Promise<Message> => {
    const res = await fetch(`${API_BASE}/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    return res.json();
  },
  deleteMessage: async (id: number): Promise<void> => {
    await fetch(`${API_BASE}/messages/${id}`, { method: "DELETE" });
  },
};
