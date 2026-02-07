import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store rooms in memory
// roomCode -> { players: [socketId, ...], gameState: ... }
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('create_room', () => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        rooms.set(roomCode, { players: [socket.id] });
        socket.join(roomCode);
        socket.emit('room_created', { roomCode, player: 'PLAYER1' });
        console.log(`Room ${roomCode} created by ${socket.id}`);
    });

    socket.on('join_room', (roomCode) => {
        const room = rooms.get(roomCode);
        if (!room) {
            socket.emit('error', '房間不存在');
            return;
        }

        if (room.players.length >= 2) {
            socket.emit('error', '房間已滿');
            return;
        }

        room.players.push(socket.id);
        socket.join(roomCode);
        socket.emit('room_joined', { roomCode, player: 'PLAYER2' });

        // Notify P1 that P2 joined
        io.to(roomCode).emit('player_joined', { playerCount: room.players.length });

        // If full, start game
        if (room.players.length === 2) {
            io.to(roomCode).emit('game_start');
        }

        console.log(`${socket.id} joined room ${roomCode}`);
    });

    // Sync game state
    socket.on('update_game_state', ({ roomCode, state }) => {
        // Broadcast to others in the room
        socket.to(roomCode).emit('on_game_state_update', state);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Cleanup logic (optional for prototype)
        rooms.forEach((value, key) => {
            if (value.players.includes(socket.id)) {
                // Remove player
                // Ideally notify other player
                socket.to(key).emit('player_disconnected');
                rooms.delete(key);
            }
        });
    });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`Socket.io server running on http://localhost:${PORT}`);
});
