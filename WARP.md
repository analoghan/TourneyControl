# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Setup
```bash
npm install
cd client && npm install && cd ..
```

### Running the Application
```bash
# Start both backend and frontend
npm run dev

# Run backend only (port 3001)
npm run server

# Run frontend only (port 3000)
npm run client
```

### Building for Production
```bash
# Build the frontend (outputs to client/dist)
npm run build

# Start production server
npm start
```

## Architecture Overview

This is a **real-time martial arts tournament management system** with a Node.js/Express backend and React (Vite) frontend.

### Backend Architecture (`server/`)

- **server/index.js** - Main Express server with WebSocket support
  - REST API endpoints for tournaments and rings
  - WebSocket server for real-time updates
  - Broadcasts ring updates to all connected clients
  
- **server/database.js** - SQLite database initialization and migrations
  - `tournaments` table: stores tournament metadata and status (not_started, active, ended)
  - `rings` table: stores ring state including current event and category filters (gender, age_bracket, rank, division)
  - Includes migration logic to add columns to existing tables

### Frontend Architecture (`client/src/`)

- **Routing** - React Router with two main interfaces:
  - `/judges` - Judges Interface (select ring, update current event/categories)
  - `/staff` - Staff Dashboard (create tournaments, view all rings)

- **Components** (`client/src/components/`)
  - `JudgesInterface.jsx` - Interface for judges to control individual ring events
  - `StaffInterface.jsx` - Admin interface for managing tournaments and viewing all rings

- **Hooks** (`client/src/hooks/`)
  - `useWebSocket.js` - Custom hook for WebSocket connection to receive real-time updates

- **Constants** (`client/src/constants/`)
  - `categories.js` - Defines all event types, genders, age brackets, ranks, and divisions

### Real-Time Communication

- Backend uses `ws` library to create WebSocket server on same port as Express (3001)
- Frontend connects to WebSocket and receives two message types:
  - `ring_update` - When a ring's event or category changes
  - `tournament_status_change` - When a tournament status changes (not_started → active → ended)
- All connected clients automatically receive updates without polling

### State Management Pattern

- **Optimistic Updates**: Frontend updates local state immediately, then reverts if API call fails
- **Tournament Status Flow**: not_started → active → ended (enforced by backend, only one-way transitions)
- **Ring Updates Blocked**: Once tournament status is "ended", ring updates return 403 error

### API Proxy

Vite dev server (port 3000) proxies `/api/*` requests to Express backend (port 3001) to avoid CORS issues during development.

### Database

SQLite database stored at `server/tournament.db`. Schema automatically initialized on first run with migrations for backward compatibility.
