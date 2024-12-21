// server/routes/_ws.js

const gameState = {
    territories: [
        { id: 't1', owner: null },
        { id: 't2', owner: null },
        { id: 't3', owner: null },
        { id: 't4', owner: null },
        { id: 't5', owner: null },
    ],
};

// Keep track of all connected clients
const clients = new Set();

function broadcastGameState() {
    const message = JSON.stringify({
        type: 'GAME_STATE',
        payload: gameState,
    });

    // Broadcast to ALL connected clients
    for (const client of clients) {
        client.send(message);
    }
}
export default defineWebSocketHandler({
    open(peer) {
        console.log('[WebSocket] New connection:');
        // Add new client to our set
        clients.add(peer);
        // Send the current game state to the new client
        peer.send(
            JSON.stringify({
                type: 'GAME_STATE',
                payload: gameState,
            })
        );
    },

    message(peer, message) {
        try {
            const data = JSON.parse(message.text());

            switch (data.type) {
                case 'CLAIM_TERRITORY':
                    const territory = gameState.territories.find((t) => t.id === data.territoryId);

                    if (territory && !territory.owner) {
                        territory.owner = data.playerNickname;
                        broadcastGameState();
                    } else {
                        peer.send(JSON.stringify({
                            type: 'ERROR',
                            payload: 'Territory already claimed or not found',
                        }));
                    }
                    break;
                case 'RESET_GAME':
                    // Reset all territories to unclaimed
                    gameState.territories.forEach((territory) => {
                        territory.owner = null;
                    });

                    // Broadcast the updated game state
                    broadcastGameState();
                    break;

                // Add future actions here, e.g., chat messages, moves, etc.
                // Ensure every action that modifies the game state calls `broadcastGameState`.

                default:
                    console.warn('[WebSocket] Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
            peer.send(
                JSON.stringify({
                    type: 'ERROR',
                    payload: 'Invalid message format',
                })
            );
        }
    },

    close(peer) {
        clients.delete(peer);
        console.log('[WebSocket] Connection closed:');
    },
});
