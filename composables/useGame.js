import { ref } from 'vue';

// Move gameState inside the composable to avoid shared state between users
export function useGame() {
    const gameState = ref({ territories: [] });
    let ws = null;
    const playerNickname = ref(null);
    
    // Move all browser-specific code into onMounted or onBeforeMount
    onMounted(() => {
        // Get or create player ID
        const storedNickname = localStorage.getItem('playerNickname');
        if (storedNickname) {
            playerNickname.value = storedNickname;
        }
        // Connect to WebSocket
        connect();
    });
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

        const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/_ws`;
        ws = new WebSocket(url);

        ws.onopen = () => {
            console.log('[WebSocket] Connected');
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                switch (message.type) {
                    case 'GAME_STATE':
                        // Ensure reactive update
                        gameState.value = { ...message.payload };
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