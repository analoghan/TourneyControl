# Design Document

## Overview

This design extends the ring tracking system to include three additional categorical fields: Gender, Age Bracket, and Rank. These fields will be stored in the database, selectable by judges, and displayed in real-time on the staff dashboard alongside the current event.

## Architecture

### System Components

The existing three-tier architecture remains unchanged:

1. **Frontend (React)**: Judges and Staff interfaces with enhanced ring information display
2. **Backend (Express)**: REST API with WebSocket support for real-time category updates
3. **Database (SQLite)**: Extended rings table to store additional category fields

### Data Flow

1. Judge selects event, gender, age bracket, and rank via dropdown selectors
2. Frontend sends PUT request to update ring categories
3. Backend updates database and broadcasts changes via WebSocket
4. All connected clients receive real-time updates
5. Staff interface displays all category information for each ring

## Components and Interfaces

### Database Schema Changes

**rings table** - Add category columns:
```sql
ALTER TABLE rings ADD COLUMN gender TEXT DEFAULT 'Male';
ALTER TABLE rings ADD COLUMN age_bracket TEXT DEFAULT 'Tigers';
ALTER TABLE rings ADD COLUMN rank TEXT DEFAULT 'Color Belts';
```

Default values ensure existing rings have valid data.

### Backend API Endpoints

#### Modified Endpoints

**PUT /api/rings/:id**
- Extend to accept additional fields: gender, age_bracket, rank
- Request body: `{ current_event?, gender?, age_bracket?, rank? }`
- All fields are optional - only update provided fields
- Maintain existing tournament status validation
- Broadcast updated ring data via WebSocket

Response includes all ring fields:
```json
{
  "id": 1,
  "tournament_id": 1,
  "ring_number": 1,
  "current_event": "Forms",
  "gender": "Male",
  "age_bracket": "9-10",
  "rank": "Color Belts"
}
```

### Frontend Components

#### JudgesInterface Component (Enhanced)

**New Features:**
- Three additional dropdown selectors below the event selector
- Gender dropdown with options: Male, Female
- Age Bracket dropdown with options: Tigers, 8 and Under, 9-10, 11-12, 13-14, 15-17, 18-29, 30-39, 40-49, 50-59, 60+
- Rank dropdown with options: Color Belts, 1st Degree, 2nd-3rd Degree, 4th-5th Degree, Masters

**Layout:**
```
┌─────────────────────────────────────┐
│ Judges Interface                    │
├─────────────────────────────────────┤
│ Select Ring: [Ring Buttons]        │
├─────────────────────────────────────┤
│ Ring 1                              │
│ Current: Forms | Male | 9-10 |     │
│          Color Belts                │
│                                     │
│ Select Event:                       │
│ [Forms ▼]                           │
│                                     │
│ Select Gender:                      │
│ [Male ▼]                            │
│                                     │
│ Select Age Bracket:                 │
│ [9-10 ▼]                            │
│                                     │
│ Select Rank:                        │
│ [Color Belts ▼]                     │
└─────────────────────────────────────┘
```

**Implementation Details:**
- Each dropdown updates independently
- Optimistic UI updates for immediate feedback
- All dropdowns disabled when tournament is ended
- Current values displayed at top for quick reference

#### StaffInterface Component (Enhanced)

**Enhanced Ring Cards:**
- Display all four categories per ring
- Maintain existing real-time update functionality
- Clear visual hierarchy for information

**Ring Card Layout:**
```
┌─────────────────────┐
│ Ring 1              │
├─────────────────────┤
│ Forms               │
│ Male                │
│ 9-10                │
│ Color Belts         │
└─────────────────────┘
```

Alternative compact layout:
```
┌─────────────────────┐
│ Ring 1              │
├─────────────────────┤
│ Forms               │
│ Male | 9-10         │
│ Color Belts         │
└─────────────────────┘
```

### Constants Definition

Create shared constants file for category options:

**client/src/constants/categories.js**
```javascript
export const EVENTS = [
  'Forms',
  'Weapons',
  'Combat Sparring',
  'Traditional Sparring',
  'Creative Forms',
  'Creative Weapons',
  'XMA Forms',
  'XMA Weapons',
  'Team Combat Sparring/Team Sparring'
]

export const GENDERS = ['Male', 'Female']

export const AGE_BRACKETS = [
  'Tigers',
  '8 and Under',
  '9-10',
  '11-12',
  '13-14',
  '15-17',
  '18-29',
  '30-39',
  '40-49',
  '50-59',
  '60+'
]

export const RANKS = [
  'Color Belts',
  '1st Degree',
  '2nd-3rd Degree',
  '4th-5th Degree',
  'Masters'
]
```

## Data Models

### Ring Model (Extended)

```typescript
interface Ring {
  id: number
  tournament_id: number
  ring_number: number
  current_event: string
  gender: string
  age_bracket: string
  rank: string
}
```

## Error Handling

### Backend Validation

1. **Category Value Validation**
   - Validate that provided values match allowed options
   - Return 400 error for invalid category values
   - Provide clear error messages indicating valid options

2. **Existing Validations**
   - Maintain tournament status validation
   - Continue to prevent updates to ended tournaments

### Frontend Error Handling

1. **Judges Interface**
   - Display error messages for failed updates
   - Revert optimistic updates on error
   - Disable all dropdowns when tournament ends

2. **Staff Interface**
   - Handle missing category data gracefully
   - Display default values if data is incomplete

## Testing Strategy

### Manual Testing Focus

1. Create tournament and start it
2. Select a ring in judges interface
3. Update each category independently and verify:
   - Judges interface updates immediately
   - Staff interface updates in real-time
   - All categories persist correctly
4. Test with multiple browser tabs to verify WebSocket updates
5. End tournament and verify all dropdowns are disabled
6. Verify staff dashboard displays all categories clearly

## Migration Strategy

### Database Migration

Add three new columns to rings table with default values. Existing rings will automatically have default values assigned (Male, Tigers, Color Belts).

### Backward Compatibility

- Existing API calls that only update current_event continue to work
- New fields are optional in PUT requests
- Default values ensure all rings have valid data

## Visual Design

### Judges Interface

- Stack dropdowns vertically for clarity
- Use consistent styling with existing event dropdown
- Add subtle dividers between sections
- Display current values prominently at top

### Staff Interface Ring Cards

- Use hierarchical text sizing:
  - Event: Largest (primary information)
  - Gender/Age: Medium
  - Rank: Medium
- Maintain existing color scheme
- Ensure readability at all screen sizes

### Responsive Considerations

- Stack all information vertically on mobile
- Ensure dropdowns are touch-friendly
- Maintain readability of ring cards on small screens
- Consider abbreviated labels on very small screens
