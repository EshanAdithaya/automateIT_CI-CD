import { Repository, GitProvider } from '@/types/repository';
import { ENV } from '@/lib/config';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import path from 'path';

export class GitLabProvider implements GitProvider {
  name = 'gitlab' as const;
  private baseUrl: string;
  private token: string;

  constructor(baseUrl = 'https://gitlab.com') {
    if (!ENV.GITLAB.TOKEN) {
      throw new Error('GitLab token is required');
    }
    
    this.baseUrl = baseUrl;
    this.token = ENV.GITLAB.TOKEN;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}/api/v4${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    try {
      const projectPath = encodeURIComponent(`${owner}/${repo}`);
      const data = await this.makeRequest(`/projects/${projectPath}`);

      return {
        id: data.id.toString(),
        name: data.name,
        fullName: data.path_with_namespace,
        url: data.web_url,
        cloneUrl: data.http_url_to_repo,
        defaultBranch: data.default_branch,
        provider: 'gitlab',
        isPrivate: data.visibility === 'private',
        description: data.description || undefined,
        language: undefined,
        lastUpdated: new Date(data.last_activity_at),
        owner: {
          login: data.namespace.path,
          type: data.namespace.kind === 'user' ? 'User' : 'Organization',
        },
      };
    } catch (error) {
      console.error('Error fetching GitLab repository:', error);
      throw new Error(`Failed to fetch repository ${owner}/${repo}`);
    }
  }

  async cloneRepository(repository: Repository, localPath: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(localPath));
      
      const git = simpleGit();
      const cloneUrl = repository.cloneUrl.replace('https://', `https://oauth2:${this.token}@`);
      await git.clone(cloneUrl, localPath, ['--depth', '1']);
      
      console.log(`Repository ${repository.fullName} cloned to ${localPath}`);
    } catch (error) {
      console.error('Error cloning repository:', error);
      throw new Error(`Failed to clone repository ${repository.fullName}`);
    }
  }

  async getLatestCommit(repository: Repository): Promise<string> {
    try {
      const projectId = encodeURIComponent(repository.fullName);
      const commits = await this.makeRequest(`/projects/${projectId}/repository/commits?ref_name=${repository.defaultBranch}&per_page=1`);
      
      if (commits.length === 0) {
        throw new Error('No commits found');
      }

      return commits[0].id;
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
      const projectId = encodeURIComponent(repository.fullName);
      const data = await this.makeRequest(`/projects/${projectId}/repository/tree?path=${encodeURIComponent(path)}&ref=${repository.defaultBranch}`);
      return data;
    } catch (error) {
      console.error('Error fetching repository contents:', error);
      throw new Error(`Failed to fetch contents for ${repository.fullName}`);
    }
  }

  async getFileContent(repository: Repository, filePath: string): Promise<string | null> {
    try {
      const projectId = encodeURIComponent(repository.fullName);
      const encodedPath = encodeURIComponent(filePath);
      const data = await this.makeRequest(`/projects/${projectId}/repository/files/${encodedPath}?ref=${repository.defaultBranch}`);
      
      if (data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      
      return null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      console.error('Error fetching file content:', error);
      throw new Error(`Failed to fetch file ${filePath} from ${repository.fullName}`);
    }
  }
}