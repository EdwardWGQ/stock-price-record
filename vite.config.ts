import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { include: ['tests/**/*.test.ts'], testTimeout: 30000 },
  build: { sourcemap: false, rolldownOptions: { output: { codeSplitting: { groups: [
    { name: 'temporal', test: /node_modules[\\/](@js-temporal|jsbi)/ },
    { name: 'supabase', test: /node_modules[\\/]@supabase/ },
    { name: 'charts', test: /node_modules[\\/](chart\.js|@kurkle)/ },
  ] } } } },
});
