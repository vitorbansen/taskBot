import axios from 'axios';

const baseURL =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL // SSR
    : process.env.NEXT_PUBLIC_API_URL || '/api'; // client-side fallback

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;