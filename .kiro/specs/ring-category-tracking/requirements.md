# Requirements Document

## Introduction

This feature extends the ring tracking system to include additional categorical information beyond just the event type. Each ring will track Gender, Age Bracket, and Rank categories to provide more detailed information about the current competition taking place.

## Glossary

- **Tournament Control System**: The web application for managing martial arts tournaments
- **Ring**: A numbered competition area where events occur
- **Event**: The type of martial arts competition (Forms, Weapons, etc.)
- **Gender**: The gender category of the current competition (Male or Female)
- **Age Bracket**: The age group category of the current competition
- **Rank**: The belt rank category of the current competition
- **Judges Interface**: The interface for judges to update ring information
- **Staff Interface**: The administrative dashboard for tournament management

## Requirements

### Requirement 1

**User Story:** As a judge, I want to select the gender category for my ring, so that competitors and staff know which gender division is currently competing

#### Acceptance Criteria

1. THE Tournament Control System SHALL provide a gender selector with options "Male" and "Female"
2. WHEN a judge selects a gender, THE Tournament Control System SHALL update the ring's gender category
3. THE Tournament Control System SHALL display the selected gender in both the judges and staff interfaces

### Requirement 2

**User Story:** As a judge, I want to select the age bracket for my ring, so that competitors and staff know which age division is currently competing

#### Acceptance Criteria

1. THE Tournament Control System SHALL provide an age bracket selector with the following options: Tigers, 8 and Under, 9-10, 11-12, 13-14, 15-17, 18-29, 30-39, 40-49, 50-59, 60+
2. WHEN a judge selects an age bracket, THE Tournament Control System SHALL update the ring's age bracket category
3. THE Tournament Control System SHALL display the selected age bracket in both the judges and staff interfaces

### Requirement 3

**User Story:** As a judge, I want to select the rank category for my ring, so that competitors and staff know which belt rank division is currently competing

#### Acceptance Criteria

1. THE Tournament Control System SHALL provide a rank selector with the following options: Color Belts, 1st Degree, 2nd-3rd Degree, 4th-5th Degree, Masters
2. WHEN a judge selects a rank, THE Tournament Control System SHALL update the ring's rank category
3. THE Tournament Control System SHALL display the selected rank in both the judges and staff interfaces

### Requirement 4

**User Story:** As a judge, I want all ring category selections in one interface, so that I can efficiently update all ring information

#### Acceptance Criteria

1. THE Tournament Control System SHALL display event, gender, age bracket, and rank selectors together in the judges interface
2. WHEN a judge updates any category, THE Tournament Control System SHALL broadcast the change via WebSocket
3. THE Tournament Control System SHALL update all categories in real-time across all connected clients

### Requirement 5

**User Story:** As a staff member, I want to see all ring categories on the staff dashboard, so that I can monitor what is happening in each ring

#### Acceptance Criteria

1. THE Tournament Control System SHALL display event, gender, age bracket, and rank for each ring in the staff interface
2. THE Tournament Control System SHALL update the staff interface in real-time when judges change any category
3. THE Tournament Control System SHALL present the information in a clear, readable format
