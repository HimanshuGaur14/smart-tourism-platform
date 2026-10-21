import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field, Input } from './form';
import { SmartImage } from './smart-image';
import { Button } from './button';

describe('design system components', () => {
  it('Field wires the label, hint and error to the control', () => {
    render(
      <Field label="Email" error="Enter a valid email address.">
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email address.');
  });

  it('SmartImage falls back to a placeholder instead of a broken image', () => {
    render(<SmartImage image={{ src: '/missing.jpg', alt: 'Netarhat sunrise' }} />);
    fireEvent.error(screen.getByRole('img', { name: 'Netarhat sunrise' }));
    const fallback = screen.getByRole('img', { name: 'Netarhat sunrise' });
    expect(fallback.tagName).toBe('DIV');
  });

  it('Button shows a busy, disabled state while loading', () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
