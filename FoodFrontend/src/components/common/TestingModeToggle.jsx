import React, { useEffect, useState } from 'react';
import { api } from '../../stores/api';
import { AlertTriangle } from 'lucide-react';

const TestingModeToggle = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/settings/testing-mode')
      .then(res => setIsEnabled(res.data?.data?.isEnabled === true))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggle = async (e) => {
    const newStatus = e.target.checked;
    if (!window.confirm(`Are you sure you want to ${newStatus ? 'ENABLE' : 'DISABLE'} testing mode globally?`)) return;
    setIsLoading(true);
    try {
      const res = await api.post('/admin/settings/testing-mode', { enable: newStatus });
      setIsEnabled(res.data?.data?.isEnabled === true);
      window.location.reload();
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-yellow-800 flex items-center gap-2">
            <AlertTriangle /> Global Testing Mode
          </h4>
          <p className="text-sm text-yellow-700 mt-1">
            Enable or disable all testing routes and UI components.
          </p>
        </div>
        {isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-800"></div>
        ) : (
          <label htmlFor="testing-toggle" className="flex items-center cursor-pointer">
            <div className="relative">
              <input type="checkbox" id="testing-toggle" className="sr-only" checked={isEnabled} onChange={handleToggle} />
              <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${isEnabled ? 'transform translate-x-full bg-yellow-400' : ''}`}></div>
            </div>
            <div className="ml-3 text-gray-700 font-medium">
              {isEnabled ? 'ENABLED' : 'DISABLED'}
            </div>
          </label>
        )}
      </div>
    </div>
  );
};

export default TestingModeToggle;


