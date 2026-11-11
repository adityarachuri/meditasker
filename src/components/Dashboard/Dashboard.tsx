import { useApp } from '../../context/AppContext';
import { MetricCard } from './MetricCard';
import { ProjectProgress } from './ProjectProgress';
import { TaskOverview } from './TaskOverview';
import { RecentActivity } from './RecentActivity';
import {
  FolderOpen,
  CheckSquare,
  Users,
  TrendingUp
} from 'lucide-react';
import { mockDashboardMetrics } from '../../data/mockData';

export function Dashboard() {
  const { state } = useApp();
  const metrics = mockDashboardMetrics;

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Projects"
          value={metrics.totalProjects}
          icon={FolderOpen}
          color="bg-blue-500"
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="Active Projects"
          value={metrics.activeProjects}
          icon={TrendingUp}
          color="bg-green-500"
          trend={{ value: 8, isPositive: true }}
        />
        <MetricCard
          title="Team Members"
          value={metrics.teamMembers}
          icon={Users}
          color="bg-purple-500"
        />
        <MetricCard
          title="Completed Tasks"
          value={metrics.completedTasks}
          icon={CheckSquare}
          color="bg-orange-500"
          trend={{ value: 15, isPositive: true }}
        />
      </div>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Budget</span>
              <span className="text-lg font-semibold text-gray-900">
                ${metrics.totalBudget.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Spent</span>
              <span className="text-lg font-semibold text-blue-600">
                ${metrics.spentBudget.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(metrics.spentBudget / metrics.totalBudget) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {((metrics.spentBudget / metrics.totalBudget) * 100).toFixed(1)}% utilized
              </span>
              <span className="text-gray-600">
                ${(metrics.totalBudget - metrics.spentBudget).toLocaleString()} remaining
              </span>
            </div>
          </div>
        </div>
        <TaskOverview />
      </div>

      {/* Projects and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectProgress />
        <RecentActivity />
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Deadlines</h3>
        <div className="space-y-3">
          {state.tasks
            .filter(task => task.dueDate && task.status !== 'completed')
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
            .slice(0, 5)
            .map((task) => {
              const project = state.projects.find(p => p.id === task.projectId);
              const assignee = state.users.find(u => u.id === task.assigneeId);
              const daysUntilDue = Math.ceil((new Date(task.dueDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              
              return (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                    <p className="text-xs text-gray-500">
                      {project?.name} • {assignee?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      daysUntilDue < 0 ? 'text-red-600' :
                      daysUntilDue <= 2 ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      {daysUntilDue < 0 ? 'Overdue' :
                       daysUntilDue === 0 ? 'Due today' :
                       daysUntilDue === 1 ? 'Due tomorrow' :
                       `${daysUntilDue} days`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(task.dueDate!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      
    </div>
  );
}