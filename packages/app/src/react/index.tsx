
import { createRoot } from 'react-dom/client';
import App from './app/App.js';
import './index.css';
import 'react-toastify/dist/ReactToastify.css';
import { StrictMode } from 'react';


const root = createRoot(document.getElementById('root')!);
root.render(<App />);
