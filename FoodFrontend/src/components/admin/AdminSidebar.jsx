import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../stores/api';
import { Button } from '../ui/button';

const AdminSidebar = () => {
  const [testingEnabled, setTestingEnabled] = useState(false);

  useEffect(() => {
    api.get('/admin/settings/testing-mode')
      .then(res => setTestingEnabled(res.data?.data?.isEnabled === true))
      .catch(() => setTestingEnabled(false));
  }, []);

  const toggleTestingMode = async () => {
    try {
      const newValue = !testingEnabled;
      await api.post('/admin/settings/testing-mode', { enable: newValue });
      setTestingEnabled(newValue);
      console.log(`Testing mode ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle testing mode:', error);
    }
  };

  const links = [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/drone-fleet-management', label: '🚁 Drone Fleet' },
    { to: '/admin/regular-delivery', label: 'Regular Delivery' },
  ];
  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
      <div className="p-4 text-lg font-semibold">Admin</div>
      
      {/* Testing Mode Toggle */}
      <div className="px-4 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Testing Mode</span>
          <Button
            onClick={toggleTestingMode}
            variant={testingEnabled ? "default" : "outline"}
            size="sm"
            className="text-xs"
          >
            {testingEnabled ? "ON" : "OFF"}
          </Button>
        </div>
      </div>
      
      <nav className="px-2 py-2 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => `block px-3 py-2 rounded-md text-sm ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            {l.label}
          </NavLink>
        ))}
        {testingEnabled && (
          <NavLink
            to="/admin/enhanced-drone-testing"
            className={({ isActive }) => `block px-3 py-2 rounded-md text-sm ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            🚁 Enhanced Drone Testing
          </NavLink>
        )}
      </nav>
    </aside>
  );
};

export default AdminSidebar;


