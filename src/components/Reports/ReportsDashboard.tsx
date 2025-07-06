import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { Download, Calendar, TrendingUp, Users, CheckSquare } from 'lucide-react';

export function ReportsDashboard() {
  const { state } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Task completion data
  const taskCompletionData = [
    { name: 'Jan', completed: 12, total: 18 },
    { name: 'Feb', completed: 15, total: 20 },
    { name: 'Mar', completed: 18, total: 22 },
    { name: 'Apr', completed: 14, total: 19 },
    { name: 'May', completed: 20, total: 25 },
    { name: 'Jun', completed: 16, total: 21 },
  ];

  // Project status distribution
  const projectStatusData = [
    { name: 'Active', value: state.projects.filter(p => p.status === 'active').length, color: '#10b981' },
    { name: 'Planning', value: state.projects.filter(p => p.status === 'planning').length, color: '#3b82f6' },
    { name: 'Completed', value: state.projects.filter(p => p.status === 'completed').length, color: '#6b7280' },
    { name: 'On Hold', value: state.projects.filter(p => p.status === 'on-hold').length, color: '#f59e0b' },
  ];

  // Team productivity data
  const teamProductivityData = state.users.map(user => {
    const userTasks = state.tasks.filter(task => task.assigneeId === user.id);
    const completedTasks = userTasks.filter(task => task.status === 'completed');
    return {
      name: user.name.split(' ')[0],
      completed: completedTasks.length,
      total: userTasks.length,
      efficiency: userTasks.length > 0 ? Math.round((completedTasks.length / userTasks.length) * 100) : 0,
    };
  });

  // Budget utilization data
  const budgetData = state.projects.map(project => ({
    name: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
    budget: project.budget,
    spent: project.spentBudget,
    utilization: Math.round((project.spentBudget / project.budget) * 100),
  }));

  const exportReport = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString();
    const reportTitle = `Softique Health Insure Project Management Report`;
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235); // Blue color
    doc.text(reportTitle, 20, 25);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated on: ${currentDate}`, 20, 35);
    doc.text(`Report Period: ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`, 20, 42);
    
    // Summary Section
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text('Executive Summary', 20, 60);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const summaryData = [
      ['Total Projects', state.projects.length.toString()],
      ['Active Projects', state.projects.filter(p => p.status === 'active').length.toString()],
      ['Total Tasks', state.tasks.length.toString()],
      ['Completed Tasks', state.tasks.filter(t => t.status === 'completed').length.toString()],
      ['Team Members', state.users.length.toString()],
      ['Project Completion Rate', `${Math.round((state.projects.filter(p => p.status === 'completed').length / state.projects.length) * 100)}%`],
      ['Task Completion Rate', `${Math.round((state.tasks.filter(t => t.status === 'completed').length / state.tasks.length) * 100)}%`],
      ['Budget Utilization', `${Math.round((state.projects.reduce((sum, p) => sum + p.spentBudget, 0) / state.projects.reduce((sum, p) => sum + p.budget, 0)) * 100)}%`]
    ];
    
    autoTable(doc, {
      startY: 70,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      styles: { fontSize: 10 },
      margin: { left: 20, right: 20 }
    });
    
    // Project Status Section
    let yPosition = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text('Project Status Overview', 20, yPosition);
    
    const projectData = state.projects.map(project => [
      project.name,
      project.status.charAt(0).toUpperCase() + project.status.slice(1),
      `${project.progress}%`,
      project.priority.charAt(0).toUpperCase() + project.priority.slice(1),
      `$${project.spentBudget.toLocaleString()} / $${project.budget.toLocaleString()}`
    ]);
    
    autoTable(doc, {
      startY: yPosition + 10,
      head: [['Project Name', 'Status', 'Progress', 'Priority', 'Budget']],
      body: projectData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 25 },
        4: { cellWidth: 40 }
      }
    });
    
    // Team Productivity Section
    yPosition = (doc as any).lastAutoTable.finalY + 20;
    
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }
    
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text('Team Productivity', 20, yPosition);
    
    const teamData = teamProductivityData.map(member => [
      member.name,
      member.completed.toString(),
      member.total.toString(),
      `${member.efficiency}%`
    ]);
    
    autoTable(doc, {
      startY: yPosition + 10,
      head: [['Team Member', 'Completed Tasks', 'Total Tasks', 'Efficiency']],
      body: teamData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      styles: { fontSize: 10 },
      margin: { left: 20, right: 20 }
    });
    
    // Task Status Section
    yPosition = (doc as any).lastAutoTable.finalY + 20;
    
    // Check if we need a new page
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 30;
    }
    
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text('Task Status Distribution', 20, yPosition);
    
    const taskStatusData = [
      ['To Do', state.tasks.filter(t => t.status === 'todo').length.toString()],
      ['In Progress', state.tasks.filter(t => t.status === 'in-progress').length.toString()],
      ['Review', state.tasks.filter(t => t.status === 'review').length.toString()],
      ['Completed', state.tasks.filter(t => t.status === 'completed').length.toString()],
      ['Blocked', state.tasks.filter(t => t.status === 'blocked').length.toString()]
    ];
    
    autoTable(doc, {
      startY: yPosition + 10,
      head: [['Status', 'Count']],
      body: taskStatusData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      styles: { fontSize: 10 },
      margin: { left: 20, right: 20 }
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
      doc.text('HealthInsure Project Management Suite', 20, doc.internal.pageSize.height - 10);
    }
    
    // Save the PDF
    doc.save(`softique-health-insure-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Project Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {Math.round((state.projects.filter(p => p.status === 'completed').length / state.projects.length) * 100)}%
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Task Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {Math.round((state.tasks.filter(t => t.status === 'completed').length / state.tasks.length) * 100)}%
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckSquare className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Team Utilization</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {Math.round((state.users.filter(u => u.isActive).length / state.users.length) * 100)}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Budget Utilization</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {Math.round((state.projects.reduce((sum, p) => sum + p.spentBudget, 0) / state.projects.reduce((sum, p) => sum + p.budget, 0)) * 100)}%
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Completion Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Completion Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={taskCompletionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Project Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={projectStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {projectStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Team Productivity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Productivity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamProductivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#10b981" />
              <Bar dataKey="total" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Utilization */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Utilization</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value, name) => [name === 'budget' || name === 'spent' ? `$${value.toLocaleString()}` : `${value}%`, name]} />
              <Legend />
              <Bar dataKey="budget" fill="#e5e7eb" />
              <Bar dataKey="spent" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Completed</th>
                  <th className="text-left py-2">Total</th>
                  <th className="text-left py-2">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {teamProductivityData
                  .sort((a, b) => b.efficiency - a.efficiency)
                  .slice(0, 5)
                  .map((member, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 font-medium text-gray-900">{member.name}</td>
                      <td className="py-2 text-gray-600">{member.completed}</td>
                      <td className="py-2 text-gray-600">{member.total}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          member.efficiency >= 80 ? 'bg-green-100 text-green-800' :
                          member.efficiency >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {member.efficiency}%
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Project Progress */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Progress</h3>
          <div className="space-y-3">
            {state.projects.map((project) => (
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
                <div className="ml-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    project.status === 'active' ? 'bg-green-100 text-green-800' :
                    project.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                    project.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {project.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}