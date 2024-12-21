<!-- components/NicknameEntry.vue -->
<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <h1 class="text-2xl font-bold text-gray-800 mb-6 text-center">
        Join Political Game
      </h1>
      <form @submit.prevent="onSubmit" class="space-y-4">
        <div>
          <label for="nickname" class="block text-sm font-medium text-gray-700 mb-1">
            Choose your nickname
          </label>
          <input
              id="nickname"
              v-model="nickname"
              type="text"
              required
              minlength="2"
              maxlength="15"
              class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :class="{ 'border-red-500': error }"
              placeholder="Enter nickname..."
          />
          <p v-if="error" class="mt-1 text-sm text-red-500">{{ error }}</p>
        </div>
        <button
            type="submit"
            class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md
                 transition duration-200 font-medium focus:outline-none focus:ring-2 
                 focus:ring-blue-500 focus:ring-offset-2"
        >
          Join Game
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
const nickname = ref('')
const error = ref('')
const emit = defineEmits(['nicknamechosen'])

const onSubmit = () => {
  if (nickname.value.trim().length < 2) {
    error.value = 'Nickname must be at least 2 characters'
    return
  }
  error.value = ''
  emit('nicknamechosen', nickname.value.trim())
}
</script>