import { NextResponse } from 'next/server';
import { RepositoryManager } from '@/lib/git/repository-manager';
import { ENV } from '@/lib/config';

const repositoryManager = new RepositoryManager();

export async function GET() {
  try {
    const repositories = repositoryManager.getAllRepositories();
    
    const stats = {
      totalRepositories: repositories.length,
      activelyMonitored: repositories.filter(r => r.isMonitoring).length,
      withDockerfiles: repositories.filter(r => r.hasDockerfile).length,
      byProjectType: repositories.reduce((acc, repo) => {
        if (repo.projectType) {
          const type = repo.projectType.type;
          acc[type] = (acc[type] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
      byLanguage: repositories.reduce((acc, repo) => {
        if (repo.projectType) {
          const lang = repo.projectType.language;
          acc[lang] = (acc[lang] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
    };

    const systemStatus = {
      version: '1.0.0',
      uptime: process.uptime(),
      nodeVersion: process.version,
      environment: ENV.NODE_ENV,
      githubConfigured: !!ENV.GITHUB.TOKEN,
      gitlabConfigured: !!ENV.GITLAB.TOKEN,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      status: 'healthy',
      stats,
      system: systemStatus,
      repositories: repositories.map(repo => ({
        id: repo.repository.id,
        name: repo.repository.fullName,
        provider: repo.repository.provider,
        isMonitoring: repo.isMonitoring,
        lastScanned: repo.lastScanned,
        hasDockerfile: repo.hasDockerfile,
        projectType: repo.projectType?.type,
        language: repo.projectType?.language,
        framework: repo.projectType?.framework,
      })),
    });
  } catch (error) {
    console.error('Error getting system status:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to get system status',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}