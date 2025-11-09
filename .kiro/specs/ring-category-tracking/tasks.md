# Implementation Plan

- [x] 1. Add category columns to database schema
  - Add gender column to rings table with default value 'Male'
  - Add age_bracket column to rings table with default value 'Tigers'
  - Add rank column to rings table with default value 'Color Belts'
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Create shared constants file
  - Create client/src/constants/categories.js file
  - Define EVENTS array with all event types
  - Define GENDERS array with Male and Female
  - Define AGE_BRACKETS array with all age bracket options
  - Define RANKS array with all rank options
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 3. Update backend API to handle category fields
  - Modify PUT /api/rings/:id endpoint to accept gender, age_bracket, and rank fields
  - Update database query to include new fields
  - Ensure WebSocket broadcast includes all category fields
  - Maintain existing tournament status validation
  - _Requirements: 1.2, 2.2, 3.2, 4.2_

- [x] 4. Update JudgesInterface with category selectors
  - [x] 4.1 Import constants and update component state
    - Import category constants from constants file
    - Update selectedRing state to include new fields
    - Update WebSocket listener to handle new fields
    - _Requirements: 4.1_
  
  - [x] 4.2 Add gender selector dropdown
    - Create gender dropdown below event selector
    - Implement updateGender handler
    - Apply optimistic UI updates
    - _Requirements: 1.1, 1.2, 1.3, 4.1_
  
  - [x] 4.3 Add age bracket selector dropdown
    - Create age bracket dropdown below gender selector
    - Implement updateAgeBracket handler
    - Apply optimistic UI updates
    - _Requirements: 2.1, 2.2, 2.3, 4.1_
  
  - [x] 4.4 Add rank selector dropdown
    - Create rank dropdown below age bracket selector
    - Implement updateRank handler
    - Apply optimistic UI updates
    - _Requirements: 3.1, 3.2, 3.3, 4.1_
  
  - [x] 4.5 Update current values display
    - Display all four categories in current status section
    - Format display for readability
    - _Requirements: 1.3, 2.3, 3.3_

- [x] 5. Update StaffInterface to display all categories
  - Update ring card display to show event, gender, age bracket, and rank
  - Ensure WebSocket updates include all new fields
  - Format ring cards for clear information hierarchy
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 6. Add styling for new category selectors and displays
  - Add CSS for category selector dropdowns in judges interface
  - Add CSS for multi-line ring card display in staff interface
  - Ensure responsive layout for mobile devices
  - Add visual hierarchy for category information
  - _Requirements: 4.1, 5.3_
