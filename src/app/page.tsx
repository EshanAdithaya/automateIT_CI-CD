'use client';

import { useState, useEffect } from 'react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { AddRepositoryForm } from '@/components/forms/AddRepositoryForm';
import { SystemStatus } from '@/components/dashboard/SystemStatus';
import { QuickStart } from '@/components/dashboard/QuickStart';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'add-repo' | 'status'>('dashboard');
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuickStart, setShowQuickStart] = useState(false);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      const response = await fetch('/api/repositories');
      const data = await response.json();
      setRepositories(data.repositories || []);
      
      // Show quick start for new users
      if (data.repositories?.length === 0) {
        setShowQuickStart(true);
      }
    } catch (error) {
      console.error('Error fetching repositories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRepositoryAdded = () => {
    fetchRepositories();
    setActiveTab('dashboard');
    setShowQuickStart(false);
  };

  const handleGetStarted = () => {
    setActiveTab('add-repo');
    setShowQuickStart(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </div>
          <p className="mt-4 text-gray-700 font-medium">Initializing CI/CD Autopilot...</p>
          <p className="mt-1 text-sm text-gray-500">Setting up your intelligent CI/CD environment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">CI/CD Autopilot</h1>
                  <p className="text-xs text-gray-500">Intelligent CI/CD Made Simple</p>
                </div>
              </div>
              <span className="px-2 py-1 text-xs font-medium bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full border border-green-200">
                ✨ Auto-Magic
              </span>
            </div>
            
            {/* Quick Stats */}
            <div className="hidden md:flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-600">{repositories.length} repositories</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-600">{repositories.filter((r: any) => r.isMonitoring).length} monitoring</span>
              </div>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="border-t border-gray-100">
            <nav className="flex space-x-1 py-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                </svg>
                <span>Dashboard</span>
                {repositories.length > 0 && (
                  <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-xs font-medium">
                    {repositories.length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('add-repo')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'add-repo'
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <span>Add Repository</span>
              </button>
              
              <button
                onClick={() => setActiveTab('status')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'status'
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>System Status</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {showQuickStart && repositories.length === 0 ? (
          <QuickStart onGetStarted={handleGetStarted} />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard repositories={repositories} onRefresh={fetchRepositories} />
            )}
            {activeTab === 'add-repo' && (
              <AddRepositoryForm onRepositoryAdded={handleRepositoryAdded} />
            )}
            {activeTab === 'status' && <SystemStatus />}
          </>
        )}
      </main>
    </div>
  );
}
