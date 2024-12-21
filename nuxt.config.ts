export default defineNuxtConfig({
  nitro:{
    experimental: {
      websocket: true
    }
  },
  compatibilityDate: '2024-12-21',
  modules: ['@nuxtjs/tailwindcss']
})