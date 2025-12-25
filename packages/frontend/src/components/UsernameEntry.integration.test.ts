import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UsernameEntry from './UsernameEntry.vue';

describe('UsernameEntry Integration', () => {
  it('can be imported and mounted successfully', () => {
    const wrapper = mount(UsernameEntry);
    expect(wrapper.vm).toBeTruthy();
    expect(wrapper.find('.username-entry').exists()).toBe(true);
  });

  it('has proper component structure', () => {
    const wrapper = mount(UsernameEntry);

    // Check main container
    expect(wrapper.find('.username-entry-container').exists()).toBe(true);

    // Check header elements
    expect(wrapper.find('.entry-header h1').exists()).toBe(true);
    expect(wrapper.find('.entry-subtitle').exists()).toBe(true);

    // Check form elements
    expect(wrapper.find('.username-form').exists()).toBe(true);
    expect(wrapper.find('.form-group').exists()).toBe(true);
    expect(wrapper.find('.form-label').exists()).toBe(true);
    expect(wrapper.find('.form-input').exists()).toBe(true);
    expect(wrapper.find('.submit-button').exists()).toBe(true);
  });
});
