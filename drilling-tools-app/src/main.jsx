import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initAntiInspectionGuard } from './lib/antiInspectionGuard.js';

// 🛡️ 프로덕션 배포 시 소스코드 보호 및 F12/우클릭 차단 가드 가동 (로컬은 자동 해제)
initAntiInspectionGuard();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
