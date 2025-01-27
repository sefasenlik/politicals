<!-- components/GameChat.vue -->
<template>
    <div class="h-[80vh] flex flex-col bg-white rounded-lg shadow-md">
      <!-- Chat Messages Area -->
      <div class="flex-1 p-4 overflow-y-auto" ref="chatContainer">
        <div v-for="(message, index) in messages" 
             :key="index"
             class="mb-4"
             :class="message.sender === playerNickname ? 'text-right' : 'text-left'"
        >
          <div class="inline-block max-w-[80%] rounded-lg px-4 py-2"
               :class="message.sender === playerNickname 
                 ? 'bg-blue-500 text-white' 
                 : 'bg-gray-100 text-gray-800'"
          >
            <div class="text-sm font-semibold mb-1">
              {{ message.sender }}
            </div>
            <div class="break-words">
              {{ message.text }}
            </div>
            <div class="text-xs opacity-75 mt-1">
              {{ formatTime(message.timestamp) }}
            </div>
          </div>
        </div>
      </div>
  
      <!-- Message Input -->
      <div class="p-4 border-t">
        <div class="flex gap-2">
          <input
            v-model="newMessage"
            type="text"
            placeholder="Type your message..."
            class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                   transition-colors duration-200 focus:outline-none focus:ring-2 
                   focus:ring-blue-500 focus:ring-offset-2"
            @click="sendMessage"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, watch } from 'vue';
  
  const props = defineProps({
    playerNickname: {
      type: String,
      required: true
    },
    roomKey: {
      type: String,
      required: true
    },
    messages: {
      type: Array,
      required: true
    }
  });
  
  const emit = defineEmits(['sendMessage']);
  
  const newMessage = ref('');
  const chatContainer = ref(null);
  
  // Send message
  const sendMessage = () => {
    if (!newMessage.value.trim()) return;
    
    emit('sendMessage', newMessage.value);
    newMessage.value = '';
  };
  
  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Scroll to bottom when new messages arrive
  watch(() => props.messages, () => {
    setTimeout(() => {
      if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
      }
    }, 0);
  }, { deep: true });
  </script>