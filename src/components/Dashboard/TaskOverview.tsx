import { useApp } from '../../context/AppContext';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

export function TaskOverview() {
  const { state } = useApp();
  
  const taskCounts = {
    todo: state.tasks.filter(t => t.status === 'todo').length,
    inProgress: state.tasks.filter(t => t.status === 'in-progress').length,
    review: state.tasks.filter(t => t.status === 'review').length,
    completed: state.tasks.filter(t => t.status === 'completed').length,
    blocked: state.tasks.filter(t => t.status === 'blocked').length,
  };

  const statusConfig = [
    { key: 'todo', label: 'To Do', icon: Clock, color: 'bg-gray-100 text-gray-800' },
    { key: 'inProgress', label: 'In Progress', icon: Clock, color: 'bg-blue-100 text-blue-800' },
    { key: 'review', label: 'Review', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800' },
    { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    { key: 'blocked', label: 'Blocked', icon: XCircle, color: 'bg-red-100 text-red-800' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statusConfig.map((status) => {
          const Icon = status.icon;
          const count = taskCounts[status.key as keyof typeof taskCounts];
          return (
            <div key={status.key} className="text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-2 ${status.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-600">{status.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}