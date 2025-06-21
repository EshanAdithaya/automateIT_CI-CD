import { Octokit } from '@octokit/rest';
import { Repository, GitProvider } from '@/types/repository';
import { ENV } from '@/lib/config';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import path from 'path';

export class GitHubProvider implements GitProvider {
  name = 'github' as const;
  private octokit: Octokit;

  constructor() {
    if (!ENV.GITHUB.TOKEN) {
      throw new Error('GitHub token is required');
    }
    
    this.octokit = new Octokit({
      auth: ENV.GITHUB.TOKEN,
    });
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      return {
        id: data.id.toString(),
        name: data.name,
        fullName: data.full_name,
        url: data.html_url,
        cloneUrl: data.clone_url,
        defaultBranch: data.default_branch,
        provider: 'github',
        isPrivate: data.private,
        description: data.description || undefined,
        language: data.language || undefined,
        lastUpdated: new Date(data.updated_at),
        owner: {
          login: data.owner.login,
          type: data.owner.type as 'User' | 'Organization',
        },
      };
    } catch (error) {
      console.error('Error fetching GitHub repository:', error);
      throw new Error(`Failed to fetch repository ${owner}/${repo}`);
    }
  }

  async cloneRepository(repository: Repository, localPath: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(localPath));
      
      const git = simpleGit();
      await git.clone(repository.cloneUrl, localPath, ['--depth', '1']);
      
      console.log(`Repository ${repository.fullName} cloned to ${localPath}`);
    } catch (error) {
      console.error('Error cloning repository:', error);
      throw new Error(`Failed to clone repository ${repository.fullName}`);
    }
  }

  async getLatestCommit(repository: Repository): Promise<string> {
    try {
      const { data } = await this.octokit.rest.repos.getCommit({
        owner: repository.owner.login,
        repo: repository.name,
        ref: repository.defaultBranch,
      });

      return data.sha;
    } catch (error) {
      console.error('Error fetching latest commit:', error);
      throw new Error(`Failed to fetch latest commit for ${repository.fullName}`);
    }
  }

  watchRepository(repository: Repository, callback: (commit: string) => void): void {
    const checkForUpdates = async () => {
      try {
        const latestCommit = await this.getLatestCommit(repository);
        callback(latestCommit);
      } catch (error) {
        console.error('Error checking for repository updates:', error);
      }
    };

    const interval = setInterval(checkForUpdates, 60000);
    
    console.log(`Started monitoring ${repository.fullName} for updates`);
  }

  async getRepositoryContents(repository: Repository, path = ''): Promise<any[]> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: repository.owner.login,
        repo: repository.name,
        path,
      });

      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error('Error fetching repository contents:', error);
      throw new Error(`Failed to fetch contents for ${repository.fullName}`);
    }
  }

  async getFileContent(repository: Repository, filePath: string): Promise<string | null> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: repository.owner.login,
        repo: repository.name,
        path: filePath,
      });

      if ('content' in data && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      
      return null;
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 404) {
        return null;
      }
      console.error('Error fetching file content:', error);
      throw new Error(`Failed to fetch file ${filePath} from ${repository.fullName}`);
    }
  }
}