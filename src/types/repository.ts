export interface Repository {
  id: string;
  name: string;
  fullName: string;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  provider: 'github' | 'gitlab';
  isPrivate: boolean;
  description?: string;
  language?: string;
  lastUpdated: Date;
  owner: {
    login: string;
    type: 'User' | 'Organization';
  };
}

export interface RepositoryState {
  repository: Repository;
  lastCommitSha: string;
  lastScanned: Date;
  isMonitoring: boolean;
  localPath?: string;
  projectType?: ProjectType;
  hasDockerfile: boolean;
  detectedFrameworks: string[];
  buildConfig?: BuildConfig;
}

export interface ProjectType {
  type: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'library';
  framework: string;
  language: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'composer' | 'gradle' | 'maven';
  hasDatabase: boolean;
  hasTests: boolean;
}

export interface BuildConfig {
  buildCommand: string;
  testCommand: string;
  installCommand: string;
  startCommand: string;
  outputDirectory: string;
  environment: Record<string, string>;
}

export interface GitProvider {
  name: 'github' | 'gitlab';
  getRepository(owner: string, repo: string): Promise<Repository>;
  cloneRepository(repository: Repository, localPath: string): Promise<void>;
  getLatestCommit(repository: Repository): Promise<string>;
  watchRepository(repository: Repository, callback: (commit: string) => void): void;
}