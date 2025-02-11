<!-- components/GameBoard.vue -->
<template>
  <div class="relative min-h-screen bg-black overflow-hidden">
    <!-- Animated Stars Background -->
    <div class="stars-container">
      <div id="stars"></div>
      <div id="stars2"></div>
      <div id="stars3"></div>
    </div>

    <!-- Translation Countdown Timer -->
    <div v-if="gameState.room.status === 'playing'" 
         class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 
                bg-blue-900/90 text-green-400 px-6 py-2 rounded-lg shadow-lg 
                border border-blue-500">
      <b> {{ gameState.room.round === 'answer' ? 'Answer' : gameState.room.round === 'question' ? 'Question' : 'Translation' }} Round </b> • Ends in {{ translationCountdown }} second(s)...
    </div>

    <!-- Main game content with padding for lobby -->
    <div class="p-8 pr-72">
      <div class="max-w-4xl mx-auto">
        <!-- Header with room info -->
        <div class="flex justify-between items-center mb-8">
          <h1 class="text-3xl font-bold text-green-400">Spacecape</h1>
          
          <div class="flex items-center gap-4">            
            <div class="text-blue-400 relative z-10">
              Room: 
              <span class="font-semibold text-green-400 select-all bg-gray-900/50 px-2 py-1 rounded cursor-pointer" 
                    @click="copyRoomKey" 
                    :title="copyStatus">
                {{ roomKey }}
              </span>
            </div>
          </div>
        </div>

        <!-- Chat Panel -->
        <div class="flex justify-between items-center">
          <div class="p-4 w-full">
            <!-- Chat Component -->
            <GameChat 
              :player-nickname="playerNickname"
              :room-key="roomKey"
              :messages="messages"
              :is-send-disabled="isChatDisabled"
              :current-round="gameState.room.round"
              @send-message="sendMessage"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Fixed Lobby Sidebar -->
    <div class="fixed top-0 right-0 h-screen w-64 bg-gray-900 shadow-lg z-20 border-l border-blue-900">
      <div class="p-4 space-y-4">
        <!-- Room Status -->
        <div class="text-center pb-4 border-b border-blue-800">
          <div class="text-blue-400">
            Playing as: <span class="font-semibold text-green-400">{{ playerNickname }}</span>
          </div>
          <p class="text-sm mt-2" :class="gameState.room.status === 'waiting' ? 'text-yellow-500' : 'text-green-500'">
            {{ gameState.room.status === 'waiting' ? 'Waiting for players...' : 'Game in progress' }}
          </p>
        </div>

        <!-- Player List -->
        <div class="space-y-2">
          <h4 class="font-medium text-blue-400">Players</h4>
          <ul class="space-y-2">
            <li
                v-for="[nickname, player] in (gameState.room.players instanceof Map 
                                              ? Array.from(gameState.room.players.entries()) 
                                              : Object.entries(gameState.room.players))"
                :key="nickname"
                class="flex items-center justify-between p-2 bg-gray-800 rounded border border-blue-900"
            >
             <span class="flex items-center gap-2 text-blue-300">
               {{ nickname }}
               <span v-if="isHost(nickname)" class="text-xs text-green-400">(Captain)</span>
             </span>
              <span v-if="gameState.room.status === 'waiting' && !isHost(nickname)"
                    :class="player.ready ? 'text-green-500' : 'text-gray-500'"
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
               'w-full py-2 rounded transition-colors border',
               isPlayerReady 
                 ? 'bg-green-700 hover:bg-green-600 text-green-100 border-green-500'
                 : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
             ]"
          >
            {{ isPlayerReady ? 'Ready' : 'Not Ready' }}
          </button>

          <!-- Start button for host -->
          <button
              v-if="isHost(playerNickname)"
              @click="onStartGame"
              :disabled="!canStartGame"
              class="w-full py-2 bg-blue-700 text-blue-100 rounded hover:bg-blue-600 
                    border border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Game
          </button>
          <p v-if="isHost(playerNickname) && !canStartGame" class="text-sm text-red-400 text-center">
            Waiting for all players to be ready
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';

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

// Add these refs for copy functionality
const copyStatus = ref('Click to copy');

// Watch for game status change to start the countdown
watch(() => gameState.value.room.status, (newStatus) => {
  if (newStatus === 'playing') {
    // Reset countdown to 10 seconds
    translationCountdown.value = 10;
    
    // Start countdown timer
    countdownTimer.value = setInterval(() => {
      translationCountdown.value--;
      
      // Stop timer when countdown reaches 0
      if (translationCountdown.value <= 0) {
        translationCountdown.value = 10;
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
  const [host] = Object.keys(gameState.value.room.players);
  return host === nickname;
}

// Move the computed property below the isHost function
const isChatDisabled = computed(() => {
  const round = gameState.value.room.round;
  const isHostPlayer = isHost(playerNickname.value);
  const hasPlayerSentMessage = gameState.value.room.players[playerNickname.value]?.hasSentMessage;

  // Disable if game not playing or during translation
  if (gameState.value.room.status !== 'playing' || round === 'translation') return true;
  
  // Disable if player already sent message this round
  if (hasPlayerSentMessage) return true;
  
  // Disable if question round and not host
  if (round === 'question' && !isHostPlayer) return true;
  
  // Disable if answer round and is host
  if (round === 'answer' && isHostPlayer) return true;

  return false;
});

function toggleReady() {
  setPlayerReady(!isPlayerReady.value);
}

function onStartGame() {
  if (canStartGame.value) {
    startGame();
  }
}

// Generate star shadows
onMounted(() => {
  const generateStars = (count, size) => {
    let value = '';
    for(let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * window.innerWidth);
      const y = Math.floor(Math.random() * window.innerHeight);
      value += `${x}px ${y}px #FFF${i === count - 1 ? '' : ','}`;
    }
    return value;
  };

  // Generate and set star shadows
  const root = document.documentElement;
  root.style.setProperty('--stars-shadow-1', generateStars(700, 1));
  root.style.setProperty('--stars-shadow-2', generateStars(200, 2));
  root.style.setProperty('--stars-shadow-3', generateStars(100, 3));
});

// Add copy function
async function copyRoomKey() {
  try {
    await navigator.clipboard.writeText(props.roomKey);
    copyStatus.value = 'Copied!';
    setTimeout(() => {
      copyStatus.value = 'Click to copy';
    }, 2000);
  } catch (err) {
    copyStatus.value = 'Failed to copy';
    setTimeout(() => {
      copyStatus.value = 'Click to copy';
    }, 2000);
  }
}
</script>

<style scoped>
.stars-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 150%;
  height: 150%;
  z-index: 0;
}

#stars {
  width: 1px;
  height: 1px;
  background: transparent;
  box-shadow: var(--stars-shadow-1);
  animation: animateStars 300s linear infinite;
  opacity: 0.5;
}

#stars2 {
  width: 2px;
  height: 2px;
  background: transparent;
  box-shadow: var(--stars-shadow-2);
  animation: animateStars 600s linear infinite;
  opacity: 0.5;
}

#stars3 {
  width: 3px;
  height: 3px;
  background: transparent;
  box-shadow: var(--stars-shadow-3);
  animation: animateStars 900s linear infinite;
  opacity: 0.5;
}

@keyframes animateStars {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(0);
  }
}
</style>