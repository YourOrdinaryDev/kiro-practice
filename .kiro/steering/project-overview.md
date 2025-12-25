---
inclusion: always
---

# Todo Application - Project Overview

## Project Scope
This is a full-stack todo application built with TypeScript, allowing users to create, manage, and complete personal todo items.

## Core Features
- **Create Todos**: Users can add new todo items with descriptions
- **Mark Complete**: Users can check off todos as done
- **View Todos**: Display list of all todos with their completion status
- **Delete Todos**: Remove todos that are no longer needed

## Architecture
- **Frontend**: Vue 3 + TypeScript for reactive user interface
- **Backend**: Fastify server providing REST API for todo operations
- **Data**: In-memory storage (can be extended to database later)

## User Flow
1. User opens the application
2. Sees list of existing todos (if any)
3. Can add new todos using input form
4. Can mark todos as complete/incomplete by clicking checkbox
5. Can delete todos they no longer need

## Technical Approach
- RESTful API design for todo operations (GET, POST, PUT, DELETE)
- Reactive frontend that updates in real-time
- Type-safe communication between frontend and backend
- Component-based UI architecture