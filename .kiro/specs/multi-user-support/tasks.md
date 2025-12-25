# Implementation Plan: Multi-User Support

## Overview

This implementation plan converts the multi-user support design into discrete coding tasks. The approach follows an incremental strategy: database schema changes first, then backend API modifications, followed by frontend session management, and finally integration and testing.

## Tasks

- [x] 1. Database schema migration for multi-user support
  - Add username column to todos table with NOT NULL constraint
  - Create database indexes for username-based queries
  - Create migration script to handle existing data
  - Update database initialization to include new schema
  - _Requirements: 5.4, 6.2_

- [ ]* 1.1 Write property test for database schema
  - **Property 5: Todo Ownership Association**
  - **Validates: Requirements 3.1, 5.4**

- [-] 2. Backend session middleware implementation
  - [x] 2.1 Create session middleware for username extraction and validation
    - Implement middleware to extract X-Username header from requests
    - Add username validation logic (1-50 non-whitespace characters)
    - Handle missing or invalid username scenarios
    - _Requirements: 2.2, 2.3, 2.4, 6.1_

  - [ ]* 2.2 Write property test for username validation
    - **Property 2: Username Validation**
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 2.3 Write property test for API authentication requirement
    - **Property 8: API Authentication Requirement**
    - **Validates: Requirements 6.1, 6.4**

- [-] 3. Enhanced TodoService with user context
  - [x] 3.1 Modify TodoService to accept username parameter in all methods
    - Update getAllTodos to filter by username
    - Update createTodo to associate todos with username
    - Update updateTodo and deleteTodo to enforce ownership
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 3.2 Write property test for todo data isolation
    - **Property 4: Todo Data Isolation**
    - **Validates: Requirements 3.2, 3.5, 6.2**

  - [ ]* 3.3 Write property test for access control enforcement
    - **Property 6: Access Control Enforcement**
    - **Validates: Requirements 3.3, 3.4, 6.3**

- [-] 4. Update API endpoints with session middleware
  - [x] 4.1 Integrate session middleware into all todo API routes
    - Apply middleware to GET, POST, PUT, DELETE /api/todos endpoints
    - Pass username context to TodoService methods
    - Update error handling for authentication failures
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.2 Write unit tests for API endpoint authentication
    - Test missing username header scenarios
    - Test invalid username format handling
    - Test cross-user access attempts
    - _Requirements: 6.1, 6.3_

- [ ] 5. Checkpoint - Backend functionality complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [-] 6. Frontend session management implementation
  - [x] 6.1 Create SessionManager class for username persistence
    - Implement username storage in sessionStorage
    - Add methods for setting, getting, and clearing username
    - Handle session validation and expiry
    - _Requirements: 1.4, 1.5, 4.2_

  - [ ]* 6.2 Write property test for session persistence
    - **Property 3: Session Persistence**
    - **Validates: Requirements 1.4, 1.5**

  - [ ]* 6.3 Write property test for session cleanup
    - **Property 9: Session Cleanup**
    - **Validates: Requirements 4.2**

- [-] 7. Username entry UI component
  - [x] 7.1 Create UsernameEntry Vue component
    - Build username input form with validation
    - Implement client-side username validation
    - Handle form submission and error display
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4_

  - [ ]* 7.2 Write property test for session establishment
    - **Property 1: Session Establishment**
    - **Validates: Requirements 1.2, 1.3, 2.4**

  - [ ]* 7.3 Write unit tests for username entry component
    - Test empty username handling
    - Test whitespace-only username rejection
    - Test username length validation
    - _Requirements: 2.1, 2.2, 2.3_

- [-] 8. Enhanced API client with username context
  - [x] 8.1 Extend TodoApiClient to include username in headers
    - Add setUsername method to configure user context
    - Modify all API calls to include X-Username header
    - Handle authentication errors and session expiry
    - _Requirements: 6.1, 6.4_

  - [ ]* 8.2 Write unit tests for API client authentication
    - Test header inclusion in all requests
    - Test error handling for authentication failures
    - _Requirements: 6.1_

- [-] 9. Main application integration and routing
  - [x] 9.1 Update App.vue to handle session-based routing
    - Add conditional rendering based on session state
    - Integrate UsernameEntry component for new sessions
    - Display current username in active sessions
    - Provide session termination functionality
    - _Requirements: 1.1, 1.3, 4.1, 4.4_

  - [ ]* 9.2 Write property test for username display consistency
    - **Property 10: Username Display Consistency**
    - **Validates: Requirements 4.4**

- [ ] 10. Cross-session data persistence testing
  - [ ]* 10.1 Write property test for cross-session data persistence
    - **Property 7: Cross-Session Data Persistence**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [ ] 11. Integration and end-to-end wiring
  - [ ] 11.1 Wire all components together for complete user flow
    - Connect session management with API client
    - Ensure proper error propagation and handling
    - Verify complete username entry to todo management flow
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2_

  - [ ]* 11.2 Write integration tests for multi-user scenarios
    - Test concurrent user sessions
    - Test user switching functionality
    - Test data isolation between users
    - _Requirements: 3.2, 3.5, 4.1, 4.2_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation maintains backward compatibility with existing todo functionality