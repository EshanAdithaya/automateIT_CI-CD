import { NextRequest, NextResponse } from 'next/server';
import { RepositoryManager } from '@/lib/git/repository-manager';
import { ProjectScanner } from '@/lib/scanner/project-scanner';
import { DockerfileGenerator } from '@/lib/generator/dockerfile-generator';
import { PipelineGenerator } from '@/lib/generator/pipeline-generator';

const repositoryManager = new RepositoryManager();
const projectScanner = new ProjectScanner();
const dockerfileGenerator = new DockerfileGenerator();
const pipelineGenerator = new PipelineGenerator();

export async function GET() {
  try {
    const repositories = repositoryManager.getAllRepositories();
    return NextResponse.json({ repositories });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { repositoryUrl, autoSetup = true } = await request.json();

    if (!repositoryUrl) {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    const repositoryState = await repositoryManager.addRepository(repositoryUrl);

    if (autoSetup && repositoryState.localPath) {
      const scanResult = await projectScanner.scanProject(repositoryState.localPath);
      
      repositoryState.projectType = scanResult.projectType;
      repositoryState.buildConfig = scanResult.buildConfig;
      repositoryState.detectedFrameworks = [scanResult.projectType.framework];

      if (!repositoryState.hasDockerfile) {
        await dockerfileGenerator.generateDockerfile(scanResult, repositoryState.localPath);
        await dockerfileGenerator.generateDockerIgnore(repositoryState.localPath);
        repositoryState.hasDockerfile = true;
      }

      await pipelineGenerator.generateGitHubActions(scanResult, repositoryState.localPath);
      await pipelineGenerator.generateGitLabCI(scanResult, repositoryState.localPath);

      console.log(`Auto-setup completed for ${repositoryState.repository.fullName}`);
    }

    return NextResponse.json({ 
      repository: repositoryState,
      message: autoSetup ? 'Repository added and auto-configured' : 'Repository added successfully'
    });
  } catch (error) {
    console.error('Error adding repository:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add repository' },
      { status: 500 }
    );
  }
}