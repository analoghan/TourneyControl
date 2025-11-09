# Design Document

## Overview

This design extends the Tournament Control System to support tournament lifecycle management with three states: not_started, active, and ended. It consolidates the setup functionality into the staff interface, creating a streamlined two-page application. The design ensures that ring events can only be modified during active tournaments and provides clear visual feedback about tournament status.

## Architecture

### System Components

The application maintains its existing three-tier architecture:

1. **Frontend (React)**: Two main interfaces - Judges and Staff
2. **Backend (Express)**: REST API with WebSocket support for real-time updates
3. **Database (SQLite)**: Persistent storage for tournaments and rings

### Data Flow

1. Staff creates/starts/ends tournaments via Staff Interface
2. Backend updates database and broadcasts status changes via WebSocket
3. Judges Interface filters to show only active tournaments
4. Ring event updates are validated against tournament status before processing
5. Real-time updates propagate to all connected clients

## Components and Interfaces

### Database Schema Changes

**tournaments table** - Add status column:
```sql
ALTER TABLE tournaments ADD COLUMN status TEXT DEFAULT 'not_started'
```

Valid status values: 'not_started', 'active', 'ended'

### Backend API Endpoints

#### New Endpoints

**PUT /api/tournaments/:id/status**
- Updates tournament status
- Request body: `{ status: 'active' | 'ended' }`
- Validates status transitions (not_started → active → ended)
- Broadcasts tournament status change via WebSocket
- Response: Updated tournament object

**GET /api/tournaments/active**
- Returns only tournaments with status 'active'
- Used by Judges Interface to filter available tournaments

**DELETE /api/tournaments/:id**
- Deletes a tournament and all associated rings
- Validates that tournament status is 'ended'
- Returns 403 error if tournament is not ended
- Cascades deletion to all rings associated with the tournament
- Response: Success message with deleted tournament id

#### Modified Endpoints

**PUT /api/rings/:id**
- Add validation to check tournament status before allowing updates
- Query tournament status via ring's tournament_id
- Return 403 error if tournament status is 'ended'
- Return error message: "Tournament has ended. Ring events cannot be modified."

### Frontend Components

#### StaffInterface Component (Enhanced)

Combines existing ring monitoring with tournament management:

**New Features:**
- Tournament creation form (moved from TournamentSetup)
- Tournament list with status badges
- Start/End/Delete buttons for each tournament
- Status-based button visibility:
  - "Start" button: visible when status is 'not_started'
  - "End" button: visible when status is 'active'
  - "Delete" button: visible when status is 'ended'

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Staff Dashboard                             │
├─────────────────────────────────────────────┤
│ Create Tournament                           │
│ [Name Input] [Rings Input] [Create]         │
├─────────────────────────────────────────────┤
│ Tournaments                                 │
│ ┌─────────────────────────────────────────┐ │
│ │ Tournament Name  [Status Badge]         │ │
│ │ 8 rings         [Start/End/Delete Btn]  │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Active Tournament: [Dropdown]               │
├─────────────────────────────────────────────┤
│ Rings Grid                                  │
│ [Ring 1] [Ring 2] [Ring 3] ...             │
└─────────────────────────────────────────────┘
```

#### JudgesInterface Component (Enhanced)

**Changes:**
- Filter tournaments to show only active ones
- Display message when no active tournaments exist
- Handle tournament_ended WebSocket event
- Disable event selection and show alert when tournament ends
- Add tournament status indicator

**Error Handling:**
- Catch 403 errors from ring update attempts
- Display user-friendly error message
- Disable dropdown when tournament is no longer active

#### Removed Components

- **TournamentSetup**: Functionality merged into StaffInterface
- Remove from App.jsx routes
- Remove "Setup" link from navigation

### WebSocket Events

#### New Event Types

**tournament_status_change**
```json
{
  "type": "tournament_status_change",
  "data": {
    "id": 1,
    "name": "Spring Championship",
    "status": "active",
    "num_rings": 8
  }
}
```

Broadcast when tournament status changes (start/end actions)

**tournament_ended**
```json
{
  "type": "tournament_ended",
  "data": {
    "tournament_id": 1
  }
}
```

Broadcast when a tournament is ended, triggers judges to disable controls

## Data Models

### Tournament Model

```typescript
interface Tournament {
  id: number
  name: string
  num_rings: number
  status: 'not_started' | 'active' | 'ended'
  created_at: string
}
```

### Ring Model (unchanged)

```typescript
interface Ring {
  id: number
  tournament_id: number
  ring_number: number
  current_event: string
}
```

## Error Handling

### Backend Validation

1. **Status Transition Validation**
   - Prevent invalid transitions (e.g., not_started → ended)
   - Return 400 error with message: "Invalid status transition"

2. **Ring Update Validation**
   - Check tournament status before allowing ring updates
   - Return 403 error if tournament is ended
   - Include tournament status in error response

3. **Tournament Deletion Validation**
   - Only allow deletion of tournaments with status 'ended'
   - Return 403 error if tournament is not ended
   - Cascade delete all associated rings

### Frontend Error Handling

1. **Judges Interface**
   - Display alert when tournament ends while in use
   - Disable event dropdown for ended tournaments
   - Show "No active tournaments" message when appropriate

2. **Staff Interface**
   - Display error messages for failed operations
   - Provide visual feedback for successful status changes
   - Prevent duplicate start/end actions

## Testing Strategy

### Unit Tests (Optional)

- Database migration for status column
- Status transition validation logic
- Tournament filtering by status

### Integration Tests (Optional)

- Tournament lifecycle flow (create → start → end)
- Ring update rejection for ended tournaments
- WebSocket broadcast for status changes

### Manual Testing Focus

1. Create tournament and verify status is 'not_started'
2. Start tournament and verify judges can see it
3. Update ring events in active tournament
4. End tournament and verify ring updates are blocked
5. Verify judges interface shows appropriate message
6. Test WebSocket updates across multiple browser tabs

## Migration Strategy

### Database Migration

Add status column to existing tournaments table with default value 'not_started'. Existing tournaments will be set to 'not_started' and can be started by staff.

### UI Migration

1. Remove Setup route from App.jsx
2. Update navigation to show only Judges and Staff
3. Merge TournamentSetup component into StaffInterface
4. Update styling to accommodate combined interface

## Visual Design

### Status Badges

- **Not Started**: Gray badge with "Not Started" text
- **Active**: Green badge with "Active" text  
- **Ended**: Red badge with "Ended" text

### Button States

- Start button: Blue, enabled only for not_started tournaments
- End button: Red, enabled only for active tournaments
- Delete button: Dark red/crimson, enabled only for ended tournaments
- Disabled state: Gray, reduced opacity

### Responsive Considerations

- Tournament management section stacks vertically on mobile
- Ring grid maintains responsive layout
- Status badges remain visible at all screen sizes
