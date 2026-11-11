import { useState, useEffect } from 'react';
import { useSession } from '../../hooks/useSession';
import { Clock, RefreshCw, LogOut } from 'lucide-react';

interface SessionManagerProps {
  onLogout: () => void;
  showWarningAt?: number; // milliseconds before expiry to show warning
  autoRenew?: boolean;
}

export function SessionManager({ 
  onLogout, 
  showWarningAt = 5 * 60 * 1000, // 5 minutes by default
  autoRenew = true 
}: SessionManagerProps) {
  const { 
    isActive, 
    timeRemaining, 
    formattedTimeRemaining, 
    renewSession, 
    endSession 
  } = useSession({
    autoRenew,
    onExpire: onLogout
  });

  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (isActive && timeRemaining < showWarningAt) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [isActive, timeRemaining, showWarningAt]);

  if (!isActive) return null;

  return (
    <>
      {/* Session timer in header */}
      <div className="flex items-center text-sm">
        <Clock className="w-4 h-4 mr-1 text-gray-400" />
        <span className={`${timeRemaining < showWarningAt ? 'text-orange-600' : 'text-gray-600'}`}>
          {formattedTimeRemaining}
        </span>
      </div>

      {/* Session expiry warning modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Expiring Soon</h3>
            <p className="text-gray-600 mb-6">
              Your session will expire in {formattedTimeRemaining}. Would you like to stay logged in?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  endSession();
                  onLogout();
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout Now
              </button>
              <button
                onClick={() => {
                  renewSession();
                  setShowWarning(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}