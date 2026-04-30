export interface Conversation {
  id: number;
  name: string;
  created_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'model';
  content: string;
  image_url?: string;
  generated_image_url?: string;
  config?: ImageConfig;
  created_at: string;
}

export interface ImageConfig {
  size: '512px' | '1K' | '2K' | '4K';
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  style: string;
  texture: string;
  color: string;
}
