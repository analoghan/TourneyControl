# Requirements Document

## Introduction

This feature adds lifecycle management to tournaments, allowing staff to start and end tournaments with appropriate access controls. It also consolidates the setup functionality into the staff interface, simplifying the application to two main interfaces: Judges and Staff.

## Glossary

- **Tournament Control System**: The web application for managing martial arts tournaments
- **Tournament**: A martial arts competition event with multiple rings
- **Ring**: A numbered competition area where events occur
- **Staff Interface**: The administrative dashboard for tournament management
- **Judges Interface**: The interface for judges to update ring events
- **Tournament Status**: The current state of a tournament (not_started, active, ended)

## Requirements

### Requirement 1

**User Story:** As a staff member, I want to create a new tournament with a specified number of rings, so that I can prepare for an upcoming competition

#### Acceptance Criteria

1. WHEN a staff member submits a tournament creation form with a name and number of rings, THE Tournament Control System SHALL create a new tournament with status "not_started"
2. WHEN a tournament is created, THE Tournament Control System SHALL generate the specified number of rings (1-40) with default event "Forms"
3. THE Tournament Control System SHALL display all created tournaments in the staff interface with their current status

### Requirement 2

**User Story:** As a staff member, I want to start a tournament, so that judges can begin updating ring events

#### Acceptance Criteria

1. WHEN a staff member clicks the start button for a tournament with status "not_started", THE Tournament Control System SHALL update the tournament status to "active"
2. WHILE a tournament has status "active", THE Tournament Control System SHALL allow judges to modify ring events
3. THE Tournament Control System SHALL display the tournament status clearly in the staff interface

### Requirement 3

**User Story:** As a staff member, I want to end a tournament, so that ring events can no longer be modified

#### Acceptance Criteria

1. WHEN a staff member clicks the end button for a tournament with status "active", THE Tournament Control System SHALL update the tournament status to "ended"
2. WHILE a tournament has status "ended", THE Tournament Control System SHALL prevent judges from modifying ring events
3. WHEN a judge attempts to modify a ring in an ended tournament, THE Tournament Control System SHALL display an error message indicating the tournament has ended

### Requirement 4

**User Story:** As a staff member, I want all tournament management functionality in one interface, so that I can efficiently manage tournaments without switching pages

#### Acceptance Criteria

1. THE Tournament Control System SHALL display tournament creation, status management, and ring monitoring in the staff interface
2. THE Tournament Control System SHALL remove the separate setup page from the navigation
3. THE Tournament Control System SHALL provide a two-page application with only Judges and Staff interfaces

### Requirement 5

**User Story:** As a judge, I want to see only active tournaments, so that I don't accidentally select an ended tournament

#### Acceptance Criteria

1. THE Tournament Control System SHALL display only tournaments with status "active" in the judges interface tournament selector
2. WHEN no active tournaments exist, THE Tournament Control System SHALL display a message indicating no tournaments are available
3. WHEN a tournament is ended while a judge is using it, THE Tournament Control System SHALL display a notification and disable event selection

### Requirement 6

**User Story:** As a staff member, I want to delete ended tournaments, so that I can remove old tournament data and keep the interface clean

#### Acceptance Criteria

1. WHEN a staff member clicks the delete button for a tournament with status "ended", THE Tournament Control System SHALL remove the tournament and all associated rings from the database
2. THE Tournament Control System SHALL display a delete button only for tournaments with status "ended"
3. WHEN a tournament is deleted, THE Tournament Control System SHALL update the staff interface to remove the tournament from the list
