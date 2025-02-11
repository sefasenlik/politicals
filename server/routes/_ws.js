// server/routes/_ws.js
import { generateAIResponse } from '../ai-chat.js';

const rooms = {} // Store our rooms
const clients = {}  // Store client -> room mapping
const clientIds = new WeakMap(); // Store client IDs
const TRANSLATION_COUNTDOWN = 10000; // 10 seconds
const QUESTION_COUNTDOWN = 20000; // 20 seconds
const ANSWER_COUNTDOWN = 30000; // 30 seconds

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
            round: 'question',
            players: {}
        },
        pendingMessages: {}, // Track messages from each player
        translationTimer: null
    };

    return true;
}

function startTranslationCountdown(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // Clear any existing timer
    if (room.translationTimer) {
        clearTimeout(room.translationTimer);
    }

    // Start a new countdown timer
    room.translationTimer = setTimeout(async () => {
        // If we're in translation round, move to question round
        if (room.room.round === 'translation') {
            room.room.round = 'question';
            broadcastToRoom(roomId, {
                type: 'GAME_STATE',
                payload: room
            });
            // Start next countdown
            startTranslationCountdown(roomId);
            return;
        }

        // If we're in question round, move to answer round
        if (room.room.round === 'question') {
            room.room.round = 'answer';
            broadcastToRoom(roomId, {
                type: 'GAME_STATE',
                payload: room
            });
            // Start next countdown
            startTranslationCountdown(roomId);
            return;
        }

        // If we're in answer round, process messages and move to translation
        if (room.room.round === 'answer') {
            await processPendingMessages(roomId);
        }
    }, TRANSLATION_COUNTDOWN);
}

// Add helper to process all pending messages
async function processPendingMessages(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // Only process if we're in the answer round
    if (room.room.round !== 'answer') {
        return;
    }

    try {
        // Format messages for all players, including those who didn't send a message
        const playersMessages = Object.entries(room.room.players).map(([nickname, player]) => {
            // Skip the host (first player)
            if (nickname === Object.keys(room.room.players)[0]) {
                return null;
            }

            return {
                clientID: player.clientId,
                message: room.pendingMessages[nickname] || "NO_MESSAGE_SENT"
            };
        }).filter(Boolean); // Remove null entries (host)

        // Prepare the message object for AI
        const messageObject = {
            players: playersMessages
        };

        // Send to AI for translation
        const aiResponse = await generateAIResponse(JSON.stringify(messageObject));
        
        if (aiResponse) {
            // Parse the AI response back from JSON
            const parsedResponse = JSON.parse(aiResponse);
            
            // Transform into user-friendly format
            const formattedResponse = parsedResponse.players
                .map((player, index) => {
                    const message = player.message === "NO_MESSAGE_SENT" 
                        ? "Did not send a message" 
                        : player.message;
                    return `Passenger ${index + 1}: "${message}"`;
                })
                .join('\n');

            const aiMessageStr = JSON.stringify({
                type: 'CHAT_MESSAGE',
                payload: {
                    roomKey: roomId,
                    sender: "AI Translation",
                    text: formattedResponse,
                    timestamp: Date.now(),
                    isPrivate: false
                }
            });

            // Broadcast AI response to all clients
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

        // Clear pending messages
        room.pendingMessages = {};

        // Reset hasSentMessage flag for all players
        Object.values(room.room.players).forEach(player => {
            player.hasSentMessage = false;
        });

        // Move to translation round
        room.room.round = 'translation';
        
        // Broadcast the updated room state
        broadcastToRoom(roomId, {
            type: 'GAME_STATE',
            payload: room
        });

        // Start the countdown for the next round
        startTranslationCountdown(roomId);
    } catch (error) {
        console.error('[WebSocket] Error generating AI response:', error);
    }
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
    // No need to delete from clientIds as it's a WeakMap

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

                    // Check if player has already sent a message this round
                    if (player.hasSentMessage) {
                        peer.send(JSON.stringify({
                            type: 'ERROR',
                            payload: 'You can only send one message per round'
                        }));
                        return;
                    }

                    // Get host nickname (first player in the room)
                    const [hostNickname] = Object.keys(room.room.players);
                    const isHostMessage = data.payload.sender === hostNickname;

                    // Mark that the player has sent a message this round
                    player.hasSentMessage = true;

                    // Create message payload
                    const messagePayload = {
                        roomKey: roomId,
                        sender: data.payload.sender,
                        text: data.payload.text,
                        timestamp: data.payload.timestamp,
                        isPrivate: !isHostMessage // Only non-host messages are private
                    };

                    if (isHostMessage) {
                        // If host message, broadcast to all clients
                        for (const [clientId, clientData] of Object.entries(clients)) {
                            if (clientData.room === roomId) {
                                try {
                                    clientData.socket.send(JSON.stringify({
                                        type: 'CHAT_MESSAGE',
                                        payload: messagePayload
                                    }));
                                } catch (error) {
                                    console.error('[WebSocket] Failed to send chat message to client:', error);
                                    removeClientFromRoom(clientData.socket, roomId);
                                }
                            }
                        }
                    } else {
                        // If non-host message, only send to sender and store for translation
                        peer.send(JSON.stringify({
                            type: 'CHAT_MESSAGE',
                            payload: messagePayload
                        }));
                        
                        // Store the message for translation
                        room.pendingMessages[data.payload.sender] = data.payload.text;
                    }

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
                        clientId,
                        hasSentMessage: false
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
                        clientId,
                        hasSentMessage: false
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

                    // System message is sent to all clients
                    const messageStr = JSON.stringify({
                        type: 'CHAT_MESSAGE',
                        payload: {
                            roomKey: roomId,
                            sender: "System",
                            text: "The game has commenced. Captain will ask questions to determine which pod holds the android. Don't get left behind.",
                            timestamp: Date.now(),
                            isPrivate: false
                        }
                    });
                   
                    // Send the system message to all clients
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

                    // Start translation countdown
                    startTranslationCountdown(roomId);

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