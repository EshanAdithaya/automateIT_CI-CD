import fs from 'fs-extra';
import path from 'path';
import { ProjectType, BuildConfig } from '@/types/repository';

export interface ScanResult {
  projectType: ProjectType;
  buildConfig: BuildConfig;
  dependencies: string[];
  devDependencies: string[];
  hasTests: boolean;
  testFramework?: string;
  hasDatabase: boolean;
  databaseType?: string;
  hasDocker: boolean;
  hasGitHubActions: boolean;
  hasGitLabCI: boolean;
  detectedFiles: string[];
  estimatedBuildTime: number;
}

export class ProjectScanner {
  private scanResults: Map<string, ScanResult> = new Map();

  async scanProject(projectPath: string): Promise<ScanResult> {
    const absolutePath = path.resolve(projectPath);
    
    if (!await fs.pathExists(absolutePath)) {
      throw new Error(`Project path does not exist: ${absolutePath}`);
    }

    const files = await this.getAllFiles(absolutePath);
    const packageInfo = await this.analyzePackageFiles(absolutePath);
    const projectType = await this.detectProjectType(absolutePath, files, packageInfo);
    const buildConfig = await this.generateBuildConfig(absolutePath, projectType, packageInfo);
    const dependencies = packageInfo.dependencies || [];
    const devDependencies = packageInfo.devDependencies || [];

    const scanResult: ScanResult = {
      projectType,
      buildConfig,
      dependencies,
      devDependencies,
      hasTests: await this.detectTests(absolutePath, files),
      testFramework: await this.detectTestFramework(packageInfo),
      hasDatabase: await this.detectDatabase(absolutePath, dependencies),
      databaseType: await this.detectDatabaseType(dependencies),
      hasDocker: files.includes('Dockerfile') || files.includes('docker-compose.yml'),
      hasGitHubActions: files.some(f => f.includes('.github/workflows')),
      hasGitLabCI: files.includes('.gitlab-ci.yml'),
      detectedFiles: files,
      estimatedBuildTime: this.estimateBuildTime(projectType, dependencies.length),
    };

    this.scanResults.set(absolutePath, scanResult);
    return scanResult;
  }

  private async getAllFiles(dir: string, relativePath = ''): Promise<string[]> {
    const files: string[] = [];
    const items = await fs.readdir(dir);

    for (const item of items) {
      if (item.startsWith('.') && !['Dockerfile', '.github', '.gitlab-ci.yml'].some(f => item.includes(f))) {
        continue;
      }

      const fullPath = path.join(dir, item);
      const relativeItemPath = path.join(relativePath, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        if (!this.shouldIgnoreDirectory(item)) {
          const subFiles = await this.getAllFiles(fullPath, relativeItemPath);
          files.push(...subFiles);
        }
      } else {
        files.push(relativeItemPath);
      }
    }

    return files;
  }

  private shouldIgnoreDirectory(dirName: string): boolean {
    const ignoredDirs = [
      'node_modules', 'dist', 'build', '.git', 'coverage', 
      '__pycache__', 'venv', 'env', '.venv', 'target', 
      'vendor', '.next', '.nuxt', 'out'
    ];
    return ignoredDirs.includes(dirName);
  }

  private async analyzePackageFiles(projectPath: string): Promise<any> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const pyProjectPath = path.join(projectPath, 'pyproject.toml');
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    const composerPath = path.join(projectPath, 'composer.json');
    const pomPath = path.join(projectPath, 'pom.xml');
    const gradlePath = path.join(projectPath, 'build.gradle');

    if (await fs.pathExists(packageJsonPath)) {
      return fs.readJson(packageJsonPath);
    }

    if (await fs.pathExists(pyProjectPath)) {
      return { language: 'python', packageManager: 'pip' };
    }

    if (await fs.pathExists(requirementsPath)) {
      const content = await fs.readFile(requirementsPath, 'utf-8');
      const dependencies = content.split('\n').filter((line: string) => line.trim());
      return { language: 'python', packageManager: 'pip', dependencies };
    }

    if (await fs.pathExists(composerPath)) {
      return fs.readJson(composerPath);
    }

    if (await fs.pathExists(pomPath)) {
      return { language: 'java', packageManager: 'maven' };
    }

    if (await fs.pathExists(gradlePath)) {
      return { language: 'java', packageManager: 'gradle' };
    }

    return {};
  }

  private async detectProjectType(projectPath: string, files: string[], packageInfo: any): Promise<ProjectType> {
    if (packageInfo.dependencies || packageInfo.devDependencies) {
      const deps = { ...packageInfo.dependencies, ...packageInfo.devDependencies };
      
      if (deps.react || deps['@angular/core'] || deps.vue || deps.svelte) {
        return this.detectFrontendType(deps);
      }
      
      if (deps.express || deps.fastify || deps.koa || deps['@nestjs/core']) {
        return this.detectBackendType(deps);
      }
      
      if (deps.next || deps.nuxt || deps.gatsby) {
        return this.detectFullstackType(deps);
      }
    }

    if (files.some(f => f.endsWith('.py'))) {
      return {
        type: 'backend',
        framework: this.detectPythonFramework(files),
        language: 'python',
        packageManager: 'pip',
        hasDatabase: await this.detectDatabase(projectPath, []),
        hasTests: files.some(f => f.includes('test')),
      };
    }

    if (files.some(f => f.endsWith('.php'))) {
      return {
        type: 'backend',
        framework: 'php',
        language: 'php',
        packageManager: 'composer',
        hasDatabase: true,
        hasTests: files.some(f => f.includes('test')),
      };
    }

    return {
      type: 'library',
      framework: 'unknown',
      language: 'unknown',
      packageManager: 'npm',
      hasDatabase: false,
      hasTests: false,
    };
  }

  private detectFrontendType(deps: any): ProjectType {
    let framework = 'unknown';
    
    if (deps.react) framework = 'react';
    else if (deps['@angular/core']) framework = 'angular';
    else if (deps.vue) framework = 'vue';
    else if (deps.svelte) framework = 'svelte';

    return {
      type: 'frontend',
      framework,
      language: 'javascript',
      packageManager: this.detectPackageManager(deps),
      hasDatabase: false,
      hasTests: this.hasTestDependencies(deps),
    };
  }

  private detectBackendType(deps: any): ProjectType {
    let framework = 'unknown';
    
    if (deps.express) framework = 'express';
    else if (deps.fastify) framework = 'fastify';
    else if (deps.koa) framework = 'koa';
    else if (deps['@nestjs/core']) framework = 'nestjs';

    return {
      type: 'backend',
      framework,
      language: 'javascript',
      packageManager: this.detectPackageManager(deps),
      hasDatabase: this.hasDatabaseDependencies(deps),
      hasTests: this.hasTestDependencies(deps),
    };
  }

  private detectFullstackType(deps: any): ProjectType {
    let framework = 'unknown';
    
    if (deps.next) framework = 'nextjs';
    else if (deps.nuxt) framework = 'nuxtjs';
    else if (deps.gatsby) framework = 'gatsby';

    return {
      type: 'fullstack',
      framework,
      language: 'javascript',
      packageManager: this.detectPackageManager(deps),
      hasDatabase: this.hasDatabaseDependencies(deps),
      hasTests: this.hasTestDependencies(deps),
    };
  }

  private detectPythonFramework(files: string[]): string {
    if (files.some(f => f.includes('django'))) return 'django';
    if (files.some(f => f.includes('flask'))) return 'flask';
    if (files.some(f => f.includes('fastapi'))) return 'fastapi';
    return 'python';
  }

  private detectPackageManager(deps: any): 'npm' | 'yarn' | 'pnpm' {
    if (deps['yarn'] || process.env.npm_config_user_agent?.includes('yarn')) return 'yarn';
    if (deps['pnpm'] || process.env.npm_config_user_agent?.includes('pnpm')) return 'pnpm';
    return 'npm';
  }

  private hasTestDependencies(deps: any): boolean {
    const testLibs = ['jest', 'mocha', 'chai', 'jasmine', 'karma', 'cypress', 'playwright', '@testing-library'];
    return testLibs.some(lib => deps[lib] || Object.keys(deps).some(key => key.includes(lib)));
  }

  private hasDatabaseDependencies(deps: any): boolean {
    const dbLibs = ['mongoose', 'pg', 'mysql', 'sqlite3', 'redis', 'mongodb', 'typeorm', 'prisma', 'sequelize'];
    return dbLibs.some(lib => deps[lib]);
  }

  private async detectDatabase(projectPath: string, dependencies: string[]): Promise<boolean> {
    return this.hasDatabaseDependencies({ ...dependencies }) || 
           await fs.pathExists(path.join(projectPath, 'prisma')) ||
           await fs.pathExists(path.join(projectPath, 'migrations'));
  }

  private async detectDatabaseType(dependencies: string[]): Promise<string | undefined> {
    const deps = dependencies.join(' ');
    if (deps.includes('postgres') || deps.includes('pg')) return 'postgresql';
    if (deps.includes('mysql')) return 'mysql';
    if (deps.includes('mongodb') || deps.includes('mongoose')) return 'mongodb';
    if (deps.includes('redis')) return 'redis';
    if (deps.includes('sqlite')) return 'sqlite';
    return undefined;
  }

  private async detectTests(projectPath: string, files: string[]): Promise<boolean> {
    return files.some(f => 
      f.includes('test') || 
      f.includes('spec') || 
      f.endsWith('.test.js') || 
      f.endsWith('.spec.js') ||
      f.endsWith('.test.ts') || 
      f.endsWith('.spec.ts')
    );
  }

  private async detectTestFramework(packageInfo: any): Promise<string | undefined> {
    const deps = { ...packageInfo.dependencies, ...packageInfo.devDependencies };
    
    if (deps.jest) return 'jest';
    if (deps.mocha) return 'mocha';
    if (deps.cypress) return 'cypress';
    if (deps.playwright) return 'playwright';
    if (deps['@testing-library/react']) return 'react-testing-library';
    
    return undefined;
  }

  private async generateBuildConfig(projectPath: string, projectType: ProjectType, packageInfo: any): Promise<BuildConfig> {
    const scripts = packageInfo.scripts || {};
    
    return {
      buildCommand: scripts.build || this.getDefaultBuildCommand(projectType),
      testCommand: scripts.test || this.getDefaultTestCommand(projectType),
      installCommand: this.getInstallCommand(projectType.packageManager),
      startCommand: scripts.start || this.getDefaultStartCommand(projectType),
      outputDirectory: this.getOutputDirectory(projectType),
      environment: this.getDefaultEnvironment(projectType),
    };
  }

  private getDefaultBuildCommand(projectType: ProjectType): string {
    switch (projectType.framework) {
      case 'react': return 'npm run build';
      case 'nextjs': return 'npm run build';
      case 'angular': return 'ng build';
      case 'vue': return 'npm run build';
      case 'django': return 'python manage.py collectstatic --noinput';
      case 'flask': return '';
      default: return 'npm run build';
    }
  }

  private getDefaultTestCommand(projectType: ProjectType): string {
    switch (projectType.language) {
      case 'python': return 'python -m pytest';
      case 'php': return 'vendor/bin/phpunit';
      case 'java': return 'mvn test';
      default: return 'npm test';
    }
  }

  private getInstallCommand(packageManager: string): string {
    switch (packageManager) {
      case 'yarn': return 'yarn install';
      case 'pnpm': return 'pnpm install';
      case 'pip': return 'pip install -r requirements.txt';
      case 'composer': return 'composer install';
      case 'maven': return 'mvn install';
      case 'gradle': return 'gradle build';
      default: return 'npm install';
    }
  }

  private getDefaultStartCommand(projectType: ProjectType): string {
    switch (projectType.framework) {
      case 'nextjs': return 'npm start';
      case 'express': return 'node server.js';
      case 'django': return 'python manage.py runserver';
      case 'flask': return 'python app.py';
      default: return 'npm start';
    }
  }

  private getOutputDirectory(projectType: ProjectType): string {
    switch (projectType.framework) {
      case 'react': return 'build';
      case 'nextjs': return '.next';
      case 'angular': return 'dist';
      case 'vue': return 'dist';
      default: return 'dist';
    }
  }

  private getDefaultEnvironment(projectType: ProjectType): Record<string, string> {
    const baseEnv = {
      NODE_ENV: 'production',
    };

    if (projectType.language === 'python') {
      return {
        PYTHONPATH: '.',
        PYTHONUNBUFFERED: '1',
      };
    }

    return baseEnv;
  }

  private estimateBuildTime(projectType: ProjectType, dependencyCount: number): number {
    let baseTime = 60;
    
    switch (projectType.type) {
      case 'frontend':
        baseTime = 120;
        break;
      case 'backend':
        baseTime = 90;
        break;
      case 'fullstack':
        baseTime = 180;
        break;
    }

    return baseTime + (dependencyCount * 2);
  }

  getScanResult(projectPath: string): ScanResult | undefined {
    return this.scanResults.get(path.resolve(projectPath));
  }
}