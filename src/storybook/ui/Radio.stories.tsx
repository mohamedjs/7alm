import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import Radio from '@/components/ui/Radio';

const meta = {
  component: Radio,
  tags: ['ai-generated'],
  args: {
    name: 'demo-radio',
    onChange: fn(),
  },
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { id: 'opt-1', label: 'الخيار الأول', value: '1' },
};

export const Checked: Story = {
  args: { id: 'opt-2', label: 'الخيار المحدد', value: '2', checked: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio')).toBeChecked();
  },
};

export const Disabled: Story = {
  args: { id: 'opt-3', label: 'خيار معطل', value: '3', disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio')).toBeDisabled();
  },
};

export const SelectRadio: Story = {
  args: { id: 'opt-4', label: 'اضغط لاختياري', value: '4' },
  play: async ({ canvas, userEvent, args }) => {
    const radio = canvas.getByRole('radio');
    await userEvent.click(radio);
    await expect(args.onChange).toHaveBeenCalled();
  },
};
