import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import UsernameEntry from './UsernameEntry.vue';

// Mock SessionManager
vi.mock('../services/SessionManager.js', () => ({
  sessionManager: {
    setUsername: vi.fn(),
  },
}));

describe('UsernameEntry.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders username entry form', () => {
    const wrapper = mount(UsernameEntry);

    expect(wrapper.find('h1').text()).toBe('Welcome to Todo App');
    expect(wrapper.find('input[type="text"]').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it('validates empty username', async () => {
    const wrapper = mount(UsernameEntry);
    const form = wrapper.find('form');

    await form.trigger('submit');

    expect(wrapper.find('.form-error').text()).toContain(
      'Username cannot be empty'
    );
  });

  it('validates whitespace-only username', async () => {
    const wrapper = mount(UsernameEntry);
    const input = wrapper.find('input[type="text"]');

    await input.setValue('   ');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.find('.form-error').text()).toContain(
      'Username cannot contain only spaces'
    );
  });

  it('validates username length', async () => {
    const wrapper = mount(UsernameEntry);
    const input = wrapper.find('input[type="text"]');

    // Test username longer than 50 characters
    const longUsername = 'a'.repeat(51);
    await input.setValue(longUsername);
    await wrapper.find('form').trigger('submit');

    expect(wrapper.find('.form-error').text()).toContain(
      'Username must be 50 characters or less'
    );
  });

  it('emits usernameSubmit event with valid username', async () => {
    const wrapper = mount(UsernameEntry);
    const input = wrapper.find('input[type="text"]');

    await input.setValue('validuser');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('usernameSubmit')).toBeTruthy();
    expect(wrapper.emitted('usernameSubmit')?.[0]).toEqual(['validuser']);
  });

  it('disables submit button when submitting', async () => {
    const wrapper = mount(UsernameEntry);
    const input = wrapper.find('input[type="text"]');
    const button = wrapper.find('button[type="submit"]');

    await input.setValue('validuser');

    // Initially enabled
    expect(button.attributes('disabled')).toBeUndefined();

    // Should be disabled when no username
    await input.setValue('');
    await wrapper.vm.$nextTick();
    expect(button.attributes('disabled')).toBeDefined();
  });
});
