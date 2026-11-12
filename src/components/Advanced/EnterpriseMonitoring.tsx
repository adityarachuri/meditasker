import { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Server,
  HardDrive
} from 'lucide-react';
import { databaseService } from '../../services/databaseService';

interface PerformanceMetrics {
  memoryUsage: number;
  cacheHitRate: number;
  averageQueryTime: number;
  indexHealth: boolean;
  totalRecords: number;
  activeConnections: number;
}

type QueryPerformanceBreakdown = Record<string, { avg: number; min: number; max: number; count: number }>;

export function EnterpriseMonitoring() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [performanceData, setPerformanceData] = useState<QueryPerformanceBreakdown>({});
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateMetrics = () => {
      const health = databaseService.getHealthStatus();
      const memory = databaseService.getMemoryUsage();
      const performance = databaseService.getPerformanceMetrics();
      
      setHealthStatus(health.status);
      setMetrics({
        memoryUsage: health.metrics.memoryUsage,
        cacheHitRate: health.metrics.cacheHitRate,
        averageQueryTime: health.metrics.averageQueryTime,
        indexHealth: health.metrics.indexHealth,
        totalRecords: memory.users + memory.projects + memory.tasks,
        activeConnections: memory.cacheEntries
      });
      setPerformanceData(performance);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      /* istanbul ignore next -- status always comes from databaseService.getHealthStatus(), whose return type only allows the three cases above */
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      /* istanbul ignore next -- status always comes from databaseService.getHealthStatus(), whose return type only allows the three cases above */
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  /* istanbul ignore next -- updateMetrics() runs synchronously in the mount
     effect, so by the time a test's render() returns, metrics is already
     populated; this transient pre-effect frame isn't observable from a test. */
  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="animate-pulse flex items-center">
          <div className="w-4 h-4 bg-gray-300 rounded mr-2"></div>
          <div className="h-4 bg-gray-300 rounded w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Compact Status Bar */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getStatusColor(healthStatus)}`}>
            {getStatusIcon(healthStatus)}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">Enterprise Monitoring</h3>
            <p className="text-xs text-gray-500">
              {metrics.totalRecords.toLocaleString()} records • {metrics.cacheHitRate.toFixed(1)}% cache hit
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {metrics.averageQueryTime.toFixed(1)}ms
            </div>
            <div className="text-xs text-gray-500">Avg Query</div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(healthStatus)}`}>
            {healthStatus.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Expanded Metrics */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Memory Usage */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <HardDrive className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-gray-500">Memory</span>
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {metrics.memoryUsage.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">Records in Memory</div>
            </div>

            {/* Cache Performance */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-5 h-5 text-green-600" />
                <span className="text-xs text-gray-500">Cache</span>
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {metrics.cacheHitRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">Hit Rate</div>
            </div>

            {/* Query Performance */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="text-xs text-gray-500">Performance</span>
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {metrics.averageQueryTime.toFixed(1)}ms
              </div>
              <div className="text-xs text-gray-600">Avg Query Time</div>
            </div>

            {/* System Health */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Server className="w-5 h-5 text-orange-600" />
                <span className="text-xs text-gray-500">Health</span>
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {metrics.indexHealth ? 'Optimal' : 'Degraded'}
              </div>
              <div className="text-xs text-gray-600">Index Status</div>
            </div>
          </div>

          {/* Detailed Performance Metrics */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Performance Breakdown</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(performanceData).map(([metric, data]) => (
                <div key={metric} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700 capitalize">
                      {metric.replace(/_/g, ' ')}
                    </span>
                    <BarChart3 className="w-4 h-4 text-gray-400" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Avg:</span>
                      <span className="font-medium">{data.avg?.toFixed(2)}ms</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Min:</span>
                      <span className="font-medium">{data.min?.toFixed(2)}ms</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Max:</span>
                      <span className="font-medium">{data.max?.toFixed(2)}ms</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Count:</span>
                      <span className="font-medium">{data.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Recommendations */}
          {healthStatus !== 'healthy' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                <div>
                  <h5 className="text-sm font-medium text-yellow-800">Performance Recommendations</h5>
                  <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                    {metrics.cacheHitRate < 50 && (
                      <li>• Consider increasing cache size or adjusting cache TTL</li>
                    )}
                    {metrics.averageQueryTime > 100 && (
                      <li>• Query performance is degraded - consider optimizing filters</li>
                    )}
                    {!metrics.indexHealth && (
                      <li>• Index health is compromised - database reinitialization may be needed</li>
                    )}
                    {metrics.totalRecords > 900000 && (
                      <li>• Large dataset detected - consider implementing data archiving</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}