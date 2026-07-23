import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import Textarea from '@/components/ui/Textarea';

const meta = {
  component: Textarea,
  tags: ['ai-generated'],
  args: {
    id: 'demo-textarea',
    placeholder: 'اكتب التفاصيل هنا...',
    rows: 4,
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: { label: 'تفاصيل العنوان' },
};

export const WithError: Story = {
  args: {
    label: 'تفاصيل العنوان',
    error: 'هذا الحقل مطلوب',
  },
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole('textbox');
    await expect(textarea).toHaveAttribute('aria-invalid', 'true');
  },
};

export const TypeInteraction: Story = {
  args: { label: 'ملاحظات', onChange: fn() },
  play: async ({ canvas, userEvent, args }) => {
    const textarea = canvas.getByRole('textbox');
    await userEvent.type(textarea, 'شارع 9 — بجوار مسجد الرحمن');
    await expect(args.onChange).toHaveBeenCalled();
  },
};
