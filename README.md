# Todo Application

A full-stack todo application built with TypeScript, featuring a Vue 3 frontend and Fastify backend. Users can create, manage, and complete personal todo items with a clean, reactive interface.

## Features

- ✅ Create new todo items
- ✅ Mark todos as complete/incomplete
- ✅ Delete unwanted todos
- ✅ Real-time UI updates
- ✅ Type-safe API communication

## Structure

```
├── packages/
│   ├── frontend/     # Vue 3 + TypeScript todo interface
│   └── backend/      # Fastify REST API server
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start both projects in development mode:
```bash
npm run dev
```

This will start:
- Frontend on http://localhost:3000 (Todo interface)
- Backend on http://localhost:3001 (REST API)

## Available Scripts

- `npm run dev` - Start both frontend and backend in development mode (using concurrently)
- `npm run dev:frontend` - Start only the frontend
- `npm run dev:backend` - Start only the backend
- `npm run build` - Build both packages
- `npm run test` - Run tests in both packages
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier

## Individual Package Scripts

### Frontend (packages/frontend)
- `npm run dev:frontend` - Start Vite dev server
- `npm run build -w frontend` - Build for production
- `npm run test -w frontend` - Run Vitest tests

### Backend (packages/backend)
- `npm run dev:backend` - Start Fastify server with hot reload
- `npm run build -w backend` - Build TypeScript
- `npm run start -w backend` - Start production server
- `npm run test -w backend` - Run Vitest tests

## API Endpoints

The backend provides a RESTful API for todo operations:

- `GET /api/todos` - Get all todos
- `POST /api/todos` - Create new todo
- `PUT /api/todos/:id` - Update todo (mark complete/incomplete)
- `DELETE /api/todos/:id` - Delete todo

## Development

This project follows TypeScript strict mode and includes comprehensive linting and formatting. The steering documentation in `.kiro/steering/` provides detailed development standards and project guidelines.