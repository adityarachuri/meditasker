import React, { useState, useEffect } from 'react';
import { mockDataGenerator } from '../../data/mockDataGenerator';
import { databaseService } from '../../services/databaseService';
import { RefreshCw, Database, Users, FolderOpen, CheckSquare } from 'lucide-react';

interface DataInitializerProps {
  onInitialized: () => void;
}

export function DataInitializer({ onInitialized }: DataInitializerProps) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState({ users: 0, projects: 0, tasks: 0 });
  const [currentStep, setCurrentStep] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check if data is already loaded
    const stats = databaseService.getStats();
    if (stats.totalUsers > 0) {
      setIsInitialized(true);
    }
  }, []);

  const initializeData = async () => {
    setIsInitializing(true);
    setProgress({ users: 0, projects: 0, tasks: 0 });

    try {
      // Generate and load users (100,000)
      setCurrentStep('Generating users...');
      const users = mockDataGenerator.generateUsers(100000);
      setProgress(prev => ({ ...prev, users: 50 }));

      setCurrentStep('Indexing users...');
      await databaseService.loadUsers(users);
      setProgress(prev => ({ ...prev, users: 100 }));

      // Generate and load projects (10,000)
      setCurrentStep('Generating projects...');
      const projects = mockDataGenerator.generateProjects(10000);
      setProgress(prev => ({ ...prev, projects: 50 }));

      setCurrentStep('Indexing projects...');
      await databaseService.loadProjects(projects);
      setProgress(prev => ({ ...prev, projects: 100 }));

      // Generate and load tasks (890,000)
      setCurrentStep('Generating tasks...');
      const tasks = mockDataGenerator.generateTasks(890000);
      setProgress(prev => ({ ...prev, tasks: 50 }));

      setCurrentStep('Indexing tasks...');
      await databaseService.loadTasks(tasks);
      setProgress(prev => ({ ...prev, tasks: 100 }));

      setCurrentStep('Initialization complete!');
      setIsInitialized(true);
      
      // Clean up generator cache to free memory
      mockDataGenerator.clearCache();
      
      setTimeout(() => {
        onInitialized();
      }, 1000);

    } catch (error) {
      console.error('Failed to initialize data:', error);
      setCurrentStep('Initialization failed');
    } finally {
      setIsInitializing(false);
    }
  };

  const stats = databaseService.getStats();

  if (isInitialized && stats.totalUsers > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-green-600 mb-4">
            <Database className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Database Ready</h2>
          <p className="text-gray-600 mb-6">
            Successfully loaded 1 million records with enterprise-grade indexing and performance optimizations.
          </p>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <Users className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Users</div>
            </div>
            <div className="text-center">
              <FolderOpen className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalProjects.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Projects</div>
            </div>
            <div className="text-center">
              <CheckSquare className="w-8 h-8 mx-auto text-purple-600 mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalTasks.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Tasks</div>
            </div>
          </div>

          <button
            onClick={onInitialized}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue to Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <Database className="w-16 h-16 mx-auto text-blue-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Scale to 1 Million Records
          </h2>
          <p className="text-gray-600">
            Initialize the database with 1 million records including users, projects, and tasks with enterprise-grade indexing, caching, and performance optimizations.
          </p>
        </div>

        {!isInitializing ? (
          <button
            onClick={initializeData}
            className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Initialize Database
          </button>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 mb-2">{currentStep}</div>
            </div>

            {/* Progress bars */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Users (100,000)</span>
                  <span>{progress.users}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.users}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Projects (10,000)</span>
                  <span>{progress.projects}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.projects}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Tasks (890,000)</span>
                  <span>{progress.tasks}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.tasks}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>This process may take a few moments to complete.</p>
          <p>Data will be optimized with indexes for fast queries.</p>
        </div>
      </div>
    </div>
  );
}