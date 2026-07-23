import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import Select from '@/components/ui/Select';

const zoneOptions = [
  { value: 'z1', label: 'المعادي — القاهرة' },
  { value: 'z2', label: 'مدينة نصر — القاهرة' },
  { value: 'z3', label: 'الإسكندرية — الإسكندرية' },
];

const meta = {
  component: Select,
  tags: ['ai-generated'],
  args: {
    id: 'demo-select',
    options: zoneOptions,
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: { label: 'المنطقة', placeholder: 'اختر المنطقة' },
};

export const WithError: Story = {
  args: {
    label: 'المنطقة',
    placeholder: 'اختر المنطقة',
    error: 'يجب اختيار منطقة',
  },
  play: async ({ canvas }) => {
    const select = canvas.getByRole('combobox');
    await expect(select).toHaveAttribute('aria-invalid', 'true');
  },
};

export const Preselected: Story = {
  args: { label: 'المنطقة', value: 'z2' },
};

export const ChangeSelection: Story = {
  args: { label: 'المنطقة', placeholder: 'اختر المنطقة', onChange: fn() },
  play: async ({ canvas, userEvent, args }) => {
    const select = canvas.getByRole('combobox');
    await userEvent.selectOptions(select, 'z3');
    await expect(args.onChange).toHaveBeenCalled();
  },
};
