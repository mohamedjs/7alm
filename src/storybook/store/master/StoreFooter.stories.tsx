import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import StoreFooter from '@/components/store/master/StoreFooter';

const meta = {
  component: StoreFooter,
  tags: ['ai-generated'],
} satisfies Meta<typeof StoreFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/©/)).toBeVisible();
  },
};
