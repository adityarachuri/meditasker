import React from 'react';
import { User } from '../../types';
import { useApp } from '../../context/AppContext';
import { Mail, Calendar, CheckSquare, Clock } from 'lucide-react';

interface TeamMemberCardProps {
  user: User;
}

export function TeamMemberCard({ user }: TeamMemberCardProps) {
  const { state } = useApp();
  
  const userTasks = state.tasks.filter(task => task.assigneeId === user.id);
  const completedTasks = userTasks.filter(task => task.status === 'completed');
  const activeTasks = userTasks.filter(task => task.status !== 'completed');
  
  const userProjects = state.projects.filter(project => 
    project.teamIds.includes(user.id) || project.managerId === user.id
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'developer':
        return 'bg-green-100 text-green-800';
      case 'designer':
        return 'bg-pink-100 text-pink-800';
      case 'qa':
        return 'bg-orange-100 text-orange-800'; 
      case 'researcher':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center mb-4">
        <img
          src={user.avatar}
          alt={user.name}
          className="w-16 h-16 rounded-full mr-4"
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(user.role)}`}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </span>
          </div>
          <p className="text-sm text-gray-600">{user.department}</p>
          <div className={`inline-flex items-center mt-1 ${
            user.isActive ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              user.isActive ? 'bg-green-400' : 'bg-gray-300'
            }`} />
            <span className="text-xs">{user.isActive ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="w-4 h-4 mr-2" />
          <span>{user.email}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2" />
          <span>Joined {new Date(user.joinDate).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <CheckSquare className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-lg font-semibold text-gray-900">{completedTasks.length}</span>
            </div>
            <p className="text-xs text-gray-500">Completed Tasks</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="w-4 h-4 text-blue-500 mr-1" />
              <span className="text-lg font-semibold text-gray-900">{activeTasks.length}</span>
            </div>
            <p className="text-xs text-gray-500">Active Tasks</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Current Projects</h4>
        <div className="space-y-1">
          {userProjects.slice(0, 3).map((project) => (
            <div key={project.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 truncate">{project.name}</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                project.status === 'active' ? 'bg-green-100 text-green-800' :
                project.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {project.status}
              </span>
            </div>
          ))}
          {userProjects.length > 3 && (
            <p className="text-xs text-gray-500">+{userProjects.length - 3} more</p>
          )}
          {userProjects.length === 0 && (
            <p className="text-xs text-gray-500">No active projects</p>
          )}
        </div>
      </div>
    </div>
  );
}