'use client';

import { useState, useEffect } from 'react';

interface SystemStatusData {
  status: string;
  stats: {
    totalRepositories: number;
    activelyMonitored: number;
    withDockerfiles: number;
    byProjectType: Record<string, number>;
    byLanguage: Record<string, number>;
  };
  system: {
    version: string;
    uptime: number;
    nodeVersion: string;
    environment: string;
    githubConfigured: boolean;
    gitlabConfigured: boolean;
    timestamp: string;
  };
  repositories: any[];
}

export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }
      
      setStatus(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-red-800 font-medium">Error loading system status</span>
        </div>
        <p className="text-red-700 mt-1">{error}</p>
        <button
          onClick={fetchStatus}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">System Status</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${status.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className={`text-sm font-medium ${status.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
            {status.status === 'healthy' ? 'Healthy' : 'Error'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">System Information</dt>
            <dd className="mt-1 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Version</span>
                <span className="text-sm font-medium text-gray-900">{status.system.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Environment</span>
                <span className="text-sm font-medium text-gray-900 capitalize">{status.system.environment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Node.js</span>
                <span className="text-sm font-medium text-gray-900">{status.system.nodeVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="text-sm font-medium text-gray-900">{formatUptime(status.system.uptime)}</span>
              </div>
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Provider Configuration</dt>
            <dd className="mt-1 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">GitHub</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  status.system.githubConfigured 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {status.system.githubConfigured ? 'Configured' : 'Not Configured'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">GitLab</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  status.system.gitlabConfigured 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {status.system.gitlabConfigured ? 'Configured' : 'Not Configured'}
                </span>
              </div>
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Repository Statistics</dt>
            <dd className="mt-1 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-sm font-medium text-gray-900">{status.stats.totalRepositories}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Monitored</span>
                <span className="text-sm font-medium text-gray-900">{status.stats.activelyMonitored}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">With Docker</span>
                <span className="text-sm font-medium text-gray-900">{status.stats.withDockerfiles}</span>
              </div>
            </dd>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.keys(status.stats.byProjectType).length > 0 && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Projects by Type</h3>
              <div className="space-y-3">
                {Object.entries(status.stats.byProjectType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-3 ${
                        type === 'frontend' ? 'bg-blue-100 text-blue-800' :
                        type === 'backend' ? 'bg-purple-100 text-purple-800' :
                        type === 'fullstack' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {type}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {Object.keys(status.stats.byLanguage).length > 0 && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Projects by Language</h3>
              <div className="space-y-3">
                {Object.entries(status.stats.byLanguage).map(([language, count]) => (
                  <div key={language} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-3 ${
                        language === 'javascript' ? 'bg-yellow-100 text-yellow-800' :
                        language === 'typescript' ? 'bg-blue-100 text-blue-800' :
                        language === 'python' ? 'bg-green-100 text-green-800' :
                        language === 'php' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {language}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {status.repositories.length > 0 && (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Repository Activity</h3>
            <div className="flow-root">
              <ul className="-mb-8">
                {status.repositories.slice(0, 5).map((repo, index) => (
                  <li key={repo.id}>
                    <div className="relative pb-8">
                      {index !== status.repositories.slice(0, 5).length - 1 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                            repo.isMonitoring ? 'bg-green-500' : 'bg-gray-400'
                          }`}>
                            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm3 2h6v4H7V4zm8 8v2h-3v-2h3zm-8 0h5v2H7v-2z" clipRule="evenodd" />
                            </svg>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium text-gray-900">{repo.name}</span>{' '}
                              {repo.isMonitoring ? 'is being monitored' : 'is inactive'}
                            </p>
                            <div className="mt-1 flex items-center space-x-2">
                              {repo.projectType && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  {repo.projectType}
                                </span>
                              )}
                              {repo.language && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {repo.language}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <time dateTime={repo.lastScanned}>
                              {new Date(repo.lastScanned).toLocaleDateString()}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(status.system.timestamp).toLocaleString()}
      </div>
    </div>
  );
}