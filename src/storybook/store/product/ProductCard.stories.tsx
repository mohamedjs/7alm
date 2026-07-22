import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import ProductCard from '@/components/store/product/ProductCard';
import type { Product } from '@/features/shared/types';

const baseProduct: Product = {
  id: 'p1',
  category_id: 'c1',
  name: 'حافظة هاتف فاخرة',
  slug: 'luxury-phone-case',
  description: 'حافظة جلدية فاخرة',
  price: 299,
  compare_at_price: null,
  quantity_prices: null,
  sku: null,
  qrcode: null,
  quantity: 50,
  stock_status: 'in_stock',
  main_image: null,
  gallery: [],
  is_active: true,
  theme_color: '#06b6d4',
  is_featured: true,
  featured_sort: 1,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const meta = {
  component: ProductCard,
  tags: ['ai-generated'],
  args: {
    product: baseProduct,
  },
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('حافظة هاتف فاخرة')).toBeVisible();
  },
};

export const WithDiscount: Story = {
  args: {
    product: { ...baseProduct, compare_at_price: 499 },
  },
};

export const WithAddToCart: Story = {
  args: {
    onAddToCart: () => {},
  },
  play: async ({ canvas, userEvent }) => {
    const btn = canvas.getByRole('button');
    await expect(btn).toBeVisible();
    await userEvent.click(btn);
    await expect(await canvas.findByText(/تمت الإضافة|Added/i)).toBeVisible();
  },
};

export const NoImage: Story = {
  args: {
    product: { ...baseProduct, main_image: null },
  },
};
