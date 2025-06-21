import { NextRequest, NextResponse } from 'next/server';
import { ProjectScanner } from '@/lib/scanner/project-scanner';
import { DockerfileGenerator } from '@/lib/generator/dockerfile-generator';
import { PipelineGenerator } from '@/lib/generator/pipeline-generator';

const projectScanner = new ProjectScanner();
const dockerfileGenerator = new DockerfileGenerator();
const pipelineGenerator = new PipelineGenerator();

export async function POST(request: NextRequest) {
  try {
    const { projectPath, generatePreview = false } = await request.json();

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    const scanResult = await projectScanner.scanProject(projectPath);

    let preview = {};
    if (generatePreview) {
      try {
        const dockerfilePreview = await dockerfileGenerator.generateDockerfile(scanResult);
        const githubPreview = await pipelineGenerator.generateGitHubActions(scanResult);
        const gitlabPreview = await pipelineGenerator.generateGitLabCI(scanResult);

        preview = {
          dockerfile: dockerfilePreview,
          githubPipeline: githubPreview,
          gitlabPipeline: gitlabPreview,
        };
      } catch (error) {
        console.error('Error generating preview:', error);
      }
    }

    return NextResponse.json({
      scanResult,
      preview,
      recommendations: generateRecommendations(scanResult),
    });
  } catch (error) {
    console.error('Error scanning project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scan project' },
      { status: 500 }
    );
  }
}

function generateRecommendations(scanResult: any): string[] {
  const recommendations: string[] = [];

  if (!scanResult.hasTests) {
    recommendations.push('Consider adding tests to improve code quality and CI/CD reliability');
  }

  if (!scanResult.hasDocker) {
    recommendations.push('Docker configuration would enable consistent deployments across environments');
  }

  if (!scanResult.hasGitHubActions && !scanResult.hasGitLabCI) {
    recommendations.push('Set up CI/CD pipeline to automate testing and deployment');
  }

  if (scanResult.estimatedBuildTime > 600) {
    recommendations.push('Build time is high - consider optimizing dependencies and build process');
  }

  if (scanResult.dependencies.length > 50) {
    recommendations.push('Large number of dependencies detected - consider auditing for unused packages');
  }

  if (scanResult.projectType.hasDatabase && !scanResult.hasDocker) {
    recommendations.push('Database detected - Docker Compose would help manage database dependencies');
  }

  if (scanResult.projectType.type === 'frontend' && !scanResult.buildConfig.buildCommand) {
    recommendations.push('No build command detected - consider setting up a build process for production');
  }

  if (scanResult.projectType.language === 'javascript' && !scanResult.dependencies.includes('typescript')) {
    recommendations.push('Consider migrating to TypeScript for better type safety and developer experience');
  }

  return recommendations;
}