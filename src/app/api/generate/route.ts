import { NextRequest, NextResponse } from 'next/server';
import { RepositoryManager } from '@/lib/git/repository-manager';
import { ProjectScanner } from '@/lib/scanner/project-scanner';
import { DockerfileGenerator } from '@/lib/generator/dockerfile-generator';
import { PipelineGenerator } from '@/lib/generator/pipeline-generator';
import path from 'path';

const repositoryManager = new RepositoryManager();
const projectScanner = new ProjectScanner();
const dockerfileGenerator = new DockerfileGenerator();
const pipelineGenerator = new PipelineGenerator();

export async function POST(request: NextRequest) {
  try {
    const { repositoryId, type, platform, preview = false } = await request.json();

    if (!repositoryId || !type) {
      return NextResponse.json(
        { error: 'Repository ID and type are required' },
        { status: 400 }
      );
    }

    const repository = repositoryManager.getRepository(repositoryId);
    if (!repository || !repository.localPath) {
      return NextResponse.json(
        { error: 'Repository not found or not cloned' },
        { status: 404 }
      );
    }

    const scanResult = await projectScanner.scanProject(repository.localPath);
    const outputPath = preview ? undefined : repository.localPath;

    let result: any = {};

    switch (type) {
      case 'dockerfile':
        const dockerfileContent = await dockerfileGenerator.generateDockerfile(scanResult, outputPath);
        const dockerComposeContent = await dockerfileGenerator.generateDockerCompose(scanResult, outputPath);
        
        if (!preview) {
          await dockerfileGenerator.generateDockerIgnore(repository.localPath);
        }
        
        result = {
          dockerfile: dockerfileContent,
          dockerCompose: dockerComposeContent,
          message: preview ? 'Dockerfile preview generated' : 'Docker files generated successfully'
        };
        break;

      case 'pipeline':
        if (!platform || !['github', 'gitlab'].includes(platform)) {
          return NextResponse.json(
            { error: 'Valid platform (github/gitlab) is required for pipeline generation' },
            { status: 400 }
          );
        }

        let pipelineContent: string;
        if (platform === 'github') {
          pipelineContent = await pipelineGenerator.generateGitHubActions(scanResult, outputPath);
        } else {
          pipelineContent = await pipelineGenerator.generateGitLabCI(scanResult, outputPath);
        }

        result = {
          pipeline: pipelineContent,
          platform,
          message: preview ? `${platform} pipeline preview generated` : `${platform} pipeline generated successfully`
        };
        break;

      case 'all':
        const dockerContent = await dockerfileGenerator.generateDockerfile(scanResult, outputPath);
        const composeContent = await dockerfileGenerator.generateDockerCompose(scanResult, outputPath);
        const githubContent = await pipelineGenerator.generateGitHubActions(scanResult, outputPath);
        const gitlabContent = await pipelineGenerator.generateGitLabCI(scanResult, outputPath);

        if (!preview) {
          await dockerfileGenerator.generateDockerIgnore(repository.localPath);
        }

        result = {
          dockerfile: dockerContent,
          dockerCompose: composeContent,
          githubPipeline: githubContent,
          gitlabPipeline: gitlabContent,
          message: preview ? 'All files preview generated' : 'All CI/CD files generated successfully'
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid generation type. Use: dockerfile, pipeline, or all' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate files' },
      { status: 500 }
    );
  }
}