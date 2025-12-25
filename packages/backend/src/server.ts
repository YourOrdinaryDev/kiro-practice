import Fastify from 'fastify';

const fastify = Fastify({
  logger: true,
});

// Register CORS plugin
await fastify.register(import('@fastify/cors'), {
  origin: ['http://localhost:3000'], // Allow frontend origin
  credentials: true,
});

// Health check route
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// API route
fastify.get('/api/hello', async () => {
  return { message: 'Hello from Fastify backend!' };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Server is running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();