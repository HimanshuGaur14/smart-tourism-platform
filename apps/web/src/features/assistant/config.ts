/** Address of the chatbot page served by the FastAPI ML service. Set VITE_CHAT_URL in .env. */
export const CHAT_URL = import.meta.env.VITE_CHAT_URL || 'http://127.0.0.1:8000/chat-ui';
export const POPUP_FEATURES = 'width=420,height=700,resizable=yes';
/** How long to wait for a second click before treating a click as a single click. */
export const DOUBLE_CLICK_MS = 250;
