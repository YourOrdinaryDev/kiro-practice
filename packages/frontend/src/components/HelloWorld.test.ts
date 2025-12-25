import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../App.vue';

describe('App.vue', () => {
  it('renders hello message', () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain('Hello Vue 3!');
  });
});