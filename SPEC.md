# Technical Specification

## System Overview
The system is a real-time multiplayer territory claiming game built using Nuxt 3, Vue 3 Composition API, Nitro's WebSocket, and Tailwind CSS. The purpose of the system is to provide an engaging multiplayer experience where players can claim territories in real-time, with synchronized game states across all players. The main components include frontend Vue components, backend WebSocket services, and external APIs for additional functionalities.

### Main Components and Their Roles
- **Frontend Components**: Handle user interactions, display game states, and manage player inputs.
  - `components/GameChat.vue`: Manages in-game chat functionality.
  - `components/NicknameModal.vue`: Handles player nickname input and validation.
  - `components/WelcomeScreen.vue`: Manages the initial screen where players can host or join a game.
  - `components/game/Board.vue`: The main game board component where the gameplay occurs.
- **Backend Services**: Manage game logic, WebSocket connections, and real-time updates.
  - `server/ai-chat.js`: Handles AI-generated chat responses.
  - `server/routes/_ws.js`: Manages WebSocket connections, room creation, and game state transitions.
- **Composables**: Manage game state and WebSocket logic.
  - `composables/useGame.js`: Centralizes game state management and WebSocket interactions.
- **Configuration Files**: Set up the development environment and project configurations.
  - `nuxt.config.ts`: Configures the Nuxt.js application.
  - `tailwind.config.js`: Configures TailwindCSS for the project.
  - `package.json`: Defines project dependencies and scripts.
  - `tsconfig.json`: Configures TypeScript for the project.

## Core Functionality
### Primary Features and Their Implementation
1. **Real-time Multiplayer Gameplay**
   - **Components**: `components/game/Board.vue`
   - **Functions**: 
     - `toggleReady`: Manages player readiness.
     - `onStartGame`: Starts the game if all conditions are met.
   - **Data Models**: 
     - `translationCountdown`: Manages the countdown timer for translation rounds.
     - `countdownTimer`: Holds the interval ID for the countdown timer.
     - `isPlayerReady`: Determines if the player is ready.
     - `canStartGame`: Determines if the game can be started.

2. **Nickname Management**
   - **Components**: `components/NicknameModal.vue`
   - **Functions**: 
     - `save`: Validates and saves the nickname.
     - `close`: Closes the modal and emits an event.
   - **Data Models**: 
     - `nickname`: Holds the current nickname input.
     - `error`: Holds any validation error messages.

3. **Game Chat**
   - **Components**: `components/GameChat.vue`
   - **Functions**: 
     - `sendMessage`: Handles sending a chat message.
     - `formatTime`: Formats the timestamp of a message.
   - **Data Models**: 
     - `visibleMessages`: Filters messages to be displayed.

4. **Welcome Screen**
   - **Components**: `components/WelcomeScreen.vue`
   - **Functions**: 
     - `handleHostGame`: Hosts a new game room.
     - `handleJoinGame`: Joins an existing game room.
     - `openNicknameModal`: Opens the nickname modal.
   - **Data Models**: 
     - `currentView`: Determines the current view state.
     - `roomKey`: Holds the room key for joining a game.
     - `generatedRoomKey`: Holds the generated room key for hosting a game.

5. **WebSocket Management**
   - **Composables**: `composables/useGame.js`
   - **Functions**: 
     - `useGame`: Manages game state, WebSocket connection, and user interactions.
   - **Data Flow**: 
     - Manages connection status, error handling, game state, and messages.

6. **AI Chat Responses**
   - **Backend**: `server/ai-chat.js`
   - **Functions**: 
     - `generateAIResponse`: Sends a message to the OpenAI API to generate a response.

7. **WebSocket Server Handling**
   - **Backend**: `server/routes/_ws.js`
   - **Functions**: 
     - `createRoom`: Initializes a new game room.
     - `startTranslationCountdown`: Starts a countdown timer for game rounds.
     - `processPendingMessages`: Processes pending messages and generates AI responses.
     - `broadcastToRoom`: Sends a message to all clients in a room.
     - `removeClientFromRoom`: Removes a client from a room and handles cleanup.

## Architecture
### Data Flow and Component Interaction
1. **User Interaction**:
   - Users interact with the frontend components (`GameChat.vue`, `NicknameModal.vue`, `WelcomeScreen.vue`, `Board.vue`) to perform actions like sending messages, setting nicknames, hosting/joining games, and playing the game.
   
2. **Frontend to Backend Communication**:
   - Frontend components emit events and call functions in `composables/useGame.js` to manage game state and WebSocket interactions.
   - `useGame` composable handles WebSocket connections, room management, and state updates.

3. **Backend Processing**:
   - WebSocket server (`server/routes/_ws.js`) receives messages from clients, processes them, and broadcasts updates to all clients in a room.
   - AI chat responses are generated by `server/ai-chat.js` and sent back to clients.

4. **Real-time Updates**:
   - WebSocket server manages real-time updates, ensuring all clients receive synchronized game states and messages.
   - Countdown timers and game round transitions are handled by the server and broadcasted to clients.

5. **Configuration and Setup**:
   - `nuxt.config.ts` configures the Nuxt.js application, enabling experimental WebSocket support and integrating TailwindCSS.
   - `tailwind.config.js` configures TailwindCSS to scan and style all project files.
   - `package.json` defines project dependencies and scripts for building, developing, and deploying the application.
   - `tsconfig.json` configures TypeScript for the project, ensuring compatibility with Nuxt.js.