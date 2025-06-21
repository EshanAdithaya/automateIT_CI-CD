'use client';

interface StatsOverviewProps {
  repositories: any[];
}

export function StatsOverview({ repositories }: StatsOverviewProps) {
  const stats = {
    total: repositories.length,
    monitoring: repositories.filter(r => r.isMonitoring).length,
    withDocker: repositories.filter(r => r.hasDockerfile).length,
    withTests: repositories.filter(r => r.projectType?.hasTests).length,
  };

  const projectTypes = repositories.reduce((acc, repo) => {
    if (repo.projectType) {
      acc[repo.projectType.type] = (acc[repo.projectType.type] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const languages = repositories.reduce((acc, repo) => {
    if (repo.projectType) {
      acc[repo.projectType.language] = (acc[repo.projectType.language] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Repositories</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Actively Monitored</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.monitoring}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13.5 3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM12 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-3.5-4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm11.5-4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM19 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">With Docker</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.withDocker}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">With Tests</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.withTests}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {Object.keys(projectTypes).length > 0 && (
        <div className="bg-white overflow-hidden shadow rounded-lg md:col-span-2 lg:col-span-2">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Project Types</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(projectTypes).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">{type}</span>
                  <span className="text-sm font-medium text-gray-900">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {Object.keys(languages).length > 0 && (
        <div className="bg-white overflow-hidden shadow rounded-lg md:col-span-2 lg:col-span-2">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Languages</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(languages).map(([language, count]) => (
                <div key={language} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">{language}</span>
                  <span className="text-sm font-medium text-gray-900">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}