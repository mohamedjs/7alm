import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import Input from '@/components/ui/Input';

const meta = {
  component: Input,
  tags: ['ai-generated'],
  args: {
    id: 'demo-input',
    placeholder: 'اكتب هنا...',
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: { label: 'الاسم الكامل', placeholder: 'محمد أحمد' },
};

export const WithError: Story = {
  args: {
    label: 'البريد الإلكتروني',
    type: 'email',
    value: 'invalid',
    error: 'بريد إلكتروني غير صالح',
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByText('بريد إلكتروني غير صالح')).toBeVisible();
  },
};

export const Password: Story = {
  args: { label: 'كلمة المرور', type: 'password', placeholder: '••••••••', dir: 'ltr' },
};

export const Disabled: Story = {
  args: { label: 'حقل معطل', value: 'لا يمكن التعديل', disabled: true },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox');
    await expect(input).toBeDisabled();
  },
};

export const TypeInteraction: Story = {
  args: { label: 'رقم الهاتف', type: 'tel', dir: 'ltr', onChange: fn() },
  play: async ({ canvas, userEvent, args }) => {
    const input = canvas.getByRole('textbox');
    await userEvent.type(input, '01012345678');
    await expect(args.onChange).toHaveBeenCalled();
  },
};

export const CssCheck: Story = {
  args: { label: 'فحص الأنماط' },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox');
    const style = getComputedStyle(input);
    await expect(style.borderRadius).not.toBe('0px');
    await expect(style.backgroundColor).toBe('rgb(243, 244, 246)');
  },
};
