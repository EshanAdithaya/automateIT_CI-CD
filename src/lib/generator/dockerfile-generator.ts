import { ProjectType, BuildConfig } from '@/types/repository';
import { ScanResult } from '@/lib/scanner/project-scanner';
import fs from 'fs-extra';
import path from 'path';

export interface DockerfileConfig {
  baseImage: string;
  workdir: string;
  port: number;
  buildSteps: string[];
  runCommand: string;
  environment: Record<string, string>;
  volumes?: string[];
  healthCheck?: string;
}

export class DockerfileGenerator {
  private templates: Map<string, DockerfileConfig> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates() {
    this.templates.set('node-frontend', {
      baseImage: 'node:18-alpine',
      workdir: '/app',
      port: 3000,
      buildSteps: [
        'COPY package*.json ./',
        'RUN npm ci --only=production',
        'COPY . .',
        'RUN npm run build'
      ],
      runCommand: 'npm start',
      environment: {
        NODE_ENV: 'production'
      },
      healthCheck: 'curl -f http://localhost:3000 || exit 1'
    });

    this.templates.set('node-backend', {
      baseImage: 'node:18-alpine',
      workdir: '/app',
      port: 3000,
      buildSteps: [
        'COPY package*.json ./',
        'RUN npm ci --only=production',
        'COPY . .'
      ],
      runCommand: 'npm start',
      environment: {
        NODE_ENV: 'production'
      },
      healthCheck: 'curl -f http://localhost:3000/health || exit 1'
    });

    this.templates.set('nextjs', {
      baseImage: 'node:18-alpine',
      workdir: '/app',
      port: 3000,
      buildSteps: [
        'COPY package*.json ./',
        'RUN npm ci --only=production',
        'COPY . .',
        'RUN npm run build'
      ],
      runCommand: 'npm start',
      environment: {
        NODE_ENV: 'production',
        PORT: '3000'
      },
      healthCheck: 'curl -f http://localhost:3000 || exit 1'
    });

    this.templates.set('python-django', {
      baseImage: 'python:3.11-slim',
      workdir: '/app',
      port: 8000,
      buildSteps: [
        'COPY requirements.txt .',
        'RUN pip install --no-cache-dir -r requirements.txt',
        'COPY . .',
        'RUN python manage.py collectstatic --noinput'
      ],
      runCommand: 'python manage.py runserver 0.0.0.0:8000',
      environment: {
        PYTHONUNBUFFERED: '1',
        PYTHONPATH: '/app'
      },
      healthCheck: 'curl -f http://localhost:8000 || exit 1'
    });

    this.templates.set('python-flask', {
      baseImage: 'python:3.11-slim',
      workdir: '/app',
      port: 5000,
      buildSteps: [
        'COPY requirements.txt .',
        'RUN pip install --no-cache-dir -r requirements.txt',
        'COPY . .'
      ],
      runCommand: 'python app.py',
      environment: {
        PYTHONUNBUFFERED: '1',
        FLASK_ENV: 'production'
      },
      healthCheck: 'curl -f http://localhost:5000 || exit 1'
    });

    this.templates.set('python-fastapi', {
      baseImage: 'python:3.11-slim',
      workdir: '/app',
      port: 8000,
      buildSteps: [
        'COPY requirements.txt .',
        'RUN pip install --no-cache-dir -r requirements.txt',
        'COPY . .'
      ],
      runCommand: 'uvicorn main:app --host 0.0.0.0 --port 8000',
      environment: {
        PYTHONUNBUFFERED: '1'
      },
      healthCheck: 'curl -f http://localhost:8000/health || exit 1'
    });

    this.templates.set('php', {
      baseImage: 'php:8.2-apache',
      workdir: '/var/www/html',
      port: 80,
      buildSteps: [
        'COPY composer.json composer.lock* ./',
        'RUN composer install --no-dev --optimize-autoloader',
        'COPY . .',
        'RUN chown -R www-data:www-data /var/www/html'
      ],
      runCommand: 'apache2-foreground',
      environment: {
        APACHE_DOCUMENT_ROOT: '/var/www/html'
      },
      healthCheck: 'curl -f http://localhost || exit 1'
    });
  }

  async generateDockerfile(scanResult: ScanResult, outputPath?: string): Promise<string> {
    const templateKey = this.getTemplateKey(scanResult.projectType);
    const baseTemplate = this.templates.get(templateKey);
    
    if (!baseTemplate) {
      throw new Error(`No template found for project type: ${templateKey}`);
    }

    const dockerfileConfig = this.customizeTemplate(baseTemplate, scanResult);
    const dockerfileContent = this.buildDockerfileContent(dockerfileConfig);

    if (outputPath) {
      const dockerfilePath = path.join(outputPath, 'Dockerfile');
      await fs.writeFile(dockerfilePath, dockerfileContent);
      console.log(`Dockerfile generated at: ${dockerfilePath}`);
    }

    return dockerfileContent;
  }

  async generateDockerCompose(scanResult: ScanResult, outputPath?: string): Promise<string> {
    const composeContent = this.buildDockerComposeContent(scanResult);

    if (outputPath) {
      const composePath = path.join(outputPath, 'docker-compose.yml');
      await fs.writeFile(composePath, composeContent);
      console.log(`Docker Compose file generated at: ${composePath}`);
    }

    return composeContent;
  }

  private getTemplateKey(projectType: ProjectType): string {
    const { type, framework, language } = projectType;

    if (language === 'javascript' || language === 'typescript') {
      if (framework === 'nextjs') return 'nextjs';
      if (type === 'frontend') return 'node-frontend';
      if (type === 'backend' || type === 'fullstack') return 'node-backend';
    }

    if (language === 'python') {
      if (framework === 'django') return 'python-django';
      if (framework === 'flask') return 'python-flask';
      if (framework === 'fastapi') return 'python-fastapi';
      return 'python-flask';
    }

    if (language === 'php') {
      return 'php';
    }

    return 'node-backend';
  }

  private customizeTemplate(template: DockerfileConfig, scanResult: ScanResult): DockerfileConfig {
    const customized = { ...template };

    if (scanResult.projectType.packageManager === 'yarn') {
      customized.buildSteps = customized.buildSteps.map(step => 
        step.replace('npm ci --only=production', 'yarn install --frozen-lockfile --production')
          .replace('npm run', 'yarn')
          .replace('npm start', 'yarn start')
          .replace('package*.json', 'package.json yarn.lock')
      );
      customized.runCommand = customized.runCommand.replace('npm', 'yarn');
    }

    if (scanResult.projectType.packageManager === 'pnpm') {
      customized.buildSteps = customized.buildSteps.map(step => 
        step.replace('npm ci --only=production', 'pnpm install --frozen-lockfile --prod')
          .replace('npm run', 'pnpm')
          .replace('npm start', 'pnpm start')
          .replace('package*.json', 'package.json pnpm-lock.yaml')
      );
      customized.runCommand = customized.runCommand.replace('npm', 'pnpm');
    }

    if (scanResult.buildConfig.startCommand) {
      customized.runCommand = scanResult.buildConfig.startCommand;
    }

    if (scanResult.hasDatabase) {
      customized.environment = {
        ...customized.environment,
        ...this.getDatabaseEnvironment(scanResult.databaseType)
      };
    }

    return customized;
  }

  private getDatabaseEnvironment(databaseType?: string): Record<string, string> {
    switch (databaseType) {
      case 'postgresql':
        return {
          DATABASE_URL: 'postgresql://user:password@postgres:5432/database'
        };
      case 'mysql':
        return {
          DATABASE_URL: 'mysql://user:password@mysql:3306/database'
        };
      case 'mongodb':
        return {
          MONGODB_URL: 'mongodb://mongo:27017/database'
        };
      case 'redis':
        return {
          REDIS_URL: 'redis://redis:6379'
        };
      default:
        return {};
    }
  }

  private buildDockerfileContent(config: DockerfileConfig): string {
    let content = '';

    content += `FROM ${config.baseImage}\n\n`;

    content += `WORKDIR ${config.workdir}\n\n`;

    if (config.baseImage.includes('node')) {
      content += `RUN apk add --no-cache curl\n\n`;
    } else if (config.baseImage.includes('python')) {
      content += `RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*\n\n`;
    }

    config.buildSteps.forEach(step => {
      content += `${step}\n`;
    });
    content += '\n';

    Object.entries(config.environment).forEach(([key, value]) => {
      content += `ENV ${key}=${value}\n`;
    });
    content += '\n';

    content += `EXPOSE ${config.port}\n\n`;

    if (config.healthCheck) {
      content += `HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\\n`;
      content += `  CMD ${config.healthCheck}\n\n`;
    }

    content += `CMD ["sh", "-c", "${config.runCommand}"]\n`;

    return content;
  }

  private buildDockerComposeContent(scanResult: ScanResult): string {
    const serviceName = 'app';
    let content = `version: '3.8'\n\nservices:\n`;

    content += `  ${serviceName}:\n`;
    content += `    build: .\n`;
    content += `    ports:\n`;
    content += `      - "3000:3000"\n`;
    content += `    environment:\n`;
    content += `      - NODE_ENV=production\n`;

    if (scanResult.hasDatabase && scanResult.databaseType) {
      content += `    depends_on:\n`;
      content += `      - ${scanResult.databaseType}\n`;
      content += `    networks:\n`;
      content += `      - app-network\n\n`;

      content += this.getDatabaseService(scanResult.databaseType);
      
      content += `\nnetworks:\n`;
      content += `  app-network:\n`;
      content += `    driver: bridge\n`;

      content += `\nvolumes:\n`;
      content += `  db-data:\n`;
    }

    return content;
  }

  private getDatabaseService(databaseType: string): string {
    switch (databaseType) {
      case 'postgresql':
        return `  postgres:\n` +
               `    image: postgres:15-alpine\n` +
               `    environment:\n` +
               `      - POSTGRES_DB=database\n` +
               `      - POSTGRES_USER=user\n` +
               `      - POSTGRES_PASSWORD=password\n` +
               `    volumes:\n` +
               `      - db-data:/var/lib/postgresql/data\n` +
               `    networks:\n` +
               `      - app-network\n`;

      case 'mysql':
        return `  mysql:\n` +
               `    image: mysql:8.0\n` +
               `    environment:\n` +
               `      - MYSQL_DATABASE=database\n` +
               `      - MYSQL_USER=user\n` +
               `      - MYSQL_PASSWORD=password\n` +
               `      - MYSQL_ROOT_PASSWORD=rootpassword\n` +
               `    volumes:\n` +
               `      - db-data:/var/lib/mysql\n` +
               `    networks:\n` +
               `      - app-network\n`;

      case 'mongodb':
        return `  mongo:\n` +
               `    image: mongo:7\n` +
               `    environment:\n` +
               `      - MONGO_INITDB_DATABASE=database\n` +
               `    volumes:\n` +
               `      - db-data:/data/db\n` +
               `    networks:\n` +
               `      - app-network\n`;

      case 'redis':
        return `  redis:\n` +
               `    image: redis:7-alpine\n` +
               `    volumes:\n` +
               `      - db-data:/data\n` +
               `    networks:\n` +
               `      - app-network\n`;

      default:
        return '';
    }
  }

  async generateDockerIgnore(outputPath: string): Promise<void> {
    const dockerIgnoreContent = `node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

.git
.gitignore
README.md
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

.nyc_output
coverage
.coverage

.next/
.nuxt/
dist/
build/

.DS_Store
*.tgz
*.tar.gz

.vscode/
.idea/

*.log
logs/
*.pid
*.seed
*.pid.lock

.cache/
.temp/
.tmp/

# Testing
.jest/
cypress/videos/
cypress/screenshots/
test-results/
playwright-report/

# Database
*.sqlite
*.db

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
env.bak/
venv.bak/
.pytest_cache/
.coverage
htmlcov/

# PHP
vendor/
composer.lock
.phpunit.result.cache

# Java
target/
*.class
*.jar
*.war
*.ear

# Docker
Dockerfile*
docker-compose*
.dockerignore
`;

    const dockerIgnorePath = path.join(outputPath, '.dockerignore');
    await fs.writeFile(dockerIgnorePath, dockerIgnoreContent);
    console.log(`Docker ignore file generated at: ${dockerIgnorePath}`);
  }
}