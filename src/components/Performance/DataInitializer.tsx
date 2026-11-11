import React, { useState, useEffect } from 'react';
import { Loader2, Database, Users, FolderOpen, CheckSquare } from 'lucide-react';
import { databaseService } from '../../services/databaseService';
import { mockDataGenerator } from '../../data/mockDataGenerator';

interface DataInitializerProps {
  onInitialized: () => void;
}

interface InitializationStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  completed: boolean;
  loading: boolean;
}

export function DataInitializer({ onInitialized }: DataInitializerProps) {
  const [steps, setSteps] = useState<InitializationStep[]>([
    {
      id: 'database',
      label: 'Initializing database connection',
      icon: <Database className="w-5 h-5" />,
      completed: false,
      loading: false,
    },
    {
      id: 'users',
      label: 'Loading user data',
      icon: <Users className="w-5 h-5" />,
      completed: false,
      loading: false,
    },
    {
      id: 'projects',
      label: 'Loading projects',
      icon: <FolderOpen className="w-5 h-5" />,
      completed: false,
      loading: false,
    },
    {
      id: 'tasks',
      label: 'Loading tasks',
      icon: <CheckSquare className="w-5 h-5" />,
      completed: false,
      loading: false,
    },
  ]);

  const [, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    initializeData();
    // Run exactly once on mount; initializeData reads only stable setters/singletons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStep = (stepId: string, updates: Partial<InitializationStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const initializeData = async () => {
    try {
      // Step 1: Initialize database connection
      updateStep('database', { loading: true });
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate connection time
      updateStep('database', { loading: false, completed: true });
      setProgress(25);
      setCurrentStepIndex(1);

      // Step 2: Load user data
      updateStep('users', { loading: true });
      await new Promise(resolve => setTimeout(resolve, 600));
      const userData = mockDataGenerator.generateUsers(50);
      await databaseService.loadUsers(userData);
      updateStep('users', { loading: false, completed: true });
      setProgress(50);
      setCurrentStepIndex(2);

      // Step 3: Load projects
      updateStep('projects', { loading: true });
      await new Promise(resolve => setTimeout(resolve, 700));
      const projectData = mockDataGenerator.generateProjects(25);
      await databaseService.loadProjects(projectData);
      updateStep('projects', { loading: false, completed: true });
      setProgress(75);
      setCurrentStepIndex(3);

      // Step 4: Load tasks
      updateStep('tasks', { loading: true });
      await new Promise(resolve => setTimeout(resolve, 900));
      const taskData = mockDataGenerator.generateTasks(100);
      await databaseService.loadTasks(taskData);
      updateStep('tasks', { loading: false, completed: true });
      setProgress(100);

      // Complete initialization
      await new Promise(resolve => setTimeout(resolve, 500));
      onInitialized();

    } catch (error) {
      console.error('Data initialization failed:', error);
      // Handle error state
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Initializing Application
          </h1>
          <p className="text-gray-600">
            Setting up your workspace with sample data
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Initialization Steps */}
        <div className="space-y-4">
          {steps.map((step) => (
            <div 
              key={step.id}
              className={`flex items-center p-3 rounded-lg transition-all duration-300 ${
                step.completed 
                  ? 'bg-green-50 border border-green-200' 
                  : step.loading 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className={`flex-shrink-0 mr-3 ${
                step.completed 
                  ? 'text-green-600' 
                  : step.loading 
                    ? 'text-blue-600' 
                    : 'text-gray-400'
              }`}>
                {step.loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : step.completed ? (
                  <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
                  step.icon
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${
                  step.completed 
                    ? 'text-green-800' 
                    : step.loading 
                      ? 'text-blue-800' 
                      : 'text-gray-600'
                }`}>
                  {step.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Loading Animation */}
        <div className="mt-8 text-center">
          <div className="flex justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            This may take a few moments...
          </p>
        </div>
      </div>
    </div>
  );
}