import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../App.vue';

describe('App.vue', () => {
  it('renders todo management app', () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain('Todo Management');
    expect(wrapper.text()).toContain('Add a new todo');
  });
});