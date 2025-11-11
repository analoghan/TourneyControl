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
- Timezone selection (US Eastern, Central, Mountain, Pacific) for accurate time display
- Edit timezone for active tournaments
- Tournament lifecycle management (Not Started → Active → Ended)
- Start, end, and restart tournaments with status controls
- Delete ended tournaments to keep interface clean
- Real-time WebSocket updates across all connected clients
- Collapsible tournament setup section for clean interface
- Live clock display showing current time in tournament timezone

### Judges Interface
- **Ring Selection**:
  - Visual ring selector with collapsible tournament/ring selection
  - Current status display showing event and categories
  
- **Ring Status Controls** (Toggle Buttons with Black Borders):
  - **Ring Open**: Mark ring as available (gray/green with black border when active)
  - **Judges Needed**: Alert staff for judge assistance (gray/dark orange with black border when active)
  - **RTTL Needed**: Alert staff for RTTL assistance (gray/dark red with black border when active - highest priority)
  
- **Event Selection**:
  - Dropdown menu with 10 event types
  - Automatic category display based on event type
  
- **Division Type Selection** (for standard events):
  - **Champion**: White button when active
  - **Recreational**: Gold button when active
  - Hidden for Team Sparring events

- **Competition Categories** (for standard events):
  - **Gender**: Male or Female
  - **Age Brackets**: Multi-select buttons (gray when not selected, black when selected)
    - Tigers, 8 and Under, 9-10, 11-12, 13-14, 15-17, 18-29, 30-39, 40-49, 50-59, 60-69, 70-99
    - Multiple age brackets can be selected for combined divisions
    - Tigers is mutually exclusive - cannot be combined with other age brackets
  - **Rank**: Color Belts or Black Belts
  - **Color Belt Selection**: Individual belt buttons (White, Orange, Yellow, Camo, Green, Purple, Blue, Brown, Red, Red/Black)
  - **Black Belt Selection**: Degree buttons (1st, 2nd-3rd, 4th-5th, Masters) with age-based filtering
  
- **Team Sparring Categories**:
  - **Division**: Bantam, Rookie, Junior Varsity, Varsity, Elite, Premier, Legends, Executive
  
- **Additional Options** (for standard events):
  - **Stacked Ring**: Toggle button (light blue/blue with black border when active)
  - **Special Abilities**: Physical (green), Cognitive (orange), Autistic (purple) - all with black borders when active
  
- **Ring Control & Session Tracking**:
  - **Start Ring**: Records start time and creates new session/packet (button turns blue when started)
    - Disabled when "Ring Open" is active
    - Disabled when ring is already started
    - Clears previous end_time to start fresh session
  - **End Ring**: Records end time, completes session, and resets ring to default state
    - All settings reset to defaults (Forms, Male, Tigers, Color Belts, etc.)
    - Ring automatically set to "Open" status
  - **Multiple Sessions**: Rings can be started/ended multiple times, each tracked as separate packet
  - **Session Data**: Each start/end cycle stored with timestamps and run time
  - **Ring Open**: Cannot be activated while ring is in progress
  - Confirmation modals for both actions
  - Warning message about packet readiness
  - All timestamps tracked in tournament timezone for accurate reporting

- **Smart UI**:
  - When "Ring Open" is selected, event dropdown and all category options are hidden
  - Color belt buttons show actual belt colors with light/dark states
  - Black belt buttons with gray theme
  - Age-based restrictions (Tigers can't select Black Belts, younger ages can't select Masters)
  - Current status box with centered text and consistent border styling
  - Division type hidden for Team Sparring events

### Staff Dashboard
- **Tournament Management Section** (Collapsible):
  - Create new tournaments with custom ring counts (1-70) and timezone selection
  - Edit ring count for active tournaments with inline dropdown
  - Edit timezone for active tournaments
  - View all tournaments with status badges
  - Start/End/Restart/Delete tournaments with status-based controls
  - **End Tournament**: Automatically ends all in-progress rings and closes their sessions
  - **Restart Tournament**: Clears all ring timing to reset for new sessions
  - New rings default to "Open" status when created or added
  - Clear labels for Ring Count and Timezone in both creation and edit modes
  - **Generate Reports**: CSV export with complete session/packet data
  
- **Active Tournament Display**:
  - Tournament selector dropdown
  - Live clock showing current time in tournament timezone
  - Format: "HH:MM AM/PM, Month Day, Year"
  - Updates every second automatically
  - Right-aligned for easy visibility
  
- **Alert Sections** (with clickable ring numbers):
  - **RTTL Needed Alert**: Dark red flashing section listing rings needing RTTL (highest priority)
  - **Judges Needed Alert**: Orange flashing section listing rings needing judges
  - **Open Rings Alert**: Green section listing available rings
  - All sections auto-show/hide based on ring status
  - Ring numbers are clickable to navigate to ring configuration
  
- **Ring Monitoring Grid**:
  - Full-width badges and information boxes
  - Color-coded event displays for quick identification
  - Real-time updates of all ring information
  - Visual highlighting for special ring statuses:
    - **Green background**: Open rings (overrides all other styling)
    - **Orange background**: Team Sparring events
    - **Dark red flashing background**: RTTL Needed! (highest priority)
    - **Red flashing background**: Judges Needed! (urgent)
    - **Blue background**: Stacked rings (hidden when open)
  - Status badges with black borders:
    - **Division Type Badge**: White (Champion) or Gold (Recreational) - shown for standard events only
    - **Open Badge**: Large green badge
    - **RTTL Needed Badge**: Large dark red badge
    - **Judges Needed Badge**: Large dark orange badge
    - **Stacked Ring Badge**: Blue badge
    - **Special Abilities Badges**: Color-coded (Physical-green, Cognitive-orange, Autistic-purple)
  - Ring Status Footer (bottom of each card):
    - **Ready to Start**: Gray badge
    - **Ring In Progress**: Dark blue badge with start time
    - **Previous Ring Ended**: Gray badge with end time
    - **Clear Timing Button**: Orange badge appears on stuck rings (both start and end times set) - click to reset
  - Category displays with black borders:
    - **Gender/Age**: Blue (Male) or Pink (Female) background
    - **Rank**: Orange (Color Belts) or Black (Black Belts) background
    - **Division**: White background for team events
    - **Specific Belts**: Yellow background for color belts, gray for black belts
  - All text in bold black for maximum readability
  - Clickable cards navigate to ring configuration

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
   - Select ring count (1-70)
   - Select timezone (US Eastern, Central, Mountain, or Pacific)
   - Click "Create Tournament"
   - All rings default to "Open" status

3. **Edit Ring Count** (Active Tournaments):
   - Click "Edit" button next to "Ring Count:" label
   - Select new ring count from dropdown (1-70)
   - Click "Save" to apply or "Cancel" to discard
   - New rings are automatically added as "Open"
   - Excess rings are removed from the end

4. **Edit Timezone** (Active Tournaments):
   - Click "Edit" button next to "Timezone:" label
   - Select new timezone from dropdown
   - Click "Save" to apply or "Cancel" to discard
   - All time displays update to new timezone immediately

5. **Start Tournament**:
   - Click "Start" button on tournament
   - Tournament becomes active and visible to judges

6. **Monitor Rings**:
   - View live clock showing current time in tournament timezone
   - View all rings in color-coded grid
   - Check "RTTL Needed" alert for highest priority requests
   - Check "Rings Needing Judges" alert for urgent requests
   - Check "Open Rings" section for available rings
   - Monitor event types, categories, and special statuses
   - Ring status footer shows timing information (Ready/In Progress/Ended)

7. **End Tournament**:
   - Click "End" button when tournament is complete
   - Rings become read-only for judges

8. **Generate Reports**:
   - Click "Generate Report" button on any tournament
   - Downloads CSV file with complete session/packet data
   - Each ring on one row with all packets in columns
   - Includes: Ring Number, Total Packets Completed, and all packet start/end times with run times
   - Timestamps formatted without commas for proper CSV parsing
   - All times in tournament timezone

9. **Restart/Delete Tournament**:
   - Click "Restart" to reactivate an ended tournament (clears all ring timing)
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
   - Toggle "Judges Needed" if you need judge assistance
   - Toggle "RTTL Needed" if you need RTTL assistance

4. **Start/End Ring (Session/Packet Tracking)**:
   - Click "Start Ring" to begin timing (records start time and creates new session)
   - Click "End Ring" when finished (records end time, completes session, resets ring to defaults)
   - Each start/end cycle creates a separate packet/session tracked in the database
   - Confirmation modals prevent accidental clicks
   - Ring status displayed on staff dashboard with timing information
   - Multiple sessions per ring supported - start again after ending for next packet

5. **Set Division Type** (for standard events):
   - Choose "Champion" or "Recreational"
   - Hidden for Team Sparring events

6. **Set Event**:
   - Select current event from dropdown
   - UI automatically adjusts based on event type

7. **Set Categories** (for standard events):
   - Choose Gender (Male/Female)
   - Select Age Bracket
   - Select Rank (Color Belts or Black Belts)
   - Click specific belt rank buttons to indicate which belts are competing
   - Toggle "Stacked Ring" if applicable
   - Select Special Abilities if applicable

8. **Set Division** (for Team Sparring):
   - Choose Division instead of Gender/Age/Rank

9. **Open Ring Mode**:
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
- **White background**: Champion division type
- **Gold background**: Recreational division type
- **Blue background**: Male divisions
- **Pink background**: Female divisions
- **Orange background**: Color Belts rank
- **Black background**: Black Belts rank
- **White background**: Team Sparring divisions
- **Yellow background**: Specific color belt selections
- **Gray background**: Specific black belt selections

### Ring Status Footer (Staff Page)
- **Gray badge**: Ready to Start
- **Dark blue badge**: Ring In Progress (with start time)
- **Gray badge**: Previous Ring Ended (with end time)

### Toggle Buttons (Judges & Staff Pages)
- **Gray → Green (Black Border)**: Ring Open
- **Gray → Dark Orange (Black Border)**: Judges Needed
- **Gray → Dark Red (Black Border)**: RTTL Needed
- **Gray → Blue (Black Border)**: Stacked Ring
- **Gray → Green (Black Border)**: Special Abilities - Physical
- **Gray → Orange (Black Border)**: Special Abilities - Cognitive
- **Gray → Purple (Black Border)**: Special Abilities - Autistic
- **Gray → White (Black Border)**: Champion Division
- **Gray → Gold (Black Border)**: Recreational Division
- **Belt Colors → Darker**: Color belt rank buttons (actual belt colors)
- **Light Gray → Dark Gray**: Black belt rank buttons

## WebSocket Events

- `ring_update`: Ring data changed (including start/end times, RTTL status)
- `tournament_ended`: Tournament ended by staff
- `tournament_status_change`: Tournament status updated
- `tournament_rings_updated`: Ring count changed for tournament
- `tournament_timezone_updated`: Timezone changed for tournament

## Ring Timing & Session Tracking

- **Session/Packet System**: Each start/end cycle creates a separate tracked session
- **Start Time**: Recorded when "Start Ring" is clicked, creates new session in database
- **End Time**: Recorded when "End Ring" is clicked, completes current session
- **Run Time**: Automatically calculated in minutes for each completed session
- **Multiple Sessions**: Rings can be started/ended multiple times, each tracked separately
- **Session Numbering**: Sessions numbered sequentially (1, 2, 3, etc.) per ring
- **Timezone Support**: All times displayed and stored in tournament's configured timezone
- **Status Display**: Shows on staff dashboard at bottom of each ring card
- **Live Clock**: Current time displayed at top of staff dashboard, updates every second
- **Reset Behavior**: Ending a ring completes session, clears timing, and resets all settings to defaults
- **Smart Restrictions**:
  - Cannot start a ring while "Ring Open" is active
  - Cannot set "Ring Open" while ring is in progress (started but not ended)
  - Prevents conflicting states
- **Clear Timing**: Staff can manually reset stuck rings using "Clear Timing" button

## Tournament Reports

### CSV Export Format

Reports are generated per tournament with comprehensive session data:

**Header Information:**
- Tournament Name
- Status (Active/Ended)
- Total Ring Numbers
- Total Completed Packets (sum of all completed sessions)
- Created timestamp

**Data Format:**
- One row per ring
- Columns: `Ring Number`, `Total Packets Completed`, then for each packet:
  - `Packet 1 Start Time`, `Packet 1 End Time`, `Packet 1 Run Time (minutes)`
  - `Packet 2 Start Time`, `Packet 2 End Time`, `Packet 2 Run Time (minutes)`
  - etc.
- Timestamps formatted without commas (MM/DD/YYYY HH:MM:SS) for proper CSV parsing
- Run times calculated automatically in minutes
- Empty columns for rings with fewer sessions than maximum

**Example:**
```
Ring Number,Total Packets Completed,Packet 1 Start Time,Packet 1 End Time,Packet 1 Run Time (minutes),Packet 2 Start Time,Packet 2 End Time,Packet 2 Run Time (minutes)
1,2,01/15/2025 10:30:00,01/15/2025 10:45:00,15,01/15/2025 11:00:00,01/15/2025 11:20:00,20
2,1,01/15/2025 10:35:00,01/15/2025 10:50:00,15,,,
3,0,N/A,N/A,N/A,,,
```

**Use Cases:**
- Track ring productivity and efficiency
- Analyze tournament flow and timing
- Identify bottlenecks or delays
- Generate statistics for future planning
- Verify completion of all scheduled events

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
