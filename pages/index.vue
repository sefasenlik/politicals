<!-- pages/index.vue -->
<template>
  <div>
    <NicknameEntry v-if="!playerNickname" @nicknamechosen="startGame" />
    <GameBoard v-else />
  </div>
</template>

<script setup>
const playerNickname = ref(null)

const startGame = (nickname) => {
  playerNickname.value = nickname
  // Store in localStorage for persistence
  if (process.client) {
    localStorage.setItem('playerNickname', nickname)
  }
}

// Check for existing nickname on mount
onMounted(() => {
  if (process.client) {
    const savedNickname = localStorage.getItem('playerNickname')
    if (savedNickname) {
      playerNickname.value = savedNickname
    }
  }
})
</script>