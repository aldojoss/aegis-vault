// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { LegacyDemoReview } from '../src/components/LegacyDemoReview';
import { VaultItem } from '../src/types/vault';

afterEach(cleanup);
const item = (id: string, title: string, trashed = false): VaultItem => ({ id, title, trashed, category: 'login', createdAt: 1, updatedAt: 1 });
it('does not show demo cleanup for real records or already trashed examples', () => {
  render(<LegacyDemoReview items={[item('real', 'Personal record'), item('sample-1', 'Old demo', true)]} onMoveToTrash={vi.fn()} />);
  expect(screen.queryByText('Revisar ejemplos antiguos')).toBeNull();
});
it('requires explicit selection and only submits the selected legacy record', async () => {
  const move = vi.fn(async () => true);
  render(<LegacyDemoReview items={[item('sample-1', 'Old demo'), item('sample-2', 'Edited record to keep'), item('real', 'Personal record')]} onMoveToTrash={move} />);
  fireEvent.click(screen.getByRole('button', { name: 'Revisar ejemplos antiguos' }));
  expect((screen.getByRole('button', { name: 'Mover a la papelera' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByLabelText('Personal record')).toBeNull();
  fireEvent.click(screen.getByLabelText('Old demo'));
  fireEvent.click(screen.getByRole('button', { name: 'Mover a la papelera' }));
  await waitFor(() => expect(move).toHaveBeenCalledWith(['sample-1']));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
it('retains the selection after a rejected save so the user can retry', async () => {
  render(<LegacyDemoReview items={[item('sample-1', 'Old demo')]} onMoveToTrash={vi.fn(async () => false)} />);
  fireEvent.click(screen.getByRole('button', { name: 'Revisar ejemplos antiguos' }));
  fireEvent.click(screen.getByLabelText('Old demo'));
  fireEvent.click(screen.getByRole('button', { name: 'Mover a la papelera' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect((screen.getByLabelText('Old demo') as HTMLInputElement).checked).toBe(true);
});
