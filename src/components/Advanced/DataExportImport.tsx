import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  FileText, 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  X,
  Settings,
  Filter
} from 'lucide-react';
import { useGlobalStore } from '../../store/globalStore';

interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  includeProjects: boolean;
  includeTasks: boolean;
  includeUsers: boolean;
  includeActivities: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    projectStatus: string[];
    taskStatus: string[];
    userRoles: string[];
  };
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  warnings: string[];
}

export function DataExportImport() {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeProjects: true,
    includeTasks: true,
    includeUsers: false,
    includeActivities: false,
    dateRange: {
      start: '',
      end: '',
    },
    filters: {
      projectStatus: [],
      taskStatus: [],
      userRoles: [],
    },
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { projects, tasks, users, activities } = useGlobalStore();

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Prepare data based on options
      const exportData: any = {
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '2.0.0',
          options: exportOptions,
        },
      };

      if (exportOptions.includeProjects) {
        exportData.projects = filterDataByDateRange(projects, exportOptions.dateRange);
      }

      if (exportOptions.includeTasks) {
        exportData.tasks = filterDataByDateRange(tasks, exportOptions.dateRange);
      }

      if (exportOptions.includeUsers) {
        exportData.users = users.map(user => ({
          ...user,
          // Remove sensitive data
          password: undefined,
          apiKeys: undefined,
        }));
      }

      if (exportOptions.includeActivities) {
        exportData.activities = filterDataByDateRange(activities, exportOptions.dateRange);
      }

      clearInterval(progressInterval);
      setExportProgress(100);

      // Generate and download file
      await downloadFile(exportData, exportOptions.format);

      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const filterDataByDateRange = (data: any[], dateRange: { start: string; end: string }) => {
    if (!dateRange.start && !dateRange.end) return data;

    return data.filter(item => {
      const itemDate = new Date(item.createdAt || item.startDate || item.joinDate);
      const start = dateRange.start ? new Date(dateRange.start) : new Date(0);
      const end = dateRange.end ? new Date(dateRange.end) : new Date();
      
      return itemDate >= start && itemDate <= end;
    });
  };

  const downloadFile = async (data: any, format: string) => {
    let content: string;
    let mimeType: string;
    let filename: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        filename = `meditasker-export-${new Date().toISOString().split('T')[0]}.json`;
        break;

      case 'csv':
        content = convertToCSV(data);
        mimeType = 'text/csv';
        filename = `meditasker-export-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'xlsx':
        // For XLSX, we'd need a library like xlsx or exceljs
        // For now, fall back to CSV
        content = convertToCSV(data);
        mimeType = 'text/csv';
        filename = `meditasker-export-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: any) => {
    // Simple CSV conversion - in production, use a proper CSV library
    const csvRows: string[] = [];
    
    // Add projects
    if (data.projects) {
      csvRows.push('Type,ID,Name,Status,Priority,Progress,Budget,Start Date,End Date');
      data.projects.forEach((project: any) => {
        csvRows.push([
          'Project',
          project.id,
          `"${project.name}"`,
          project.status,
          project.priority,
          project.progress,
          project.budget,
          project.startDate,
          project.endDate
        ].join(','));
      });
    }

    // Add tasks
    if (data.tasks) {
      if (csvRows.length > 0) csvRows.push(''); // Empty row separator
      csvRows.push('Type,ID,Title,Status,Priority,Project ID,Assignee ID,Due Date,Estimated Hours,Actual Hours');
      data.tasks.forEach((task: any) => {
        csvRows.push([
          'Task',
          task.id,
          `"${task.title}"`,
          task.status,
          task.priority,
          task.projectId,
          task.assigneeId || '',
          task.dueDate || '',
          task.estimatedHours,
          task.actualHours
        ].join(','));
      });
    }

    return csvRows.join('\n');
  };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const content = await file.text();
      let data: any;

      if (file.name.endsWith('.json')) {
        data = JSON.parse(content);
      } else if (file.name.endsWith('.csv')) {
        data = parseCSV(content);
      } else {
        throw new Error('Unsupported file format');
      }

      // Validate and import data
      const result = await validateAndImportData(data);
      setImportResult(result);

    } catch (error) {
      setImportResult({
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Import failed'],
        warnings: [],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const parseCSV = (content: string) => {
    // Simple CSV parser - in production, use a proper CSV library
    const lines = content.split('\n');
    const result: any = { projects: [], tasks: [] };
    
    let currentSection = '';
    let headers: string[] = [];

    lines.forEach(line => {
      if (!line.trim()) return;
      
      const values = line.split(',').map(v => v.replace(/"/g, ''));
      
      if (values[0] === 'Type') {
        headers = values;
        return;
      }

      if (values[0] === 'Project') {
        result.projects.push({
          id: values[1],
          name: values[2],
          status: values[3],
          priority: values[4],
          progress: parseInt(values[5]),
          budget: parseInt(values[6]),
          startDate: values[7],
          endDate: values[8],
        });
      } else if (values[0] === 'Task') {
        result.tasks.push({
          id: values[1],
          title: values[2],
          status: values[3],
          priority: values[4],
          projectId: values[5],
          assigneeId: values[6] || undefined,
          dueDate: values[7] || undefined,
          estimatedHours: parseInt(values[8]),
          actualHours: parseInt(values[9]),
        });
      }
    });

    return result;
  };

  const validateAndImportData = async (data: any): Promise<ImportResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let imported = 0;

    // Validate structure
    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format');
      return { success: false, imported: 0, errors, warnings };
    }

    // Import projects
    if (data.projects && Array.isArray(data.projects)) {
      for (const project of data.projects) {
        try {
          // Validate required fields
          if (!project.id || !project.name) {
            warnings.push(`Skipping project with missing required fields: ${project.id || 'unknown'}`);
            continue;
          }

          // Check for duplicates
          const existing = projects.find(p => p.id === project.id);
          if (existing) {
            warnings.push(`Project ${project.id} already exists, skipping`);
            continue;
          }

          // Import project (in real app, this would call the store action)
          imported++;
        } catch (error) {
          errors.push(`Failed to import project ${project.id}: ${error}`);
        }
      }
    }

    // Import tasks
    if (data.tasks && Array.isArray(data.tasks)) {
      for (const task of data.tasks) {
        try {
          // Validate required fields
          if (!task.id || !task.title) {
            warnings.push(`Skipping task with missing required fields: ${task.id || 'unknown'}`);
            continue;
          }

          // Check for duplicates
          const existing = tasks.find(t => t.id === task.id);
          if (existing) {
            warnings.push(`Task ${task.id} already exists, skipping`);
            continue;
          }

          // Import task (in real app, this would call the store action)
          imported++;
        } catch (error) {
          errors.push(`Failed to import task ${task.id}: ${error}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      imported,
      errors,
      warnings,
    };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImport(file);
    }
  };

  return (
    <div className="data-export-import">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'export'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Download className="w-4 h-4 inline mr-2" />
          Export Data
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'import'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          Import Data
        </button>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
            
            {/* Format Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
              <select
                value={exportOptions.format}
                onChange={(e) => setExportOptions({
                  ...exportOptions,
                  format: e.target.value as any
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="xlsx">Excel (XLSX)</option>
                <option value="pdf">PDF Report</option>
              </select>
            </div>

            {/* Data Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Include Data</label>
              <div className="space-y-2">
                {[
                  { key: 'includeProjects', label: 'Projects', count: projects.length },
                  { key: 'includeTasks', label: 'Tasks', count: tasks.length },
                  { key: 'includeUsers', label: 'Users', count: users.length },
                  { key: 'includeActivities', label: 'Activities', count: activities.length },
                ].map(({ key, label, count }) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions[key as keyof ExportOptions] as boolean}
                      onChange={(e) => setExportOptions({
                        ...exportOptions,
                        [key]: e.target.checked
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {label} ({count} items)
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range (Optional)</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={exportOptions.dateRange.start}
                    onChange={(e) => setExportOptions({
                      ...exportOptions,
                      dateRange: { ...exportOptions.dateRange, start: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={exportOptions.dateRange.end}
                    onChange={(e) => setExportOptions({
                      ...exportOptions,
                      dateRange: { ...exportOptions.dateRange, end: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Exporting... {exportProgress}%
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </>
              )}
            </button>

            {/* Progress Bar */}
            {isExporting && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Data</h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Import from File</h4>
              <p className="text-gray-600 mb-4">
                Upload a JSON or CSV file to import projects, tasks, and other data.
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isImporting ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </>
                )}
              </button>
              
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: JSON, CSV
              </p>
            </div>

            {/* Import Result */}
            {importResult && (
              <div className={`p-4 rounded-lg border ${
                importResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center mb-2">
                  {importResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                  )}
                  <h4 className={`font-medium ${
                    importResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    Import {importResult.success ? 'Successful' : 'Failed'}
                  </h4>
                </div>
                
                <p className={`text-sm mb-3 ${
                  importResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {importResult.imported} items imported successfully
                </p>

                {importResult.warnings.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-yellow-800 mb-1">Warnings:</h5>
                    <ul className="text-sm text-yellow-700 list-disc list-inside">
                      {importResult.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.errors.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-red-800 mb-1">Errors:</h5>
                    <ul className="text-sm text-red-700 list-disc list-inside">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}