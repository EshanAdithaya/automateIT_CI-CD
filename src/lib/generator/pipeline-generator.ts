import { ScanResult } from '@/lib/scanner/project-scanner';
import { ProjectType } from '@/types/repository';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';

export interface PipelineConfig {
  platform: 'github' | 'gitlab';
  stages: PipelineStage[];
  environment: Record<string, string>;
  caching: CacheConfig[];
  deployments: DeploymentConfig[];
}

export interface PipelineStage {
  name: string;
  steps: PipelineStep[];
  conditions?: string[];
  dependsOn?: string[];
}

export interface PipelineStep {
  name: string;
  command: string;
  workingDirectory?: string;
  environment?: Record<string, string>;
  timeout?: number;
}

export interface CacheConfig {
  key: string;
  paths: string[];
}

export interface DeploymentConfig {
  environment: 'staging' | 'production';
  branch: string;
  provider: 'docker' | 'vercel' | 'heroku' | 'aws' | 'gcp';
  config: Record<string, any>;
}

export class PipelineGenerator {
  async generateGitHubActions(scanResult: ScanResult, outputPath?: string): Promise<string> {
    const workflow = this.buildGitHubWorkflow(scanResult);
    const yamlContent = yaml.stringify(workflow, { indent: 2 });

    if (outputPath) {
      const workflowsDir = path.join(outputPath, '.github', 'workflows');
      await fs.ensureDir(workflowsDir);
      const workflowPath = path.join(workflowsDir, 'ci-cd.yml');
      await fs.writeFile(workflowPath, yamlContent);
      console.log(`GitHub Actions workflow generated at: ${workflowPath}`);
    }

    return yamlContent;
  }

  async generateGitLabCI(scanResult: ScanResult, outputPath?: string): Promise<string> {
    const pipeline = this.buildGitLabPipeline(scanResult);
    const yamlContent = yaml.stringify(pipeline, { indent: 2 });

    if (outputPath) {
      const pipelinePath = path.join(outputPath, '.gitlab-ci.yml');
      await fs.writeFile(pipelinePath, yamlContent);
      console.log(`GitLab CI pipeline generated at: ${pipelinePath}`);
    }

    return yamlContent;
  }

  private buildGitHubWorkflow(scanResult: ScanResult): any {
    const nodeVersion = this.getNodeVersion(scanResult);
    const pythonVersion = this.getPythonVersion(scanResult);
    
    return {
      name: 'CI/CD Pipeline',
      on: {
        push: {
          branches: ['main', 'develop'],
        },
        pull_request: {
          branches: ['main'],
        },
      },
      
      env: {
        NODE_ENV: 'test',
        ...this.getEnvironmentVariables(scanResult),
      },

      jobs: {
        test: {
          'runs-on': 'ubuntu-latest',
          strategy: this.getTestStrategy(scanResult),
          steps: [
            {
              name: 'Checkout code',
              uses: 'actions/checkout@v4',
            },
            ...this.getSetupSteps(scanResult),
            ...this.getCacheSteps(scanResult),
            ...this.getInstallSteps(scanResult),
            ...this.getLintSteps(scanResult),
            ...this.getTestSteps(scanResult),
            ...this.getSecuritySteps(scanResult),
          ],
        },

        build: {
          'runs-on': 'ubuntu-latest',
          needs: ['test'],
          if: "github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'",
          steps: [
            {
              name: 'Checkout code',
              uses: 'actions/checkout@v4',
            },
            ...this.getSetupSteps(scanResult),
            ...this.getCacheSteps(scanResult),
            ...this.getInstallSteps(scanResult),
            ...this.getBuildSteps(scanResult),
            ...this.getDockerSteps(scanResult),
          ],
        },

        deploy: {
          'runs-on': 'ubuntu-latest',
          needs: ['build'],
          if: "github.ref == 'refs/heads/main'",
          environment: 'production',
          steps: [
            {
              name: 'Checkout code',
              uses: 'actions/checkout@v4',
            },
            ...this.getDeploymentSteps(scanResult),
          ],
        },
      },
    };
  }

  private buildGitLabPipeline(scanResult: ScanResult): any {
    return {
      image: this.getBaseImage(scanResult),
      
      stages: ['test', 'build', 'deploy'],
      
      variables: {
        NODE_ENV: 'test',
        ...this.getEnvironmentVariables(scanResult),
      },

      cache: this.getGitLabCache(scanResult),

      before_script: this.getBeforeScript(scanResult),

      'test:unit': {
        stage: 'test',
        script: [
          ...this.getInstallCommands(scanResult),
          ...this.getLintCommands(scanResult),
          ...this.getTestCommands(scanResult),
        ],
        coverage: this.getCoverageRegex(scanResult),
        artifacts: {
          reports: {
            coverage_report: {
              coverage_format: 'cobertura',
              path: 'coverage/cobertura-coverage.xml',
            },
          },
          paths: ['coverage/'],
          expire_in: '1 week',
        },
      },

      'security:scan': {
        stage: 'test',
        script: this.getSecurityCommands(scanResult),
        allow_failure: true,
      },

      'build:docker': {
        stage: 'build',
        image: 'docker:latest',
        services: ['docker:dind'],
        before_script: [
          'docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY',
        ],
        script: [
          'docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .',
          'docker build -t $CI_REGISTRY_IMAGE:latest .',
          'docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA',
          'docker push $CI_REGISTRY_IMAGE:latest',
        ],
        only: ['main', 'develop'],
      },

      'deploy:staging': {
        stage: 'deploy',
        script: this.getStagingDeployCommands(scanResult),
        environment: {
          name: 'staging',
          url: '$STAGING_URL',
        },
        only: ['develop'],
      },

      'deploy:production': {
        stage: 'deploy',
        script: this.getProductionDeployCommands(scanResult),
        environment: {
          name: 'production',
          url: '$PRODUCTION_URL',
        },
        when: 'manual',
        only: ['main'],
      },
    };
  }

  private getNodeVersion(scanResult: ScanResult): string {
    if (scanResult.projectType.language === 'javascript' || 
        scanResult.projectType.language === 'typescript') {
      return '18';
    }
    return '18';
  }

  private getPythonVersion(scanResult: ScanResult): string {
    if (scanResult.projectType.language === 'python') {
      return '3.11';
    }
    return '3.11';
  }

  private getTestStrategy(scanResult: ScanResult): any {
    if (scanResult.projectType.language === 'javascript' || 
        scanResult.projectType.language === 'typescript') {
      return {
        matrix: {
          'node-version': ['16', '18', '20'],
        },
      };
    }
    return undefined;
  }

  private getSetupSteps(scanResult: ScanResult): any[] {
    const steps = [];

    if (scanResult.projectType.language === 'javascript' || 
        scanResult.projectType.language === 'typescript') {
      steps.push({
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: {
          'node-version': '${{ matrix.node-version }}',
        },
      });
    }

    if (scanResult.projectType.language === 'python') {
      steps.push({
        name: 'Setup Python',
        uses: 'actions/setup-python@v4',
        with: {
          'python-version': this.getPythonVersion(scanResult),
        },
      });
    }

    return steps;
  }

  private getCacheSteps(scanResult: ScanResult): any[] {
    const steps = [];

    if (scanResult.projectType.packageManager === 'npm') {
      steps.push({
        name: 'Cache npm dependencies',
        uses: 'actions/cache@v3',
        with: {
          path: '~/.npm',
          key: "${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}",
          'restore-keys': '${{ runner.os }}-npm-',
        },
      });
    }

    if (scanResult.projectType.packageManager === 'yarn') {
      steps.push({
        name: 'Cache Yarn dependencies',
        uses: 'actions/cache@v3',
        with: {
          path: '~/.yarn/cache',
          key: "${{ runner.os }}-yarn-${{ hashFiles('**/yarn.lock') }}",
          'restore-keys': '${{ runner.os }}-yarn-',
        },
      });
    }

    if (scanResult.projectType.language === 'python') {
      steps.push({
        name: 'Cache pip dependencies',
        uses: 'actions/cache@v3',
        with: {
          path: '~/.cache/pip',
          key: "${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}",
          'restore-keys': '${{ runner.os }}-pip-',
        },
      });
    }

    return steps;
  }

  private getInstallSteps(scanResult: ScanResult): any[] {
    return [{
      name: 'Install dependencies',
      run: scanResult.buildConfig.installCommand,
    }];
  }

  private getLintSteps(scanResult: ScanResult): any[] {
    const steps = [];

    if (scanResult.projectType.language === 'javascript' || 
        scanResult.projectType.language === 'typescript') {
      steps.push({
        name: 'Run ESLint',
        run: 'npm run lint',
      });

      if (scanResult.projectType.language === 'typescript') {
        steps.push({
          name: 'Type check',
          run: 'npm run type-check || tsc --noEmit',
        });
      }
    }

    if (scanResult.projectType.language === 'python') {
      steps.push({
        name: 'Run flake8',
        run: 'flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics',
      });
    }

    return steps;
  }

  private getTestSteps(scanResult: ScanResult): any[] {
    const steps = [];

    if (scanResult.hasTests) {
      steps.push({
        name: 'Run tests',
        run: scanResult.buildConfig.testCommand,
      });

      if (scanResult.testFramework === 'jest') {
        steps.push({
          name: 'Upload coverage to Codecov',
          uses: 'codecov/codecov-action@v3',
          with: {
            file: './coverage/lcov.info',
          },
        });
      }
    }

    return steps;
  }

  private getSecuritySteps(scanResult: ScanResult): any[] {
    const steps = [];

    if (scanResult.projectType.language === 'javascript' || 
        scanResult.projectType.language === 'typescript') {
      steps.push({
        name: 'Run npm audit',
        run: 'npm audit --audit-level moderate',
      });
    }

    steps.push({
      name: 'Run Trivy vulnerability scanner',
      uses: 'aquasecurity/trivy-action@master',
      with: {
        'scan-type': 'fs',
        'scan-ref': '.',
      },
    });

    return steps;
  }

  private getBuildSteps(scanResult: ScanResult): any[] {
    if (scanResult.buildConfig.buildCommand) {
      return [{
        name: 'Build project',
        run: scanResult.buildConfig.buildCommand,
      }];
    }
    return [];
  }

  private getDockerSteps(scanResult: ScanResult): any[] {
    const steps = [];

    steps.push({
      name: 'Set up Docker Buildx',
      uses: 'docker/setup-buildx-action@v3',
    });

    steps.push({
      name: 'Login to Container Registry',
      uses: 'docker/login-action@v3',
      with: {
        registry: '${{ secrets.REGISTRY_URL }}',
        username: '${{ secrets.REGISTRY_USERNAME }}',
        password: '${{ secrets.REGISTRY_PASSWORD }}',
      },
    });

    steps.push({
      name: 'Build and push Docker image',
      uses: 'docker/build-push-action@v5',
      with: {
        context: '.',
        push: true,
        tags: '${{ secrets.REGISTRY_URL }}/app:${{ github.sha }},${{ secrets.REGISTRY_URL }}/app:latest',
        cache: {
          from: 'type=gha',
          to: 'type=gha,mode=max',
        },
      },
    });

    return steps;
  }

  private getDeploymentSteps(scanResult: ScanResult): any[] {
    return [
      {
        name: 'Deploy to production',
        run: 'echo "Deploying to production..."',
      },
    ];
  }

  private getEnvironmentVariables(scanResult: ScanResult): Record<string, string> {
    const env: Record<string, string> = {};

    if (scanResult.projectType.language === 'python') {
      env.PYTHONUNBUFFERED = '1';
    }

    if (scanResult.hasDatabase) {
      env.DATABASE_URL = '${{ secrets.DATABASE_URL }}';
    }

    return env;
  }

  private getBaseImage(scanResult: ScanResult): string {
    if (scanResult.projectType.language === 'python') {
      return 'python:3.11';
    }
    return 'node:18';
  }

  private getGitLabCache(scanResult: ScanResult): any[] {
    const cache = [];

    if (scanResult.projectType.packageManager === 'npm') {
      cache.push({
        key: 'npm-$CI_COMMIT_REF_SLUG',
        paths: ['node_modules/'],
      });
    }

    if (scanResult.projectType.language === 'python') {
      cache.push({
        key: 'pip-$CI_COMMIT_REF_SLUG',
        paths: ['.cache/pip/'],
      });
    }

    return cache;
  }

  private getBeforeScript(scanResult: ScanResult): string[] {
    const scripts = [];

    if (scanResult.projectType.language === 'python') {
      scripts.push('python --version');
      scripts.push('pip install --upgrade pip');
    }

    return scripts;
  }

  private getInstallCommands(scanResult: ScanResult): string[] {
    return [scanResult.buildConfig.installCommand];
  }

  private getLintCommands(scanResult: ScanResult): string[] {
    const commands = [];

    if (scanResult.projectType.language === 'javascript' || 
        scanResult.projectType.language === 'typescript') {
      commands.push('npm run lint || echo "No lint script found"');
    }

    return commands;
  }

  private getTestCommands(scanResult: ScanResult): string[] {
    if (scanResult.hasTests) {
      return [scanResult.buildConfig.testCommand];
    }
    return ['echo "No tests found"'];
  }

  private getSecurityCommands(scanResult: ScanResult): string[] {
    const commands = [];

    if (scanResult.projectType.language === 'javascript' || 
        scanResult.projectType.language === 'typescript') {
      commands.push('npm audit || echo "Audit completed with warnings"');
    }

    return commands;
  }

  private getStagingDeployCommands(scanResult: ScanResult): string[] {
    return [
      'echo "Deploying to staging..."',
      'docker pull $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA',
      'docker run -d --name staging-app -p 80:3000 $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA',
    ];
  }

  private getProductionDeployCommands(scanResult: ScanResult): string[] {
    return [
      'echo "Deploying to production..."',
      'docker pull $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA',
      'docker run -d --name production-app -p 80:3000 $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA',
    ];
  }

  private getCoverageRegex(scanResult: ScanResult): string {
    if (scanResult.testFramework === 'jest') {
      return '/All files[^|]*|[^|]*s+([d.]+)/';
    }
    return '/TOTAL.+?(d+%)$/';
  }
}