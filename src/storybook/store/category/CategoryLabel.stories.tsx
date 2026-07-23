import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import CategoryLabel from '@/components/store/category/CategoryLabel';
import type { Category } from '@/features/shared/types';

const mockCategory: Category = {
  id: 'c1',
  parent_id: null,
  slug: 'electronics',
  name_ar: 'إلكترونيات',
  name_en: 'Electronics',
  is_active: true,
  sort_order: 0,
  image: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const meta = {
  component: CategoryLabel,
  tags: ['ai-generated'],
  args: {
    category: mockCategory,
  },
} satisfies Meta<typeof CategoryLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('إلكترونيات')).toBeVisible();
  },
};

export const AsHeading: Story = {
  args: { as: 'h2', className: 'text-2xl font-bold' },
};

export const Uncategorized: Story = {
  args: { category: null },
};
