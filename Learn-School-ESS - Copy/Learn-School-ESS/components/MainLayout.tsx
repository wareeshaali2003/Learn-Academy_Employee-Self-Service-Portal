// components/layout/MainLayout.tsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';  // ESS ka existing Sidebar
import Topbar from '../Topbar';   // ← CHANGE: './Topbar' se '../Topbar' karo

export default function MainLayout() {
  return (
    <div className="app-shell">
      {/* ESS Sidebar -保持不变 */}
      <Sidebar />
      
      <div className="main-area">
        {/* Academic Topbar -新的样式 */}
        <Topbar />
        
        <div className="page-body">
          <div className="page-inner">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}