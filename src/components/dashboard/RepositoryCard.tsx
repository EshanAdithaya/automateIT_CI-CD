'use client';

import { useState } from 'react';

interface RepositoryCardProps {
  repository: any;
  onRefresh: () => void;
}

export function RepositoryCard({ repository, onRefresh }: RepositoryCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleToggleMonitoring = async () => {
    try {
      const action = repository.isMonitoring ? 'stop_monitoring' : 'start_monitoring';
      const response = await fetch(`/api/repositories/${repository.repository.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error toggling monitoring:', error);
    }
  };

  const handleGenerateAssets = async (type: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: repository.repository.id,
          type,
          platform: 'github',
        }),
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error generating assets:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemove = async () => {
    if (confirm(`Are you sure you want to remove ${repository.repository.fullName}?`)) {
      try {
        const response = await fetch(`/api/repositories/${repository.repository.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          onRefresh();
        }
      } catch (error) {
        console.error('Error removing repository:', error);
      }
    }
  };

  const getStatusColor = () => {
    if (repository.isMonitoring) return 'text-green-600 bg-green-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case 'frontend': return 'text-blue-600 bg-blue-100';
      case 'backend': return 'text-purple-600 bg-purple-100';
      case 'fullstack': return 'text-indigo-600 bg-indigo-100';
      case 'mobile': return 'text-pink-600 bg-pink-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {repository.repository.provider === 'github' ? (
                <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51 1.22 3.78a.84.84 0 0 1-.3.92z"/>
                </svg>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {repository.repository.fullName}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
                  {repository.isMonitoring ? 'Monitoring' : 'Inactive'}
                </span>
                {repository.projectType && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProjectTypeColor(repository.projectType.type)}`}>
                    {repository.projectType.type}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-sm text-gray-500">
                  {repository.projectType?.language || 'Unknown'} • {repository.projectType?.framework || 'Unknown'}
                </span>
                <span className="text-sm text-gray-500">
                  Last scanned: {new Date(repository.lastScanned).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                {repository.hasDockerfile && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13.5 3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM12 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-3.5-4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm11.5-4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM19 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
                    </svg>
                    Docker
                  </span>
                )}
                {repository.projectType?.hasTests && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Tests
                  </span>
                )}
                {repository.projectType?.hasDatabase && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
                    </svg>
                    Database
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleMonitoring}
            className={`inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md ${
              repository.isMonitoring
                ? 'text-red-700 bg-red-100 hover:bg-red-200'
                : 'text-green-700 bg-green-100 hover:bg-green-200'
            }`}
          >
            {repository.isMonitoring ? 'Stop' : 'Start'}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Actions
              <svg className="ml-1 w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>

            {showActions && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1">
                  <button
                    onClick={() => handleGenerateAssets('dockerfile')}
                    disabled={isGenerating}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Generate Dockerfile
                  </button>
                  <button
                    onClick={() => handleGenerateAssets('pipeline')}
                    disabled={isGenerating}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Generate Pipeline
                  </button>
                  <button
                    onClick={() => handleGenerateAssets('all')}
                    disabled={isGenerating}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Generate All
                  </button>
                  <button
                    onClick={handleRemove}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Remove Repository
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}