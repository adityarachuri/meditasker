import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { databaseService } from './services/databaseService';

declare global {
  interface Window {
    databaseService: typeof databaseService;
  }
}

// Enterprise performance monitoring
if (typeof window !== 'undefined') {
  window.databaseService = databaseService;
  
  // Enterprise memory monitoring
  setInterval(() => {
    const memoryUsage = databaseService.getMemoryUsage();
    const totalRecords = memoryUsage.users + memoryUsage.projects + memoryUsage.tasks;
    
    if (totalRecords > 0) {
      console.log(`Enterprise monitoring: ${totalRecords.toLocaleString()} records in memory`);
    }
  }, 60000); // Check every minute
}

createRoot(document.getElementById('root')!).render(
  // <StrictMode> // Disabled for enterprise performance (prevents double rendering)
  <App />
  // </StrictMode>
);
