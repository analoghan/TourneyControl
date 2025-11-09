# Tournament Control

A comprehensive web application for managing martial arts tournaments with real-time ring and event tracking, designed for tournament staff and judges.

## Features

### Tournament Management
- Create tournaments with 1-40 adjustable rings
- Tournament lifecycle management (Not Started → Active → Ended)
- Start and end tournaments with status controls
- Delete ended tournaments to keep interface clean
- Real-time WebSocket updates across all connected clients

### Judges Interface
- Select assigned ring from visual ring selector
- Choose current event from dropdown menu
- Set competition categories:
  - **Gender**: Male or Female
  - **Age Bracket**: Tigers, 8 and Under, 9-10, 11-12, 13-14, 15-17, 18-29, 30-39, 40-49, 50-59, 60+
  - **Rank**: Color Belts, 1st Degree, 2nd-3rd Degree, 4th-5th Degree, Masters
- Team Sparring events use Division instead of Gender/Age/Rank:
  - **Divisions**: Bantam, Rookie, Junior Varsity, Varsity, Elite, Premier, Legends, Executive
- Special status options:
  - **Open**: Ring available for assignment (no categories required)
  - **Judges Needed!**: Alert staff that judges are needed
- Real-time status updates with optimistic UI
- Automatic disabling when tournament ends

### Staff Dashboard
- **Tournament Management Section**:
  - Create new tournaments with custom ring counts
  - View all tournaments with status badges
  - Start/End/Delete tournaments with status-based controls
  
- **Judges Needed Alert**:
  - Prominent red flashing alert when any ring needs judges
  - Lists all rings currently requesting judges
  - Automatically appears/disappears based on ring status

- **Ring Monitoring Grid**:
  - Color-coded event displays for quick identification
  - Real-time updates of all ring information
  - Visual highlighting for special ring statuses:
    - **Green border**: Open rings (available)
    - **Orange border**: Team Sparring events
    - **Red flashing border**: Judges Needed! (urgent)
  - Gender-based category highlighting:
    - **Blue background**: Male divisions
    - **Pink background**: Female divisions
  - Rank-based highlighting:
    - **Orange background**: Color Belts
    - **Black background**: Black Belt ranks (1st-Masters)

### Event Types

**Standard Events:**
- Forms (Blue)
- Weapons (Purple)
- Combat Sparring (Red)
- Traditional Sparring (Amber)
- Creative Forms (Cyan)
- Creative Weapons (Dark Cyan)
- XMA Forms (Green)
- XMA Weapons (Purple)

**Team Events:**
- Team Sparring - Combat (Orange)
- Team Sparring - Traditional (Dark Orange)

**Special Status:**
- Open (Green with pulse animation)
- Judges Needed! (Red with pulse animation)

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

### For Staff

1. **Create Tournament**:
   - Enter tournament name
   - Select number of rings (1-40)
   - Click "Create Tournament"

2. **Start Tournament**:
   - Click "Start" button on tournament
   - Tournament becomes active and visible to judges

3. **Monitor Rings**:
   - View all rings in color-coded grid
   - Check "Rings Needing Judges" alert for urgent requests
   - Monitor event types, gender divisions, age brackets, and ranks

4. **End Tournament**:
   - Click "End" button when tournament is complete
   - Rings become read-only for judges

5. **Delete Tournament**:
   - Click "Delete" button on ended tournaments
   - Removes tournament and all associated ring data

### For Judges

1. **Select Ring**:
   - Choose your assigned ring from the ring selector

2. **Set Event**:
   - Select current event from dropdown

3. **Set Categories** (for standard events):
   - Choose Gender (Male/Female)
   - Select Age Bracket
   - Select Rank

4. **Set Division** (for Team Sparring):
   - Choose Division instead of Gender/Age/Rank

5. **Special Status**:
   - Select "Open" when ring is available
   - Select "Judges Needed!" to alert staff

## Technology Stack

- **Frontend**: React with Vite
- **Backend**: Node.js with Express
- **Database**: SQLite
- **Real-time**: WebSocket (ws library)
- **Styling**: Custom CSS with animations

## Color Coding Guide

### Ring Card Borders
- **White**: Standard events
- **Green**: Open (available)
- **Orange**: Team Sparring
- **Red (flashing)**: Judges Needed!

### Event Colors
- **Blue**: Forms
- **Purple**: Weapons, XMA Weapons
- **Red**: Combat Sparring, Judges Needed!
- **Amber/Orange**: Traditional Sparring, Team events
- **Cyan**: Creative Forms/Weapons
- **Green**: XMA Forms, Open

### Category Colors
- **Blue tint**: Male divisions
- **Pink tint**: Female divisions
- **Orange**: Color Belts
- **Black**: Black Belt ranks
