import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import CategoryGrid from '@/components/store/home/CategoryGrid';
import type { Category } from '@/features/shared/types';

const mockCategories: Category[] = [
  { id: 'c1', parent_id: null, slug: 'electronics', name_ar: 'إلكترونيات', name_en: 'Electronics', is_active: true, sort_order: 0, image: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'c2', parent_id: null, slug: 'fashion', name_ar: 'أزياء', name_en: 'Fashion', is_active: true, sort_order: 1, image: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'c3', parent_id: null, slug: 'home', name_ar: 'منزل', name_en: 'Home', is_active: true, sort_order: 2, image: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
];

const meta = {
  component: CategoryGrid,
  tags: ['ai-generated'],
  args: {
    categories: mockCategories,
  },
} satisfies Meta<typeof CategoryGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('إلكترونيات')).toBeVisible();
    await expect(canvas.getByText('أزياء')).toBeVisible();
  },
};

export const Empty: Story = {
  args: { categories: [] },
};

export const SingleCategory: Story = {
  args: { categories: [mockCategories[0]] },
};
