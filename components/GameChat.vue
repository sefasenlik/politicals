<!-- components/GameChat.vue -->
<template>
    <div class="h-[80vh] flex flex-col bg-gray-900/95 rounded-lg shadow-md border border-blue-900 relative z-10">
      <!-- Chat Messages Area -->
      <div class="flex-1 p-4 overflow-y-auto" ref="chatContainer">
        <div v-for="(message, index) in visibleMessages" 
             :key="index"
             class="mb-4"
             :class="message.sender === playerNickname ? 'text-right' : 'text-left'"
        >
          <div class="inline-block max-w-[80%] rounded-lg px-4 py-2"
               :class="message.sender === playerNickname ? 'bg-blue-700 text-blue-100 border border-blue-500' 
                 : message.sender === 'System' ? 'bg-gray-800 text-green-400 border border-green-500'
                 : message.sender === 'AI Translation' ? 'bg-purple-900 text-purple-100 border border-purple-500'
                 : 'bg-gray-800 text-blue-100 border border-blue-900'"
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
      <div class="p-4 border-t border-blue-900 bg-gray-900">
        <div class="flex gap-2">
          <input
            v-model="newMessage"
            type="text"
            placeholder="Type your message..."
            class="flex-1 px-4 py-2 bg-gray-800 text-blue-100 border border-blue-900 rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-blue-300
                   relative z-10"
            @keyup.enter="sendMessage"
            :disabled="isSendDisabled"
          />

          <!-- Send button -->
          <button
            class="px-6 py-2 bg-blue-700 text-blue-100 rounded-lg hover:bg-blue-600 
                  transition-colors duration-200 focus:outline-none focus:ring-2 
                  focus:ring-blue-500 focus:ring-offset-2 border border-blue-500
                  relative z-10"
            @click="sendMessage"
            :disabled="isSendDisabled"
            :style="isSendDisabled ? disabledButtonStyle : {}"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, watch, computed } from 'vue';
  
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
    },
    isSendDisabled: {
      type: Boolean,
      required: true
    }
  });

  const disabledButtonStyle = {
    backgroundColor: '#1e3a8a', // darker blue
    borderColor: '#3b82f6',
    cursor: 'not-allowed',
    opacity: '0.5',
  };
  
  const emit = defineEmits(['sendMessage']);
  
  const newMessage = ref('');
  const chatContainer = ref(null);
  
  // Computed property to filter messages
  const visibleMessages = computed(() => {
    return props.messages.filter(message => 
        !message.isPrivate || // Show non-private messages (AI Translation, System)
        message.sender === props.playerNickname || // Show user's own messages
        message.sender === 'System' || // Always show system messages
        message.sender === 'AI Translation' // Always show AI translations
    );
  });
  
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