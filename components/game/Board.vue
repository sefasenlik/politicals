<!-- components/GameBoard.vue -->
<template>
  <div class="relative min-h-screen bg-gray-100">
    <!-- Translation Countdown Timer -->
    <div v-if="gameState.room.status === 'playing'" 
         class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 
                bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg">
      Round change in {{ translationCountdown }} seconds...
    </div>

    <!-- Main game content with padding for lobby -->
    <div class="p-8 pr-72">
      <div class="max-w-4xl mx-auto">
        <!-- Header with room info -->
        <div class="flex justify-between items-center mb-8">
          <h1 class="text-3xl font-bold text-gray-800">Spaceship Escape</h1>
          
          <div class="flex items-center gap-4">            
            <div class="text-gray-600">
              Room: <span class="font-semibold">{{ roomKey }}</span>
            </div>
          </div>
        </div>
      
        <!-- Chat Panel -->
        <div v-if="gameState.room.status === 'playing'" class="flex justify-between items-center">
          <div class="p-4 w-full">
            <!-- Chat Component -->
            <GameChat 
              :player-nickname="playerNickname"
              :room-key="roomKey"
              :messages="messages"
              @send-message="sendMessage"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Fixed Lobby Sidebar -->
    <div class="fixed top-0 right-0 h-screen w-64 bg-white shadow-lg z-20">
      <div class="p-4 space-y-4">
        <!-- Room Status -->
        <div class="text-center pb-4 border-b">
          <div class="text-gray-600">
            Playing as: <span class="font-semibold">{{ playerNickname }}</span>
          </div>
          <p class="text-sm mt-2" :class="gameState.room.status === 'waiting' ? 'text-yellow-500' : 'text-green-500'">
            {{ gameState.room.status === 'waiting' ? 'Waiting for players...' : 'Game in progress' }}
          </p>
        </div>

        <!-- Player List -->
        <div class="space-y-2">
          <h4 class="font-medium text-gray-700">Players</h4>
          <ul class="space-y-2">
            <li
                v-for="[nickname, player] in (gameState.room.players instanceof Map 
                                              ? Array.from(gameState.room.players.entries()) 
                                              : Object.entries(gameState.room.players))"
                :key="nickname"
                class="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
             <span class="flex items-center gap-2">
               {{ nickname }}
               <span v-if="isHost(nickname)" class="text-xs text-blue-500">(Host)</span>
             </span>
              <span v-if="gameState.room.status === 'waiting' && !isHost(nickname) "
                    :class="player.ready ? 'text-green-500' : 'text-gray-400'"
              >
               {{ player.ready ? '✓ Ready' : 'Not ready' }}
             </span>
            </li>
          </ul>
        </div>   

        <!-- Game Actions -->
        <div v-if="gameState.room.status === 'waiting'" class="space-y-2">
          <!-- Ready button for non-host players -->
          <button
              v-if="!isHost(playerNickname)"
              @click="toggleReady"
              :class="[
               'w-full py-2 rounded transition-colors',
               isPlayerReady 
                 ? 'bg-green-500 hover:bg-green-600 text-white'
                 : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
             ]"
          >
            {{ isPlayerReady ? 'Ready' : 'Not Ready' }}
          </button>

          <!-- Start button for host -->
          <button
              v-if="isHost(playerNickname)"
              @click="onStartGame"
              :disabled="!canStartGame"
              class="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 
                  disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Game
          </button>
          <p v-if="isHost(playerNickname) && !canStartGame" class="text-sm text-red-500 text-center">
            Waiting for all players to be ready
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  roomKey: {
    type: String,
    required: true
  }
});

const {
  gameState,
  playerNickname,
  setPlayerReady,
  startGame,
  messages,
  sendChatMessage
} = inject('game');

// Add a ref for the countdown
const translationCountdown = ref(30);
const countdownTimer = ref(null);

// Watch for game status change to start the countdown
watch(() => gameState.value.room.status, (newStatus) => {
  if (newStatus === 'playing') {
    // Reset countdown to 30 seconds
    translationCountdown.value = 30;
    
    // Start countdown timer
    countdownTimer.value = setInterval(() => {
      translationCountdown.value--;
      
      // Stop timer when countdown reaches 0
      if (translationCountdown.value <= 0) {
        clearInterval(countdownTimer.value);
      }
    }, 1000);
  }
});

// Optional: Clear interval if component is unmounted
onUnmounted(() => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value);
  }
});

// Chat handler
const sendMessage = (text) => {
  sendChatMessage(text);
};

// Computed properties
const isPlayerReady = computed(() => {
  const player = gameState.value.room.players[playerNickname.value];
  return player?.ready || false;
});

const canStartGame = computed(() => {
  const players = Object.values(gameState.value.room.players);
  return players.length >= 2 && players.every(player => player.ready);
});

// Helper functions
function isHost(nickname) {
  // First player in the room is the host
  const players = Object.keys(gameState.value.room.players);
  return players[0] === nickname;
}

function toggleReady() {
  setPlayerReady(!isPlayerReady.value);
}

function onStartGame() {
  if (canStartGame.value) {
    startGame();
  }
}
</script>