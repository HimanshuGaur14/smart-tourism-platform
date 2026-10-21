import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssistantPanel } from './assistant-panel';
import { CHAT_URL, DOUBLE_CLICK_MS } from './config';

const getTab = () =>
  document.querySelector<HTMLButtonElement>('[aria-controls="assistant-panel"]')!;
const iframe = () => document.querySelector('iframe');
const singleClick = () => {
  fireEvent.click(getTab(), { detail: 1 });
  act(() => void vi.advanceTimersByTime(DOUBLE_CLICK_MS));
};

describe('AssistantPanel', () => {
  let openSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.useFakeTimers();
    openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts collapsed and loads the iframe only on first open', () => {
    render(<AssistantPanel />);
    expect(getTab()).toHaveAttribute('aria-expanded', 'false');
    expect(getTab()).toHaveAccessibleName('Open AI Assistant');
    expect(iframe()).toBeNull();

    singleClick();
    expect(getTab()).toHaveAttribute('aria-expanded', 'true');
    expect(iframe()).toHaveAttribute('src', CHAT_URL);

    singleClick();
    expect(getTab()).toHaveAttribute('aria-expanded', 'false');
    expect(iframe()).not.toBeNull(); // kept, so the conversation survives
  });

  it('waits for a possible second click before toggling', () => {
    render(<AssistantPanel />);
    fireEvent.click(getTab(), { detail: 1 });
    act(() => void vi.advanceTimersByTime(DOUBLE_CLICK_MS - 50));
    expect(getTab()).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a popup on double click, without toggling, and keeps the panel collapsed', () => {
    render(<AssistantPanel />);
    fireEvent.click(getTab(), { detail: 1 });
    fireEvent.click(getTab(), { detail: 2 });
    fireEvent.doubleClick(getTab());
    // window.open runs synchronously inside the dblclick handler, not in a timer.
    expect(openSpy).toHaveBeenCalledWith(CHAT_URL, 'chat', 'width=420,height=700,resizable=yes');
    act(() => void vi.advanceTimersByTime(1000));
    expect(getTab()).toHaveAttribute('aria-expanded', 'false');
  });

  it('collapses an open panel when the popup opens from the header button', () => {
    render(<AssistantPanel />);
    singleClick();
    fireEvent.click(screen.getByRole('button', { name: 'Open chat in a new window' }));
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(getTab()).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles at once from the keyboard and closes on Escape', () => {
    render(<AssistantPanel />);
    fireEvent.click(getTab(), { detail: 0 }); // Enter/Space on a button
    expect(getTab()).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(getTab()).toHaveAttribute('aria-expanded', 'false');
    expect(getTab()).toHaveFocus();
  });

  it('makes the collapsed panel unreachable', () => {
    render(<AssistantPanel />);
    expect(document.getElementById('assistant-panel')).toHaveAttribute('inert');
  });
});
