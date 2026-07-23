import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import CategoryFilterBar from '@/components/store/category/CategoryFilterBar';

const meta = {
  component: CategoryFilterBar,
  tags: ['ai-generated'],
  args: {
    sort: 'newest',
    onSortChange: fn(),
    inStockOnly: false,
    onInStockOnlyChange: fn(),
    resultCount: 12,
  },
} satisfies Meta<typeof CategoryFilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const newestBtn = canvas.getByRole('button', { pressed: true });
    await expect(newestBtn).toBeVisible();
  },
};

export const InStockActive: Story = {
  args: { inStockOnly: true },
};

export const SortByPriceAsc: Story = {
  args: { sort: 'price-asc' },
};

export const ClickSort: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const buttons = canvas.getAllByRole('button');
    const priceAscBtn = buttons[1];
    await userEvent.click(priceAscBtn);
    await expect(args.onSortChange).toHaveBeenCalled();
  },
};
