import React from 'react';
import { useApp } from '../../context/AppContext';

export function ProjectProgress() {
  const { state } = useApp();
  const activeProjects = state.projects.filter(p => p.status === 'active');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Projects</h3>
      <div className="space-y-4">
        {activeProjects.map((project) => (
          <div key={project.id} className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">{project.name}</h4>
              <div className="mt-1 flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="ml-2 text-sm text-gray-600">{project.progress}%</span>
              </div>
            </div>
            <div className="ml-4 flex items-center">
              <span className={`px-2 py-1 text-xs rounded-full ${
                project.priority === 'high' ? 'bg-red-100 text-red-800' :
                project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {project.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}