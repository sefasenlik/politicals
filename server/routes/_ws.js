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

// Track clients with a Map instead of Set for better debugging
const clients = new Map();

function broadcastGameState() {
    const message = JSON.stringify({
        type: 'GAME_STATE',
        payload: gameState,
    });

    // Log before broadcast
    clients.forEach((client, id) => {
        client.send(message);
    });
}

export default defineWebSocketHandler({
    open(peer) {
        const peerId = Math.random().toString(36).substring(7);

        clients.set(peerId, peer);

        // Send initial state
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
                        peer.send(
                            JSON.stringify({
                                type: 'ERROR',
                                payload: 'Territory already claimed or not found',
                            })
                        );
                    }
                    break;

                case 'RESET_GAME':
                    gameState.territories.forEach((territory) => {
                        territory.owner = null;
                    });
                    broadcastGameState();
                    break;
            }
        } catch (error) {
            console.error('[WebSocket] Error:', error);
            peer.send(
                JSON.stringify({
                    type: 'ERROR',
                    payload: 'Invalid message format',
                })
            );
        }
    },

    close(peer) {
        // Find and remove the disconnected client
        clients.forEach((client, id) => {
            if (client === peer) {
                clients.delete(id);
            }
        });
    },
});