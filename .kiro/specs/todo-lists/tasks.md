# Implementation Plan: Todo Lists

## Overview

This implementation plan transforms the existing single-table todo system into a multi-list system with proper user management. The approach focuses on database migration, API extension, and frontend updates while maintaining backward compatibility.

## Tasks

- [x] 1. Database schema migration and setup
  - Create new database tables (users, todo_lists, todos) with foreign key constraints
  - Implement migration script to transfer existing todos to new schema
  - Create default user and "My Tasks" list for existing data
  - _Requirements: 1.1, 6.1, 7.1_

- [ ]* 1.1 Write property test for database migration
  - **Property 11: Default list creation**
  - **Validates: Requirements 7.1**

- [x] 2. Update TypeScript interfaces and types
  - Define User, TodoList, and updated Todo interfaces
  - Update existing todo types to include list_id
  - Create API request/response types for new endpoints
  - _Requirements: 1.1, 2.3, 4.2_

- [x] 3. Implement User service layer
  - [x] 3.1 Create UserService class with user management methods
    - Implement getOrCreateUser method for session management
    - Add createDefaultList method for new users
    - _Requirements: 1.2, 7.1_

  - [ ]* 3.2 Write property test for user session management
    - **Property 1: User session management**
    - **Validates: Requirements 1.2, 1.4**

- [x] 4. Implement TodoList service layer
  - [x] 4.1 Create TodoListService class with list management methods
    - Implement getListsForUser, createList, updateListName, deleteList methods
    - Add list ownership validation and name uniqueness checking
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.4_

  - [ ]* 4.2 Write property test for list name validation
    - **Property 2: List name validation**
    - **Validates: Requirements 2.1**

  - [ ]* 4.3 Write property test for list name uniqueness
    - **Property 3: List name uniqueness per user**
    - **Validates: Requirements 2.2, 3.4**

  - [ ]* 4.4 Write property test for minimum list invariant
    - **Property 12: Minimum list invariant**
    - **Validates: Requirements 7.2, 7.3**

- [-] 5. Update TodoService for list-based operations
  - [x] 5.1 Modify existing TodoService to work with list associations
    - Update getTodos to filter by list_id
    - Modify createTodo to require list_id
    - Add moveTodoToList method for cross-list operations
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 5.2 Write property test for data ownership and filtering
    - **Property 5: Data ownership and filtering**
    - **Validates: Requirements 1.3, 2.4, 3.3, 4.2, 4.3**

  - [ ]* 5.3 Write property test for todo movement preservation
    - **Property 9: Todo movement preservation**
    - **Validates: Requirements 4.4, 4.5**

- [ ] 6. Checkpoint - Ensure all service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Extend REST API endpoints
  - [x] 7.1 Add user management endpoints
    - Implement GET/POST /api/users endpoints
    - Add user session handling middleware
    - _Requirements: 1.2, 1.4_

  - [x] 7.2 Add list management endpoints
    - Implement /api/users/:userId/lists endpoints (GET, POST)
    - Implement /api/lists/:listId endpoints (PUT, DELETE)
    - Add list ownership validation middleware
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.4_

  - [x] 7.3 Update todo endpoints for list-based operations
    - Modify existing todo endpoints to work with lists
    - Add /api/lists/:listId/todos endpoints
    - Add /api/todos/:todoId/move endpoint for list transfers
    - _Requirements: 4.1, 4.3, 4.4_

- [ ]* 7.4 Write property test for cascade deletion
  - **Property 7: Cascade deletion behavior**
  - **Validates: Requirements 3.2, 6.2**

- [ ]* 7.5 Write property test for todo count accuracy
  - **Property 10: Todo count accuracy**
  - **Validates: Requirements 5.5**

- [x] 8. Update frontend components for list management
  - [x] 8.1 Create ListSelector component
    - Display user's todo lists with names and counts
    - Handle list selection and active list indication
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [x] 8.2 Create ListManager component
    - Implement list creation, renaming, and deletion UI
    - Add confirmation dialogs for destructive operations
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.5_

  - [x] 8.3 Update TodoApp component for list-based workflow
    - Integrate list selection with todo display
    - Update todo creation to use selected list
    - Add list context to all todo operations
    - _Requirements: 4.1, 4.3, 5.2_

- [ ]* 8.4 Write property test for list renaming preservation
  - **Property 6: List renaming preserves todos**
  - **Validates: Requirements 3.1**

- [ ]* 8.5 Write property test for default list equality
  - **Property 13: Default list equality**
  - **Validates: Requirements 7.4**

- [-] 9. Update API client for new endpoints
  - [x] 9.1 Extend TodoApiClient with user and list methods
    - Add user session management methods
    - Add list CRUD operations
    - Update todo methods to work with list context
    - _Requirements: 1.2, 2.1, 2.2, 3.1, 3.2, 4.1, 4.3, 4.4_

  - [ ]* 9.2 Write property test for unique ID generation
    - **Property 4: Unique identifier generation**
    - **Validates: Requirements 2.3**

  - [ ]* 9.3 Write property test for todo list requirement
    - **Property 8: Todo list requirement**
    - **Validates: Requirements 4.1**

- [x] 10. Integration and data migration
  - [x] 10.1 Run database migration on existing data
    - Execute migration script to transform existing todos
    - Verify data integrity after migration
    - Update application to use new schema
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 10.2 Update session management for user identification
    - Implement username-based session handling
    - Ensure proper user context throughout application
    - _Requirements: 1.2, 1.3, 1.4_

- [ ]* 10.3 Write integration tests for complete user workflows
  - Test end-to-end list and todo management flows
  - Verify proper data isolation between users
  - _Requirements: All requirements_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Database migration preserves existing todo data by creating default user and list
- Property tests validate universal correctness across all inputs
- Integration tests ensure complete workflows function correctly
- The implementation maintains backward compatibility during transition