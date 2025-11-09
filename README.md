# Tournament Control

A web application for managing martial arts tournaments with real-time ring and event tracking.

## Features

- Adjustable number of rings per tournament
- 8 standard martial arts events + team events
- Judges interface for selecting current events
- Staff dashboard for monitoring all rings in real-time
- WebSocket-based live updates

## Setup

1. Install dependencies:
```bash
npm install
cd client && npm install && cd ..
```

2. Run the application:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:3001
- Frontend on http://localhost:3000

## Usage

1. **Setup**: Create a tournament and specify number of rings
2. **Judges Interface**: Select your ring and choose the current event from dropdown
3. **Staff Dashboard**: View all rings and their current events in real-time

## Events

- Forms
- Weapons
- Combat Sparring
- Traditional Sparring
- Creative Forms
- Creative Weapons
- XMA Forms
- XMA Weapons
- Team Combat Sparring/Team Sparring
