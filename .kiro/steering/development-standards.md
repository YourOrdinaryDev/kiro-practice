---
inclusion: always
---

# Development Standards

## Code Style
- Use TypeScript strict mode for type safety
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Keep functions small and focused on single responsibility

## API Design
- RESTful endpoints following standard conventions:
  - `GET /api/todos` - Get all todos
  - `POST /api/todos` - Create new todo
  - `PUT /api/todos/:id` - Update todo (mark complete/incomplete)
  - `DELETE /api/todos/:id` - Delete todo
- Use proper HTTP status codes (200, 201, 404, 500)
- Return consistent JSON response format

## Frontend Standards
- Use Vue 3 Composition API for better TypeScript integration
- Create reusable components (TodoItem, TodoList, TodoForm)
- Handle loading states and error messages gracefully
- Use reactive data for real-time UI updates

## Testing Approach
- Write unit tests for core business logic
- Test API endpoints with proper request/response validation
- Test Vue components with user interaction scenarios
- Aim for meaningful test coverage, not just high percentages

## Data Models
```typescript
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}
```

## Error Handling
- Validate input data on both frontend and backend
- Provide user-friendly error messages
- Log errors appropriately for debugging
- Handle network failures gracefully