<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header with nickname -->
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Political Game Board</h1>
        <div class="text-gray-600">
          Playing as: <span class="font-semibold">{{ playerNickname }}</span>
        </div>
      </div>

      <!-- Game board grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div v-for="territory in gameState?.territories"
             :key="territory.id"
             class="relative">
          <button
              @click="onClaim(territory.id)"
              :disabled="territory.owner"
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

      <!-- Reset button -->
      <div class="flex justify-center">
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
</template>

<script setup>
import { onMounted } from 'vue';
import { useGame } from '~/composables/useGame';

const { gameState, connect, claimTerritory, resetGame, playerNickname } = useGame();

const onClaim = (territoryId) => {
  claimTerritory(territoryId);
};

const onResetGame = () => {
  resetGame();
};

onMounted(() => {
  connect();
});
</script>