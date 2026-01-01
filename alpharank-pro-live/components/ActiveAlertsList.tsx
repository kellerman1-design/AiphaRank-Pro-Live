
import React, { useState, useEffect } from 'react';
import { StockAlert } from '../types';
import { userService } from '../services/userService';
import { notificationService } from '../services/notificationService';
import { X, Bell, Trash2, TrendingUp, Activity, Check } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const ActiveAlertsList: React.FC<Props> = ({ onClose }) => {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setAlerts(userService.getAlerts());
    setPermission(notificationService.getPermission());
  }, []);

  const handleDelete = (id: string) => {
    userService.removeAlert(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleEnableNotifications = async () => {
    const granted = await notificationService.requestPermission();
    setPermission(granted ? 'granted' : 'denied');
    if (granted) {
      notificationService.send("Notifications Active", "You will now receive alerts for your stocks.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Bell className="text-yellow-400" size={20} />
              My Active Alerts
            </h3>
            <p className="text-sm text-gray-400">Monitoring {alerts.filter(a => a.active && !a.triggered).length} active conditions</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Notification Permission Banner */}
        {permission === 'default' && (
          <div className="bg-blue-900/20 px-6 py-3 flex items-center justify-between border-b border-blue-900/30">
            <div className="flex items-center gap-2 text-blue-300 text-sm">
              <Bell size={16} />
              <span>Enable push notifications to receive alerts on your phone</span>
            </div>
            <button 
              onClick={handleEnableNotifications}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
            >
              Enable
            </button>
          </div>
        )}

        {/* List */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell size={48} className="mx-auto mb-4 opacity-20" />
              <p>No active alerts set.</p>
              <p className="text-sm mt-2">Go to a stock's detail view to add one.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map(alert => (
                <div key={alert.id} className={`bg-gray-850 border rounded-xl p-4 flex items-center justify-between group transition-colors ${alert.triggered ? 'border-gray-700 opacity-60' : 'border-gray-700 hover:border-blue-500/50'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-2 rounded-lg border ${alert.triggered ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-blue-900/30 border-blue-500/20 text-blue-400'}`}>
                      <span className="font-bold font-mono text-lg">{alert.ticker}</span>
                    </div>
                    <div>
                      {alert.targetPrice && (
                        <div className="flex items-center gap-2 text-sm text-white">
                          <TrendingUp size={14} className={alert.triggered ? 'text-gray-500' : 'text-green-400'} />
                          Target Price: <span className="font-mono font-bold">${alert.targetPrice}</span>
                        </div>
                      )}
                      {alert.targetScore && (
                        <div className="flex items-center gap-2 text-sm text-white mt-1">
                          <Activity size={14} className={alert.triggered ? 'text-gray-500' : 'text-purple-400'} />
                          Technical Score: <span className="font-mono font-bold">{alert.targetScore}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{new Date(alert.createdAt).toLocaleDateString()}</span>
                        {alert.triggered && <span className="text-xs bg-gray-700 text-gray-300 px-1.5 rounded flex items-center gap-1"><Check size={10}/> Triggered</span>}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(alert.id)}
                    className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete Alert"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveAlertsList;
