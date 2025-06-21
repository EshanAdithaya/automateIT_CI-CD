'use client';

import { useState } from 'react';

interface AddRepositoryFormProps {
  onRepositoryAdded: () => void;
}

export function AddRepositoryForm({ onRepositoryAdded }: AddRepositoryFormProps) {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [autoSetup, setAutoSetup] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryUrl,
          autoSetup,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add repository');
      }

      setSuccess(data.message || 'Repository added successfully');
      setRepositoryUrl('');
      onRepositoryAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const isValidUrl = (url: string) => {
    const patterns = [
      /github\.com\/[^\/]+\/[^\/]+/,
      /gitlab\.com\/[^\/]+\/[^\/]+/,
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Repository</h2>
          <p className="mt-1 text-sm text-gray-600">
            Add a GitHub or GitLab repository to start automated CI/CD monitoring.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          <div>
            <label htmlFor="repository-url" className="block text-sm font-medium text-gray-700">
              Repository URL
            </label>
            <div className="mt-1">
              <input
                type="url"
                id="repository-url"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                placeholder="https://github.com/username/repository or https://gitlab.com/username/repository"
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {repositoryUrl && !isValidUrl(repositoryUrl) && (
              <p className="mt-1 text-sm text-red-600">
                Please enter a valid GitHub or GitLab repository URL
              </p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              Supported formats:
              <br />• https://github.com/username/repository
              <br />• https://gitlab.com/username/repository
            </p>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="auto-setup"
                type="checkbox"
                checked={autoSetup}
                onChange={(e) => setAutoSetup(e.target.checked)}
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="auto-setup" className="font-medium text-gray-700">
                Enable Auto-Setup
              </label>
              <p className="text-gray-500">
                Automatically analyze the project and generate Dockerfile, CI/CD pipelines, and other configurations.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-1 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Success</h3>
                  <div className="mt-1 text-sm text-green-700">{success}</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setRepositoryUrl('');
                setError('');
                setSuccess('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={isLoading || !repositoryUrl || !isValidUrl(repositoryUrl)}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding Repository...
                </>
              ) : (
                'Add Repository'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-4">What happens when you add a repository?</h3>
        <div className="space-y-3 text-sm text-blue-700">
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-medium">1</span>
            <div>
              <strong>Repository Clone:</strong> We clone the repository to analyze its structure and dependencies.
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-medium">2</span>
            <div>
              <strong>Project Analysis:</strong> We detect the project type, framework, dependencies, and existing configurations.
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-medium">3</span>
            <div>
              <strong>Auto-Configuration:</strong> If enabled, we generate Dockerfile, CI/CD pipelines, and other necessary files.
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-medium">4</span>
            <div>
              <strong>Monitoring Setup:</strong> We start monitoring the repository for changes and automatically trigger builds.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}