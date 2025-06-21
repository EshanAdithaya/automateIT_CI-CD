'use client';

import { useState } from 'react';
import { RepositoryCard } from './RepositoryCard';
import { StatsOverview } from './StatsOverview';

interface DashboardProps {
  repositories: any[];
  onRefresh: () => void;
}

export function Dashboard({ repositories, onRefresh }: DashboardProps) {
  const [filter, setFilter] = useState<'all' | 'monitoring' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'type'>('updated');

  const filteredRepositories = repositories.filter(repo => {
    switch (filter) {
      case 'monitoring':
        return repo.isMonitoring;
      case 'inactive':
        return !repo.isMonitoring;
      default:
        return true;
    }
  });

  const sortedRepositories = [...filteredRepositories].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.repository.name.localeCompare(b.repository.name);
      case 'type':
        return (a.projectType?.type || '').localeCompare(b.projectType?.type || '');
      case 'updated':
      default:
        return new Date(b.lastScanned).getTime() - new Date(a.lastScanned).getTime();
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Repository Dashboard</h2>
        <button
          onClick={onRefresh}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <StatsOverview repositories={repositories} />

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex space-x-4">
              <div>
                <label htmlFor="filter" className="block text-sm font-medium text-gray-700">
                  Filter
                </label>
                <select
                  id="filter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Repositories</option>
                  <option value="monitoring">Actively Monitored</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label htmlFor="sort" className="block text-sm font-medium text-gray-700">
                  Sort by
                </label>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="updated">Last Updated</option>
                  <option value="name">Name</option>
                  <option value="type">Project Type</option>
                </select>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Showing {sortedRepositories.length} of {repositories.length} repositories
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {sortedRepositories.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-3-3-3 3M8 11h8" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No repositories</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'all' 
                  ? 'Get started by adding a repository.'
                  : `No ${filter} repositories found.`
                }
              </p>
            </div>
          ) : (
            sortedRepositories.map((repo) => (
              <RepositoryCard key={repo.repository.id} repository={repo} onRefresh={onRefresh} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}