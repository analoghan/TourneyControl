# ATA Region 102 Tournament Control

A comprehensive web application for managing martial arts tournaments with real-time ring and event tracking, designed for ATA tournament staff and judges.

## Features

### Authentication & Session Management
- Role-based login (Judge/Tournament Staff)
- Password-protected access with server-side validation
- 48-hour session persistence with automatic credential caching
- Seamless role switching with session validation
- ATA-branded login page with dark theme

### Tournament Management
- Create tournaments with 1-70 adjustable rings
- Tournament lifecycle management (Not Started → Active → Ended)
- Start, end, and restart tournaments with status controls
- Delete ended tournaments to keep interface clean
- Real-time WebSocket updates across all connected clients
- Collapsible tournament setup section for clean interface

### Judges Interface
- **Ring Selection**:
  - Visual ring selector with collapsible tournament/ring selection
  - Current status display showing event and categories
  
- **Ring Status Controls** (Toggle Buttons with Black Borders):
  - **Ring Open**: Mark ring as available (light green/green with black border when active)
  - **Judges Needed**: Alert staff for judge assistance (light red/red with black border when active)
  
- **Event Selection**:
  - Dropdown menu with 10 event types
  - Automatic category display based on event type
  
- **Competition Categories** (for standard events):
  - **Gender**: Male or Female
  - **Age Bracket**: Tigers, 8 and Under, 9-10, 11-12, 13-14, 15-17, 18-29, 30-39, 40-49, 50-59, 60+
  - **Rank**: Color Belts or Black Belts
  - **Color Belt Selection**: Individual belt buttons (White, Orange, Yellow, Camo, Green, Purple, Blue, Brown, Red, Red/Black)
  - **Black Belt Selection**: Degree buttons (1st, 2nd-3rd, 4th-5th, Masters) with age-based filtering
  
- **Team Sparring Categories**:
  - **Division**: Bantam, Rookie, Junior Varsity, Varsity, Elite, Premier, Legends, Executive
  
- **Additional Options** (for standard events):
  - **Stacked Ring**: Toggle button (light blue/blue with black border when active)
  - **Special Abilities**: Physical (green), Cognitive (orange), Autistic (purple) - all with black borders when active
  
- **Smart UI**:
  - When "Ring Open" is selected, event dropdown and all category options are hidden
  - Color belt buttons show actual belt colors with light/dark states
  - Black belt buttons with gray theme
  - Age-based restrictions (Tigers can't select Black Belts, younger ages can't select Masters)
  - Current status box with centered text and consistent border styling

### Staff Dashboard
- **Tournament Management Section** (Collapsible):
  - Create new tournaments with custom ring counts (1-70)
  - Edit ring count for active tournaments with inline dropdown
  - View all tournaments with status badges
  - Start/End/Restart/Delete tournaments with status-based controls
  - New rings default to "Open" status when created or added
  
- **Alert Sections**:
  - **Judges Needed Alert**: Red flashing section listing rings needing judges
  - **Open Rings Alert**: Green section listing available rings
  - Both sections auto-show/hide based on ring status
  
- **Ring Monitoring Grid**:
  - Full-width badges and information boxes
  - Color-coded event displays for quick identification
  - Real-time updates of all ring information
  - Visual highlighting for special ring statuses:
    - **Green background**: Open rings (overrides all other styling)
    - **Orange background**: Team Sparring events
    - **Red flashing background**: Judges Needed! (urgent)
    - **Blue background**: Stacked rings (hidden when open)
  - Status badges with black borders:
    - **Open Badge**: Large green badge
    - **Judges Needed Badge**: Large red badge
    - **Stacked Ring Badge**: Blue badge
    - **Special Abilities Badges**: Color-coded (Physical-green, Cognitive-orange, Autistic-purple)
  - Category displays with black borders:
    - **Gender/Age**: Blue (Male) or Pink (Female) background
    - **Rank**: Orange (Color Belts) or Black (Black Belts) background
    - **Division**: Orange background for team events
    - **Specific Belts**: Yellow background for color belts, gray for black belts
  - All text in bold black for maximum readability

### Event Types

**Standard Events:**
- Forms (Blue)
- Weapons (Light Purple)
- Combat Sparring (Red)
- Traditional Sparring (Amber)
- Creative Forms (Cyan)
- Creative Weapons (Dark Cyan)
- XMA Forms (Pink/Magenta)
- XMA Weapons (Dark Purple)

**Team Events:**
- Team Sparring - Combat (Orange)
- Team Sparring - Traditional (Dark Orange)

## Setup

### Development

1. Install dependencies:
```bash
npm install
cd client && npm install && cd ..
```

2. Set environment variables (optional):
```bash
# Create .env file in root directory
JUDGES_PASSWORD=your_judge_password
STAFF_PASSWORD=your_staff_password
PORT=3001
```

3. Run the application:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:3001
- Frontend on http://localhost:3000
- WebSocket connection on port 3001

### Production

1. Build the client:
```bash
cd client && npm run build && cd ..
```

2. Start the server:
```bash
NODE_ENV=production node server/index.js
```

### Default Credentials
- **Judges**: `ata`
- **Staff**: `compete2win`

(Change these via environment variables in production)

## Usage

### For Staff

1. **Login**:
   - Click "Tournament Staff Login"
   - Enter password (or auto-login if session is cached)

2. **Create Tournament**:
   - Expand "Tournament Setup" section
   - Enter tournament name
   - Select number of rings (1-70)
   - Click "Create Tournament"
   - All rings default to "Open" status

3. **Edit Ring Count** (Active Tournaments):
   - Click "Edit" button next to ring count
   - Select new ring count from dropdown
   - Click "Save" to apply or "Cancel" to discard
   - New rings are automatically added as "Open"
   - Excess rings are removed from the end

4. **Start Tournament**:
   - Click "Start" button on tournament
   - Tournament becomes active and visible to judges

5. **Monitor Rings**:
   - View all rings in color-coded grid
   - Check "Rings Needing Judges" alert for urgent requests
   - Check "Open Rings" section for available rings
   - Monitor event types, categories, and special statuses

6. **End Tournament**:
   - Click "End" button when tournament is complete
   - Rings become read-only for judges

7. **Restart/Delete Tournament**:
   - Click "Restart" to reactivate an ended tournament
   - Click "Delete" to permanently remove ended tournaments

### For Judges

1. **Login**:
   - Click "Judge Login"
   - Enter password (or auto-login if session is cached)

2. **Select Ring**:
   - Choose your assigned ring from the ring selector
   - Selection area collapses after selection for cleaner interface

3. **Set Ring Status**:
   - Toggle "Ring Open" if ring is available
   - Toggle "Judges Needed" if you need assistance

4. **Set Event**:
   - Select current event from dropdown
   - UI automatically adjusts based on event type

5. **Set Categories** (for standard events):
   - Choose Gender (Male/Female)
   - Select Age Bracket
   - Select Rank (Color Belts or Black Belts)
   - Click specific belt rank buttons to indicate which belts are competing
   - Toggle "Stacked Ring" if applicable
   - Select Special Abilities if applicable

6. **Set Division** (for Team Sparring):
   - Choose Division instead of Gender/Age/Rank

7. **Open Ring Mode**:
   - When "Ring Open" is toggled, event dropdown and all category options are hidden
   - Only "Judges Needed" toggle remains available
   - Current status displays "Open"

## Technology Stack

- **Frontend**: React 18 with Vite
- **Backend**: Node.js with Express
- **Database**: SQLite with automatic migrations
- **Real-time**: WebSocket (ws library) with automatic reconnection
- **Authentication**: Server-side validation with JWT-style tokens
- **Styling**: Custom CSS with ATA branding and animations
- **Routing**: React Router v6

## Design & Branding

- **Color Scheme**: ATA Red (#c8102e) and Dark Gray (#242424) theme throughout
- **Login Page**: Dark background (#242424) with white card, martial arts gi icon (🥋) for staff, scales icon (⚖️) for judges
- **Motto**: "To Compete Is To Win" displayed in bold italic at bottom of login page
- **Navigation**: Dark navbar (#242424) with white text and red logout buttons
- **Ring Number Display**: Large centered ring number with dark gray background and red border (#c91010)
- **Responsive**: Mobile-friendly design with adaptive layouts
- **Accessibility**: High contrast, bold text, clear visual indicators with black borders

## Color Coding Guide

### Ring Card Backgrounds (Staff Page)
- **White**: Standard events
- **Green**: Open (available) - overrides all other styling
- **Orange**: Team Sparring
- **Red (flashing)**: Judges Needed! (urgent)
- **Blue**: Stacked rings (hidden when open)

### Badges (Staff Page)
- **Green**: Open badge (large, full-width)
- **Red**: Judges Needed badge (large, full-width)
- **Blue**: Stacked Ring badge
- **Green**: Special Abilities - Physical
- **Orange**: Special Abilities - Cognitive
- **Purple**: Special Abilities - Autistic

### Category Displays (Staff Page)
- **Blue background**: Male divisions
- **Pink background**: Female divisions
- **Orange background**: Color Belts rank
- **Black background**: Black Belts rank
- **White background**: Team Sparring divisions
- **Yellow background**: Specific color belt selections
- **Gray background**: Specific black belt selections

### Toggle Buttons (Judges & Staff Pages)
- **Light Green → Green (Black Border)**: Ring Open
- **Light Red → Red (Black Border)**: Judges Needed
- **Light Blue → Blue (Black Border)**: Stacked Ring
- **Light Green → Green (Black Border)**: Special Abilities - Physical
- **Light Orange → Orange (Black Border)**: Special Abilities - Cognitive
- **Light Purple → Purple (Black Border)**: Special Abilities - Autistic
- **Belt Colors → Darker**: Color belt rank buttons (actual belt colors)
- **Light Gray → Dark Gray**: Black belt rank buttons

## WebSocket Events

- `ring_update`: Ring data changed
- `tournament_ended`: Tournament ended by staff
- `tournament_status_change`: Tournament status updated
- `tournament_rings_updated`: Ring count changed for tournament

## Security Notes

- Passwords are validated server-side
- Sessions expire after 48 hours
- Tokens are stored in localStorage
- Environment variables recommended for production passwords
- CORS enabled for development

## Browser Support

- Modern browsers with WebSocket support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers supported
