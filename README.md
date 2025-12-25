# Todo List Management Application

A full-stack todo list management application built with TypeScript, featuring a Vue 3 frontend and Fastify backend. Users can create multiple todo lists, manage todo items within each list, and organize their tasks with a clean, reactive interface.

## Features

### Core Functionality
- ✅ **User Sessions** - Username-based authentication with session persistence
- ✅ **Multiple Todo Lists** - Create, rename, and delete todo lists
- ✅ **Todo Management** - Add, complete, and delete todo items within lists
- ✅ **List Organization** - Switch between different todo lists
- ✅ **Real-time Updates** - Reactive UI with immediate feedback
- ✅ **Data Persistence** - SQLite database with automatic migrations

### User Experience
- ✅ **Clean Interface** - Modern, responsive design with intuitive navigation
- ✅ **Session Management** - Persistent login with easy logout
- ✅ **Loading States** - Visual feedback during operations
- ✅ **Error Handling** - User-friendly error messages
- ✅ **Input Validation** - Client and server-side validation
- ✅ **Mobile Responsive** - Works on desktop and mobile devices

### Technical Features
- ✅ **Type Safety** - Full TypeScript implementation with strict mode
- ✅ **API Documentation** - RESTful API with JSON schema validation
- ✅ **Database Migrations** - Automatic schema updates and data migration
- ✅ **Component Architecture** - Reusable Vue 3 components with Composition API
- ✅ **Error Recovery** - Robust error handling and graceful degradation

## Architecture

```
├── packages/
│   ├── frontend/     # Vue 3 + TypeScript SPA
│   │   ├── src/
│   │   │   ├── components/    # Reusable Vue components
│   │   │   ├── api/          # API client and HTTP communication
│   │   │   ├── services/     # Session management and utilities
│   │   │   └── types/        # TypeScript type definitions
│   │   └── dist/             # Built application
│   └── backend/      # Fastify REST API server
│       ├── src/
│       │   ├── services/     # Business logic (Todo, User, List services)
│       │   ├── database/     # SQLite connection and migrations
│       │   ├── middleware/   # Session and authentication middleware
│       │   └── types/        # Shared type definitions
│       └── dist/             # Compiled TypeScript
└── .kiro/
    └── steering/             # Development standards and guidelines
```

## Getting Started

### Prerequisites
- Node.js 24+ and npm

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Start development servers:**
```bash
npm run dev
```

This starts both services:
- **Frontend**: http://localhost:3000 (Vue 3 application)
- **Backend**: http://localhost:3001 (Fastify API server)

### First Use
1. Open http://localhost:3000 in your browser
2. Enter a username to create your session
3. Create your first todo list
4. Start adding and managing your todos!

## Available Scripts

### Root Level Commands
- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only the frontend development server
- `npm run dev:backend` - Start only the backend development server
- `npm run build` - Build both packages for production
- `npm run test` - Run all tests across packages
- `npm run lint` - Lint all packages with ESLint
- `npm run format` - Format all code with Prettier

### Package-Specific Commands

#### Frontend (packages/frontend)
```bash
cd packages/frontend
npm run dev          # Vite development server
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run Vitest unit tests
npm run test:watch   # Run tests in watch mode
npm run lint         # ESLint with auto-fix
npm run format       # Prettier formatting
```

#### Backend (packages/backend)
```bash
cd packages/backend
npm run dev          # Development server with hot reload
npm run build        # Compile TypeScript
npm run start        # Start production server
npm run test         # Run Vitest unit tests
npm run test:watch   # Run tests in watch mode
npm run lint         # ESLint with auto-fix
npm run format       # Prettier formatting
```

## API Documentation

The backend provides a comprehensive REST API for todo list management:

### Authentication
- `GET /api/users/:username` - Get or create user by username

### Todo Lists
- `GET /api/users/:userId/lists` - Get all lists for a user
- `POST /api/users/:userId/lists` - Create a new todo list
- `PUT /api/lists/:listId` - Update list name
- `DELETE /api/lists/:listId` - Delete a list and all its todos

### Todos
- `GET /api/lists/:listId/todos` - Get all todos in a list
- `POST /api/lists/:listId/todos` - Create a new todo in a list
- `PUT /api/todos/:id` - Update todo completion status
- `DELETE /api/todos/:id` - Delete a todo
- `PUT /api/todos/:id/move` - Move todo to different list

### System
- `GET /health` - Health check endpoint

All endpoints return JSON with consistent response format:
```json
{
  "data": { /* response data */ },
  "success": true
}
```

## Database Schema

The application uses SQLite with automatic migrations:

- **users** - User accounts with usernames
- **todo_lists** - Todo lists belonging to users  
- **todos** - Individual todo items within lists

Database files are stored in `packages/backend/` and migrations run automatically on startup.

## Development

### Code Standards
- **TypeScript Strict Mode** - Full type safety enforcement
- **ESLint + Prettier** - Consistent code formatting and linting
- **Vue 3 Composition API** - Modern reactive component architecture
- **RESTful API Design** - Standard HTTP methods and status codes
- **Component Testing** - Unit tests for business logic and components

### Project Structure
- **Monorepo Setup** - Shared dependencies and coordinated development
- **Type Sharing** - Common TypeScript interfaces between frontend/backend
- **Development Tooling** - Hot reload, testing, and build optimization
- **Documentation** - Comprehensive steering files in `.kiro/steering/`

### Contributing
1. Follow the development standards in `.kiro/steering/`
2. Run `npm run lint` and `npm run format` before committing
3. Ensure all tests pass with `npm run test`
4. Use meaningful commit messages

## Deployment

### Production Build
```bash
npm run build
```

### Frontend Deployment
The frontend builds to `packages/frontend/dist/` as a static SPA that can be served by any web server.

### Backend Deployment
The backend compiles to `packages/backend/dist/` and can be run with:
```bash
cd packages/backend
npm run build
npm start
```

## License

This project is licensed under the MIT License.