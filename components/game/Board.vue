<!-- components/GameBoard.vue -->
<template>
  <div class="relative min-h-screen bg-gray-100">
    <!-- Main game content with padding for lobby -->
    <div class="p-8 pr-72">
      <div class="max-w-4xl mx-auto">
        <!-- Header with room info -->
        <div class="flex justify-between items-center mb-8">
          <h1 class="text-3xl font-bold text-gray-800">Political Game Board</h1>
          <div class="text-gray-600">
            Room: <span class="font-semibold">{{ roomKey }}</span>
          </div>
        </div>

        <!-- Game board grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div v-for="territory in gameState.territories"
               :key="territory.id"
               class="relative">
            <button
                @click="onClaim(territory.id)"
                :disabled="gameState.room.status === 'waiting' || territory.owner"
                class="w-full p-4 rounded-lg shadow-md transition-all duration-200 border"
                :class="[
                 territory.owner 
                   ? `bg-blue-100 border-blue-300 ${territory.owner === playerNickname ? 'ring-2 ring-blue-500' : ''}` 
                   : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-blue-300'
               ]"
            >
              <div class="font-semibold text-lg mb-1">
                Territory {{ territory.id }}
              </div>
              <div class="text-sm"
                   :class="territory.owner ? 'text-blue-600 font-medium' : 'text-gray-500'">
                {{ territory.owner ? `Claimed by ${territory.owner}` : 'Unclaimed' }}
              </div>
            </button>
          </div>
        </div>

        <!-- Game Actions -->
        <div v-if="gameState.room.status === 'playing'" class="flex justify-center">
          <button
              @click="onResetGame"
              class="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg
                    shadow-md transition-all duration-200 font-medium
                    focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Reset Game
          </button>
        </div>
      </div>
    </div>

    <!-- Fixed Lobby Sidebar -->
    <div class="fixed top-0 right-0 h-screen w-64 bg-white shadow-lg">
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
import { inject } from 'vue';

const props = defineProps({
  roomKey: {
    type: String,
    required: true
  }
});

const {
  gameState,
  playerNickname,
  claimTerritory,
  resetGame,
  setPlayerReady,
  startGame
} = inject('game');

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

// Actions
function onClaim(territoryId) {
  if (gameState.value.room.status === 'playing') {
    claimTerritory(territoryId);
  }
}

function onResetGame() {
  resetGame();
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