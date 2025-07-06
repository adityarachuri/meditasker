import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TeamMemberCard } from './TeamMemberCard';
import { User } from '../../types';

export function TeamList() {
  const { state } = useApp();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = state.users.filter(user => {
    const matchesFilter = filter === 'all' || user.role === filter;
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'developer', label: 'Developer' },
    { value: 'designer', label: 'Designer' },
    { value: 'qa', label: 'QA' }, 
    { value: 'researcher', label: 'Researcher' },
  ];

  const getTeamStats = () => {
    const totalMembers = state.users.length;
    const activeMembers = state.users.filter(u => u.isActive).length;
    const departments = [...new Set(state.users.map(u => u.department))];
    
    return {
      totalMembers,
      activeMembers,
      departments: departments.length,
    };
  };

  const stats = getTeamStats();

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Members</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalMembers} <span className="text-sm text-green-600">+20</span></p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Active Members</h3>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.activeMembers}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Departments</h3>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.departments}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredUsers.length} member{filteredUsers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <TeamMemberCard key={user.id} user={user} />
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No team members found matching your criteria.</p>
        </div>
      )}
      
    </div>
  );
}