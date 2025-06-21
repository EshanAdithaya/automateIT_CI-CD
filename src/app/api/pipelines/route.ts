import { NextRequest, NextResponse } from 'next/server';
import { PipelineExecutor } from '@/lib/pipeline/pipeline-executor';
import { RepositoryManager } from '@/lib/git/repository-manager';
import { ProjectScanner } from '@/lib/scanner/project-scanner';

const pipelineExecutor = new PipelineExecutor();
const repositoryManager = new RepositoryManager();
const projectScanner = new ProjectScanner();

export async function GET() {
  try {
    const jobs = pipelineExecutor.getAllJobs();
    const queueStatus = pipelineExecutor.getQueueStatus();
    
    return NextResponse.json({
      jobs,
      queueStatus,
    });
  } catch (error) {
    console.error('Error fetching pipeline jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { repositoryId, trigger = 'manual' } = await request.json();

    if (!repositoryId) {
      return NextResponse.json(
        { error: 'Repository ID is required' },
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
    const jobId = await pipelineExecutor.createJob(repositoryId, repository.localPath, scanResult);

    return NextResponse.json({
      jobId,
      message: 'Pipeline job created successfully',
      trigger,
    });
  } catch (error) {
    console.error('Error creating pipeline job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create pipeline job' },
      { status: 500 }
    );
  }
}