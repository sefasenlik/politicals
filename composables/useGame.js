import { ref } from 'vue';

// Move gameState inside the composable to avoid shared state between users
export function useGame() {
    const gameState = ref({ territories: [] });
    let ws = null;
    const playerNickname = ref(null);
    
    if (process.client) {
        const storedNickname = localStorage.getItem('playerNickname');
        if (storedNickname) {
            playerNickname.value = storedNickname;
        }
    }
    const claimTerritory = (territoryId) => {
        if (!process.client) return;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn('[WebSocket] Not connected');
            return;
        }

        // Update local state immediately (optimistic update)
        const territory = gameState.value.territories.find(t => t.id === territoryId);
        if (territory && !territory.owner) {
            territory.owner = playerNickname.value;
        }

        ws.send(
            JSON.stringify({
                type: 'CLAIM_TERRITORY',
                territoryId,
                playerNickname: playerNickname.value,
            })
        );
    };

    const connect = () => {
        if (!process.client) return;
        if (ws) {
            console.log('[WebSocket] Already connected, skipping');
            return;
        }

        const wsUrl = process.env.NODE_ENV === 'production'
            ? 'wss://politicals-ws.bkorhanozdemir.workers.dev'
            : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/_ws`;

        console.log('[WebSocket] Connecting to:', wsUrl);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('[WebSocket] Connected successfully');
        };

        ws.onmessage = (event) => {
            console.log('[WebSocket] Received message:', event.data); // Log raw message
            try {
                const message = JSON.parse(event.data);
                console.log('[WebSocket] Parsed message:', message); // Log parsed message

                switch (message.type) {
                    case 'GAME_STATE':
                        console.log('[WebSocket] Updating game state:', message.payload);
                        gameState.value = { ...message.payload };
                        console.log('[WebSocket] New game state:', gameState.value);
                        break;

                    case 'ERROR':
                        console.error('[WebSocket] Server error:', message.payload);
                        break;

                    default:
                        console.warn('[WebSocket] Unknown message type:', message.type);
                }
            } catch (error) {
                console.error('[WebSocket] Failed to parse message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('[WebSocket] Error:', error);
        };

        ws.onclose = () => {
            console.log('[WebSocket] Connection closed');
            ws = null;
        };
    };
    
    const resetGame = () => {
        if (!process.client) return;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn('[WebSocket] Not connected');
            return;
        }

        ws.send(
            JSON.stringify({
                type: 'RESET_GAME',
            })
        );
    };

    // Clean up on component unmount
    onUnmounted(() => {
        if (ws) {
            ws.close();
            ws = null;
        }
    });

    return {
        gameState,
        connect,
        claimTerritory,
        resetGame,
        playerNickname
    };
}