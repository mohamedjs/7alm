import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import Checkbox from '@/components/ui/Checkbox';

const meta = {
  component: Checkbox,
  tags: ['ai-generated'],
  args: {
    id: 'demo-checkbox',
    label: 'نشط',
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole('checkbox');
    await expect(checkbox).not.toBeChecked();
  },
};

export const Checked: Story = {
  args: { checked: true, onChange: fn() },
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole('checkbox');
    await expect(checkbox).toBeChecked();
  },
};

export const Disabled: Story = {
  args: { disabled: true, label: 'خيار معطل' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox')).toBeDisabled();
  },
};

export const Toggle: Story = {
  args: { onChange: fn() },
  play: async ({ canvas, userEvent, args }) => {
    const checkbox = canvas.getByRole('checkbox');
    await userEvent.click(checkbox);
    await expect(args.onChange).toHaveBeenCalled();
  },
};
