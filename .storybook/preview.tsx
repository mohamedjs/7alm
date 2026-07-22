import type { Preview } from '@storybook/nextjs-vite';
import '../src/app/globals.css';
import React from 'react';
import ReduxProvider from '../src/lib/redux/ReduxProvider';
import { LocaleProvider } from '../src/features/i18n/i18n.hooks';

function StoryDecorator(Story: React.ComponentType) {
  return (
    <ReduxProvider>
      <LocaleProvider storageKey="store-locale">
        <Story />
      </LocaleProvider>
    </ReduxProvider>
  );
}

const preview: Preview = {
  decorators: [StoryDecorator],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
};

export default preview;
