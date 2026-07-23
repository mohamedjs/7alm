import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import BrandLogo from '@/components/store/master/BrandLogo';

const meta = {
  component: BrandLogo,
  tags: ['ai-generated'],
} satisfies Meta<typeof BrandLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { className: 'h-10 w-auto' },
  play: async ({ canvas }) => {
    const svg = canvas.getByRole('img', { name: /7alm/i });
    await expect(svg).toBeVisible();
  },
};

export const Large: Story = {
  args: { className: 'h-20 w-auto' },
};

export const CssCheck: Story = {
  args: { className: 'h-10 w-auto text-text-primary' },
  play: async ({ canvas }) => {
    const svg = canvas.getByRole('img', { name: /7alm/i });
    const color = getComputedStyle(svg).color;
    await expect(color).not.toBe('');
    await expect(color).not.toBe('rgba(0, 0, 0, 0)');
  },
};
