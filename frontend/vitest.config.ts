import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.spec.ts'],
    exclude: [
      // Excluir specs que usan TestBed con renderizado DOM completo (requieren zona Angular)
      'src/app/shared/components/hero-banner/hero-banner.spec.ts',
      'src/app/shared/components/section-header/section-header.spec.ts',
    ],
  },
});
