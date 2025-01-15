// server/routes/_ws.js
import { generateAIResponse } from '../ai-chat.js';

const rooms = {} // Store our rooms
const clients = {}  // Store client -> room mapping
const clientIds = new WeakMap(); // Store client IDs

function generateClientId() {
    return Math.random().toString(36).substring(7);
}

// Initialize a room
function createRoom(roomId) {
    if (rooms[roomId]) {
        return false;
    }

    rooms[roomId] = {
        room: {
            id: roomId,
            status: 'waiting',
            players: {}
        },
        territories: [
            { id: 't1', owner: null },
            { id: 't2', owner: null },
            { id: 't3', owner: null },
            { id: 't4', owner: null },
            { id: 't5', owner: null },
        ]
    };

    return true;
}

// Broadcast to all clients in a room
function broadcastToRoom(roomId, message) {
    const room = rooms[roomId];
    if (!room) return;
    
    const payload = room
    const messageStr = JSON.stringify({
        type: message.type,
        payload
    });

    for (const [clientId, clientData] of Object.entries(clients)) {
        if (clientData.room === roomId) {
            try {
                clientData.socket.send(messageStr);
            } catch (error) {
                console.error('[WebSocket] Failed to send to client:', error);
                removeClientFromRoom(clientData.socket, roomId);
            }
        }
    }
}

// Remove client from room and cleanup if needed
function removeClientFromRoom(client, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // Find and remove player
    let disconnectedPlayer = null;
    const clientId = clientIds.get(client);

    Object.entries(room.room.players).forEach(([nickname, player]) => {
        if (player.clientId === clientId) {
            disconnectedPlayer = nickname;
        }
    });

    if (disconnectedPlayer) {
        delete room.room.players[disconnectedPlayer];
    }

    delete clients[clientId];
    // Don't need to delete from clientIds as it's a WeakMap

    // Cleanup empty room
    if (Object.keys(room.room.players).length === 0) {
        delete rooms[roomId];
        console.log(`[WebSocket] Room ${roomId} deleted (empty)`);
        return;
    }

    // Notify remaining players
    broadcastToRoom(roomId, {
        type: 'GAME_STATE',
        payload: room
    });
}

export default defineWebSocketHandler({
    open(peer) {
        // Store unique ID for this client
        clientIds.set(peer, generateClientId());
        console.log('[WebSocket] Client connected:', clientIds.get(peer));
    },

    async message(peer, message) {
        try {
            const data = JSON.parse(message.text());
            const clientId = clientIds.get(peer);
            console.log('[WebSocket] Received from', clientId, ':', data);

            switch (data.type) {
                case 'CHAT_MESSAGE': {
                    const roomId = clients[clientId]?.room;
                    const room = rooms[roomId];
                    if (!room) return;

                    // Verify the sender is in the room
                    const player = room.room.players[data.payload.sender];
                    if (!player || player.clientId !== clientId) {
                        return;
                    }

                    // Broadcast chat message to all clients in the room
                    const messageStr = JSON.stringify({
                        type: 'CHAT_MESSAGE',
                        payload: {
                            roomKey: roomId,
                            sender: data.payload.sender,
                            text: data.payload.text,
                            timestamp: data.payload.timestamp
                        }
                    });

                    for (const [clientId, clientData] of Object.entries(clients)) {
                        if (clientData.room === roomId) {
                            try {
                                clientData.socket.send(messageStr);
                            } catch (error) {
                                console.error('[WebSocket] Failed to send chat message to client:', error);
                                removeClientFromRoom(clientData.socket, roomId);
                            }
                        }
                    }

                    // TEST - START

                    // Generate and send AI response
                    try {
                        const aiResponse = await generateAIResponse(data.payload.text);
                        if (aiResponse) {
                            const aiMessageStr = JSON.stringify({
                                type: 'CHAT_MESSAGE',
                                payload: {
                                    roomKey: roomId,
                                    sender: "AI",
                                    text: aiResponse,
                                    timestamp: Date.now()
                                }
                            });

                            for (const [clientId, clientData] of Object.entries(clients)) {
                                if (clientData.room === roomId) {
                                    try {
                                        clientData.socket.send(aiMessageStr);
                                    } catch (error) {
                                        console.error('[WebSocket] Failed to send AI message to client:', error);
                                        removeClientFromRoom(clientData.socket, roomId);
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error('[WebSocket] Error generating AI response:', error);
                    }

                    // TEST - END

                    break;
                }
                
                case 'CREATE_ROOM': {
                    console.log('Server received CREATE_ROOM request:', data);  // Log the received data

                    if (!data.roomId || !data.playerNickname) {
                        console.log('Invalid data:', { roomId: data.roomId, nickname: data.playerNickname });  // Log the invalid data
                        peer.send(JSON.stringify({
                            type: 'ERROR',
                            payload: 'Invalid room creation data'
                        }));
                        return;
                    }

                    if (!createRoom(data.roomId)) {
                        peer.send(JSON.stringify({
                            type: 'ERROR',
                            payload: 'Room already exists'
                        }));
                        return;
                    }

                    const room = rooms[data.roomId];
                    room.room.players[data.playerNickname] = {
                        nickname: data.playerNickname,
                        ready: true,
                        clientId
                    };

                    clients[clientId] = {
                        socket: peer,
                        room: data.roomId
                    };

                    peer.send(JSON.stringify({
                        type: 'ROOM_CREATED',
                        roomId: data.roomId,
                        payload: room
                    }));

                    peer.send(JSON.stringify({
                        type: 'GAME_STATE',
                        payload: room

                    }));
                    break;
                }

                case 'JOIN_ROOM': {
                    console.log('Server received JOIN_ROOM request:', data);  // Add this log
                    console.log('Available rooms:', Object.keys(rooms));      // Add this log

                    const room = rooms[data.roomId];
                    if (!room) {
                        console.log('Room not found:', data.roomId);         // Add this log
                        peer.send(JSON.stringify({
                            type: 'ERROR',
                            payload: 'Room not found'
                        }));
                        return;
                    }

                    if (room.room.status !== 'waiting') {
                        peer.send(JSON.stringify({
                            type: 'ERROR',
                            payload: 'Game already in progress'
                        }));
                        return;
                    }

                    if (data.playerNickname in room.room.players) {
                        peer.send(JSON.stringify({
                            type: 'ERROR',
                            payload: 'Nickname already taken in this room'
                        }));
                        return;
                    }

                    room.room.players[data.playerNickname] = {
                        nickname: data.playerNickname,
                        ready: false,
                        clientId
                    };

                    clients[clientId] = {
                        socket: peer,
                        room: data.roomId
                    };
                    
                    broadcastToRoom(data.roomId, {
                        type: 'GAME_STATE',
                        payload: room
                    });
                    break;
                }

                case 'PLAYER_READY': {
                    const roomId = clients[clientId]?.room;
                    const room = rooms[roomId];
                    if (!room) return;

                    const player = room.room.players[data.playerNickname]
                    if (player && player.clientId === clientId) {
                        player.ready = data.isReady;
                        broadcastToRoom(roomId, {
                            type: 'GAME_STATE',
                            payload: room
                        });
                    }
                    break;
                }

                case 'START_GAME': {
                    const roomId = clients[clientId]?.room;
                    const room = rooms[roomId];
                    if (!room) return;

                    // Verify request is from host (first player)
                    const [hostNickname] = Object.keys(room.room.players);
                    const requestingPlayer = room.room.players[data.playerNickname]
                    
                    console.log('start game',requestingPlayer?.clientId,clientId,
                        data.playerNickname, hostNickname)
                    if (requestingPlayer?.clientId !== clientId ||
                        data.playerNickname !== hostNickname) {
                        return;
                    }
                    
                    if (Array.from(Object.values(room.room.players)).every(p => p.ready)) {
                        room.room.status = 'playing';
                        broadcastToRoom(roomId, {
                            type: 'GAME_STATE',
                            payload: room
                        });
                    }
                    break;
                }

                case 'CLAIM_TERRITORY': {
                    const roomId = clients[clientId]?.room;
                    const room = rooms[roomId];
                    if (!room || room.room.status !== 'playing') return;

                    const territory = room.territories.find(t => t.id === data.territoryId);
                    if (territory && !territory.owner) {
                        territory.owner = data.playerNickname;
                        broadcastToRoom(roomId, {
                            type: 'GAME_STATE',
                            payload: room
                        });
                    }
                    break;
                }

                case 'RESET_GAME': {
                    const roomId = clients[clientId]?.room;
                    const room = rooms[roomId];
                    if (!room) return;

                    room.territories.forEach(t => t.owner = null);
                    broadcastToRoom(roomId, {
                        type: 'GAME_STATE',
                        payload: room
                    });
                    break;
                }
            }
        } catch (error) {
            console.error('[WebSocket] Error:', error);
            peer.send(JSON.stringify({
                type: 'ERROR',
                payload: 'Server error'
            }));
        }
    },

    close(peer) {
        const clientId = clientIds.get(peer);
        const roomId = clients[clientId]?.room;
        if (roomId) {
            removeClientFromRoom(peer, roomId);
            console.log('[WebSocket] Client disconnected from room:', roomId);
        }
    },
});