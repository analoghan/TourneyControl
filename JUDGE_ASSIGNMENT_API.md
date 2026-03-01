# Judge Assignment System API

This document describes the judge assignment and tracking system added to the tournament control application.

## Overview

The system allows you to:
- Assign judges to tournaments
- Track judge check-in status
- Assign judges to specific rings
- View all assignments for a tournament

Judges remain independent in the database and can be reused across multiple tournaments.

## Database Schema

### tournament_judges
Links judges to tournaments with check-in tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| tournament_id | INTEGER | Foreign key to tournaments |
| judge_id | INTEGER | Foreign key to judges |
| checked_in | INTEGER | 0 = not checked in, 1 = checked in |
| check_in_time | DATETIME | When judge checked in |
| notes | TEXT | Optional notes about this judge for this tournament |
| created_at | DATETIME | When assigned |

**Constraints:** Unique(tournament_id, judge_id) - A judge can only be assigned once per tournament

### ring_assignments
Assigns judges to specific rings within a tournament.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| ring_id | INTEGER | Foreign key to rings |
| judge_id | INTEGER | Foreign key to judges |
| tournament_id | INTEGER | Foreign key to tournaments |
| assigned_at | DATETIME | When assigned |

**Constraints:** Unique(ring_id, judge_id) - A judge can only be assigned once per ring

## API Endpoints

### Tournament Judge Management

#### Get all judges assigned to a tournament
```
GET /api/tournaments/:tournamentId/judges
```

**Response:**
```json
[
  {
    "id": 1,
    "tournament_id": 1,
    "judge_id": 5,
    "checked_in": 1,
    "check_in_time": "2026-03-01T14:30:00Z",
    "notes": "Head judge for ring 1",
    "first_name": "John",
    "last_name": "Doe",
    "ata_number": "12345",
    "rank": "4th Degree",
    "age": 35,
    "judging_level": "Master",
    "competing": 0
  }
]
```

#### Assign a judge to a tournament
```
POST /api/tournaments/:tournamentId/judges
Content-Type: application/json

{
  "judge_id": 5,
  "notes": "Head judge for ring 1"
}
```

**Response:**
```json
{
  "id": 1,
  "message": "Judge assigned to tournament successfully"
}
```

#### Update tournament judge (check-in, notes)
```
PUT /api/tournaments/:tournamentId/judges/:judgeId
Content-Type: application/json

{
  "checked_in": true,
  "notes": "Arrived early"
}
```

**Response:**
```json
{
  "message": "Judge updated successfully"
}
```

**Note:** When `checked_in` is set to `true`, `check_in_time` is automatically set to current timestamp.

#### Remove a judge from a tournament
```
DELETE /api/tournaments/:tournamentId/judges/:judgeId
```

**Response:**
```json
{
  "message": "Judge removed from tournament successfully"
}
```

### Ring Assignment Management

#### Get all judges assigned to a ring
```
GET /api/rings/:ringId/judges
```

**Response:**
```json
[
  {
    "id": 1,
    "ring_id": 3,
    "judge_id": 5,
    "tournament_id": 1,
    "assigned_at": "2026-03-01T10:00:00Z",
    "first_name": "John",
    "last_name": "Doe",
    "ata_number": "12345",
    "rank": "4th Degree",
    "judging_level": "Master"
  }
]
```

#### Assign a judge to a ring
```
POST /api/rings/:ringId/judges
Content-Type: application/json

{
  "judge_id": 5,
  "tournament_id": 1
}
```

**Response:**
```json
{
  "id": 1,
  "message": "Judge assigned to ring successfully"
}
```

#### Remove a judge from a ring
```
DELETE /api/rings/:ringId/judges/:judgeId
```

**Response:**
```json
{
  "message": "Judge removed from ring successfully"
}
```

#### Get all ring assignments for a tournament
```
GET /api/tournaments/:tournamentId/ring-assignments
```

**Response:**
```json
[
  {
    "id": 1,
    "ring_id": 3,
    "judge_id": 5,
    "tournament_id": 1,
    "assigned_at": "2026-03-01T10:00:00Z",
    "ring_number": 1,
    "first_name": "John",
    "last_name": "Doe",
    "ata_number": "12345"
  }
]
```

## Usage Workflow

### 1. Before Tournament
1. Add judges to the global judges database (if not already added)
2. Assign judges to the tournament: `POST /api/tournaments/:id/judges`
3. Assign judges to specific rings: `POST /api/rings/:id/judges`

### 2. During Tournament
1. Check in judges as they arrive: `PUT /api/tournaments/:id/judges/:judgeId` with `checked_in: true`
2. View which judges are assigned to each ring: `GET /api/rings/:id/judges`
3. Reassign judges to different rings as needed

### 3. After Tournament
1. View tournament report with judge assignments
2. Judge data persists for future tournaments
3. Tournament-specific assignments are deleted when tournament is deleted (CASCADE)

## Data Integrity

- **Cascade Deletes:** When a tournament is deleted, all `tournament_judges` and `ring_assignments` for that tournament are automatically deleted
- **Unique Constraints:** Prevent duplicate assignments (same judge to same tournament/ring)
- **Foreign Keys:** Ensure referential integrity between tables

## Future Enhancements

Potential features to add:
- Judge availability/schedule tracking
- Judge performance ratings
- Automatic judge rotation
- Judge conflict detection (competing in same division they're judging)
- Judge certification expiration tracking
- Email/SMS notifications for assignments
