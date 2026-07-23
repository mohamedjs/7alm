import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import Button from '@/components/ui/Button';

const meta = {
  component: Button,
  tags: ['ai-generated'],
  args: {
    children: 'اضغط هنا',
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const btn = canvas.getByRole('button', { name: 'اضغط هنا' });
    await userEvent.click(btn);
    await expect(args.onClick).toHaveBeenCalled();
  },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'إلغاء' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'حذف' },
};

export const Small: Story = {
  args: { size: 'sm', children: 'صغير' },
};

export const Large: Story = {
  args: { size: 'lg', children: 'كبير' },
};

export const Disabled: Story = {
  args: { disabled: true, children: 'معطل' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button')).toBeDisabled();
  },
};

export const CssCheck: Story = {
  args: { children: 'فحص' },
  play: async ({ canvas }) => {
    const btn = canvas.getByRole('button');
    const bg = getComputedStyle(btn).backgroundColor;
    await expect(bg).toBe('rgb(6, 182, 212)');
  },
};
