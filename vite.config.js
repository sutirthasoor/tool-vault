import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const adminPage = () => {
  const mw = (req, _res, next) => {
    // Add a null check to avoid edge cases
    if (req.url && /^\/admin(\/|$|\?)/.test(req.url)) {
      req.url = '/admin.html';
    }
    next();
  };
  
  return {
    name: 'admin-page',
    // Key point: return a function here to ensure the middleware executes after Vite's internal middleware
    configureServer(s) {
      return () => {
        s.middlewares.use(mw);
      };
    },
    configurePreviewServer(s) {
      return () => {
        s.middlewares.use(mw);
      };
    }
  };
};

export default defineConfig({
  plugins: [react(), adminPage()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});