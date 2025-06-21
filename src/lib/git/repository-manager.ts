import { Repository, RepositoryState, GitProvider } from '@/types/repository';
import { GitHubProvider } from './github-provider';
import { GitLabProvider } from './gitlab-provider';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs-extra';

export class RepositoryManager {
  private providers: Map<string, GitProvider> = new Map();
  private repositories: Map<string, RepositoryState> = new Map();
  private watchers: Map<string, NodeJS.Timeout> = new Map();
  private localReposPath: string;

  constructor(localReposPath = './repos') {
    this.localReposPath = path.resolve(localReposPath);
    this.initializeProviders();
  }

  private initializeProviders() {
    try {
      this.providers.set('github', new GitHubProvider());
    } catch (error) {
      console.warn('GitHub provider not available:', error);
    }

    try {
      this.providers.set('gitlab', new GitLabProvider());
    } catch (error) {
      console.warn('GitLab provider not available:', error);
    }
  }

  async addRepository(repoUrl: string): Promise<RepositoryState> {
    const { provider, owner, repo } = this.parseRepositoryUrl(repoUrl);
    
    const gitProvider = this.providers.get(provider);
    if (!gitProvider) {
      throw new Error(`Provider ${provider} is not available`);
    }

    const repository = await gitProvider.getRepository(owner, repo);
    const localPath = path.join(this.localReposPath, repository.fullName);

    await fs.ensureDir(this.localReposPath);
    
    if (await fs.pathExists(localPath)) {
      await fs.remove(localPath);
    }

    await gitProvider.cloneRepository(repository, localPath);
    const latestCommit = await gitProvider.getLatestCommit(repository);

    const repositoryState: RepositoryState = {
      repository,
      lastCommitSha: latestCommit,
      lastScanned: new Date(),
      isMonitoring: false,
      localPath,
      hasDockerfile: await this.checkDockerfile(localPath),
      detectedFrameworks: [],
    };

    this.repositories.set(repository.id, repositoryState);
    await this.startMonitoring(repository.id);

    return repositoryState;
  }

  async startMonitoring(repositoryId: string): Promise<void> {
    const repoState = this.repositories.get(repositoryId);
    if (!repoState) {
      throw new Error(`Repository ${repositoryId} not found`);
    }

    if (repoState.isMonitoring) {
      return;
    }

    const provider = this.providers.get(repoState.repository.provider);
    if (!provider) {
      throw new Error(`Provider ${repoState.repository.provider} not available`);
    }

    const checkForUpdates = async () => {
      try {
        const latestCommit = await provider.getLatestCommit(repoState.repository);
        
        if (latestCommit !== repoState.lastCommitSha) {
          console.log(`New commit detected for ${repoState.repository.fullName}: ${latestCommit}`);
          
          await this.updateRepository(repositoryId, latestCommit);
          
          repoState.lastCommitSha = latestCommit;
          repoState.lastScanned = new Date();
          
          this.onRepositoryUpdate(repoState);
        }
      } catch (error) {
        console.error(`Error monitoring repository ${repoState.repository.fullName}:`, error);
      }
    };

    const interval = setInterval(checkForUpdates, 30000);
    this.watchers.set(repositoryId, interval);
    
    repoState.isMonitoring = true;
    console.log(`Started monitoring ${repoState.repository.fullName}`);
  }

  async stopMonitoring(repositoryId: string): Promise<void> {
    const repoState = this.repositories.get(repositoryId);
    if (!repoState) {
      return;
    }

    const watcher = this.watchers.get(repositoryId);
    if (watcher) {
      clearInterval(watcher);
      this.watchers.delete(repositoryId);
    }

    repoState.isMonitoring = false;
    console.log(`Stopped monitoring ${repoState.repository.fullName}`);
  }

  private async updateRepository(repositoryId: string, newCommitSha: string): Promise<void> {
    const repoState = this.repositories.get(repositoryId);
    if (!repoState || !repoState.localPath) {
      return;
    }

    const provider = this.providers.get(repoState.repository.provider);
    if (!provider) {
      return;
    }

    try {
      await fs.remove(repoState.localPath);
      
      await provider.cloneRepository(repoState.repository, repoState.localPath);
      
      repoState.hasDockerfile = await this.checkDockerfile(repoState.localPath);
      
      console.log(`Repository ${repoState.repository.fullName} updated to commit ${newCommitSha}`);
    } catch (error) {
      console.error(`Error updating repository ${repoState.repository.fullName}:`, error);
    }
  }

  private async checkDockerfile(localPath: string): Promise<boolean> {
    const dockerfilePath = path.join(localPath, 'Dockerfile');
    return fs.pathExists(dockerfilePath);
  }

  private parseRepositoryUrl(url: string): { provider: string; owner: string; repo: string } {
    const patterns = [
      /github\.com[\/:]([^\/]+)\/([^\/\.]+)/,
      /gitlab\.com[\/:]([^\/]+)\/([^\/\.]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const [, owner, repo] = match;
        const provider = url.includes('github.com') ? 'github' : 'gitlab';
        return { provider, owner, repo: repo.replace(/\.git$/, '') };
      }
    }

    throw new Error(`Unable to parse repository URL: ${url}`);
  }

  private async onRepositoryUpdate(repoState: RepositoryState): Promise<void> {
    console.log(`Repository ${repoState.repository.fullName} has been updated`);
    
    if (!repoState.hasDockerfile && repoState.localPath) {
      await this.generateDockerfile(repoState);
    }
  }

  private async generateDockerfile(repoState: RepositoryState): Promise<void> {
    console.log(`Generating Dockerfile for ${repoState.repository.fullName}`);
  }

  getRepository(repositoryId: string): RepositoryState | undefined {
    return this.repositories.get(repositoryId);
  }

  getAllRepositories(): RepositoryState[] {
    return Array.from(this.repositories.values());
  }

  async removeRepository(repositoryId: string): Promise<void> {
    await this.stopMonitoring(repositoryId);
    
    const repoState = this.repositories.get(repositoryId);
    if (repoState?.localPath) {
      await fs.remove(repoState.localPath);
    }
    
    this.repositories.delete(repositoryId);
  }
}