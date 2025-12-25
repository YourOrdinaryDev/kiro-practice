import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../App.vue';

// Mock the SessionManager
vi.mock('../services/SessionManager.js', () => ({
  sessionManager: {
    getCurrentUsername: vi.fn(() => null),
    setUsername: vi.fn(),
    clearSession: vi.fn(),
    hasActiveSession: vi.fn(() => false),
  },
}));

// Mock the TodoApiClient
vi.mock('../api/TodoApiClient.js', () => ({
  todoApiClient: {
    setUsername: vi.fn(),
    clearUsername: vi.fn(),
    getTodos: vi.fn(() => Promise.resolve([])),
  },
}));

describe('App.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders username entry screen when no session is active', () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain('Welcome to Todo App');
    expect(wrapper.text()).toContain(
      'Enter your username to access your personal todo list'
    );
    expect(wrapper.text()).toContain('Start Session');
  });

  it('renders session header when session is active', async () => {
    // Import the mocked module and update its behavior
    const { sessionManager } = await import('../services/SessionManager.js');
    vi.mocked(sessionManager.getCurrentUsername).mockReturnValue('testuser');

    const wrapper = mount(App);

    // Wait for component to initialize
    await wrapper.vm.$nextTick();

    // Should show session header with username
    expect(wrapper.text()).toContain('Welcome back,');
    expect(wrapper.text()).toContain('testuser');
    expect(wrapper.text()).toContain('End Session');
  });
});
