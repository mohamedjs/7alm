import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import CartLineItem from '@/components/store/cart/CartLineItem';
import type { CartItem } from '@/features/cart/cart.slice';

const baseItem: CartItem = {
  product_id: 'p1',
  name: 'حافظة هاتف فاخرة',
  slug: 'luxury-phone-case',
  main_image: null,
  price: 299,
  quantity: 2,
};

const meta = {
  component: CartLineItem,
  tags: ['ai-generated'],
  args: {
    item: baseItem,
    onUpdateQuantity: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof CartLineItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('حافظة هاتف فاخرة')).toBeVisible();
    await expect(canvas.getByText('2')).toBeVisible();
  },
};

export const Increment: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const incBtn = canvas.getByLabelText(/زيادة/i);
    await userEvent.click(incBtn);
    await expect(args.onUpdateQuantity).toHaveBeenCalledWith('p1', 3);
  },
};

export const Remove: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const removeBtn = canvas.getByLabelText(/إزالة/i);
    await userEvent.click(removeBtn);
    await expect(args.onRemove).toHaveBeenCalledWith('p1');
  },
};
