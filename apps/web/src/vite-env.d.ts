/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Chatbot page served by the FastAPI ML service, e.g. http://127.0.0.1:8000/chat-ui */
  readonly VITE_CHAT_URL?: string;
}
