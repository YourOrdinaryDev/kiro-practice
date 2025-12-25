# TypeScript Monorepo

A TypeScript monorepo with Vue 3 frontend and Fastify backend.

## Structure

```
├── packages/
│   ├── frontend/     # Vue 3 + TypeScript app
│   └── backend/      # Fastify server
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
- Frontend on http://localhost:3000
- Backend on http://localhost:3001

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