# Implementation Plan

- [x] 1. Add tournament status to database schema
  - Add status column to tournaments table with default value 'not_started'
  - Create database migration to update existing schema
  - _Requirements: 1.1, 2.1_

- [x] 2. Implement backend tournament status management
  - [x] 2.1 Add PUT /api/tournaments/:id/status endpoint
    - Implement status update logic with validation
    - Add status transition validation (not_started → active → ended)
    - Broadcast tournament_status_change via WebSocket
    - _Requirements: 2.1, 3.1_
  
  - [x] 2.2 Add GET /api/tournaments/active endpoint
    - Filter and return only tournaments with status 'active'
    - _Requirements: 5.1_
  
  - [x] 2.3 Add tournament status validation to ring updates
    - Modify PUT /api/rings/:id to check tournament status
    - Return 403 error if tournament status is 'ended'
    - Include error message in response
    - _Requirements: 3.2, 3.3_

- [x] 3. Merge tournament setup into staff interface
  - [x] 3.1 Add tournament creation form to StaffInterface component
    - Move form from TournamentSetup to StaffInterface
    - Add form styling to match staff interface design
    - _Requirements: 1.1, 4.1_
  
  - [x] 3.2 Add tournament list with status management to StaffInterface
    - Display tournaments with status badges
    - Add Start button for not_started tournaments
    - Add End button for active tournaments
    - Implement status update handlers
    - Add WebSocket listener for tournament_status_change events
    - _Requirements: 1.3, 2.1, 2.3, 3.1, 4.1_
  
  - [x] 3.3 Update StaffInterface to show rings for selected tournament
    - Keep existing ring grid display
    - Add tournament selector dropdown
    - _Requirements: 4.1_

- [x] 4. Update judges interface for active tournaments only
  - [x] 4.1 Filter tournaments to show only active ones
    - Use GET /api/tournaments/active endpoint
    - Display message when no active tournaments exist
    - _Requirements: 5.1, 5.2_
  
  - [x] 4.2 Add tournament status validation and error handling
    - Handle 403 errors from ring update attempts
    - Add WebSocket listener for tournament_ended events
    - Disable event dropdown when tournament ends
    - Display notification when tournament is ended
    - _Requirements: 3.3, 5.3_

- [x] 5. Remove setup page and update navigation
  - [x] 5.1 Remove TournamentSetup component and route
    - Delete TournamentSetup.jsx file
    - Remove setup route from App.jsx
    - _Requirements: 4.2_
  
  - [x] 5.2 Update navigation to show only Judges and Staff
    - Remove Setup link from navbar
    - Update default route to redirect to Staff interface
    - _Requirements: 4.2, 4.3_

- [x] 6. Add styling for tournament status and management UI
  - Add CSS for status badges (not_started, active, ended)
  - Add CSS for Start/End buttons with appropriate colors
  - Add CSS for tournament management section in staff interface
  - Update responsive layout for combined staff interface
  - _Requirements: 1.3, 2.3, 3.1, 4.1_

- [ ] 7. Add tournament deletion functionality
  - [ ] 7.1 Add DELETE /api/tournaments/:id endpoint
    - Implement tournament deletion with status validation
    - Only allow deletion of tournaments with status 'ended'
    - Cascade delete all associated rings from database
    - Return 403 error if tournament is not ended
    - _Requirements: 6.1_
  
  - [ ] 7.2 Add delete button to StaffInterface
    - Display Delete button only for tournaments with status 'ended'
    - Implement delete handler that calls DELETE endpoint
    - Refresh tournament list after successful deletion
    - _Requirements: 6.2, 6.3_
  
  - [ ] 7.3 Add styling for delete button
    - Add CSS for Delete button with dark red/crimson color
    - Ensure button is visually distinct from End button
    - _Requirements: 6.2_
