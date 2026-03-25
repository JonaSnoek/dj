import { io } from 'socket.io-client';

// In production (behind nginx) connect to same origin; in dev use localhost:3000
const API_URL = import.meta.env.VITE_API_URL || '';

const socket = io(API_URL || window.location.origin);
export default socket;
