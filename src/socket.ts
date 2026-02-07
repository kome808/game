import { io } from 'socket.io-client';

// 假設伺服器在本地 3001 端口
const URL = 'http://localhost:3001';

export const socket = io(URL, {
    autoConnect: false
});
