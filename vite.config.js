import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import prismjs from 'vite-plugin-prismjs';

// https://vitejs.dev/config/
export default defineConfig({
	base: '/crossref-xml-maker/',
	plugins: [
		preact(),
		prismjs({
      languages: ['xml'],
			theme: 'default',
			css: true
    }),
	],
});
