import { NextRequest, NextResponse } from 'next/server';
import { RepositoryManager } from '@/lib/git/repository-manager';
import { ProjectScanner } from '@/lib/scanner/project-scanner';

const repositoryManager = new RepositoryManager();
const projectScanner = new ProjectScanner();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const repository = repositoryManager.getRepository(params.id);
    
    if (!repository) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    let scanResult;
    if (repository.localPath) {
      try {
        scanResult = await projectScanner.scanProject(repository.localPath);
      } catch (error) {
        console.error('Error scanning repository:', error);
      }
    }

    return NextResponse.json({ repository, scanResult });
  } catch (error) {
    console.error('Error fetching repository:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repository' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await repositoryManager.removeRepository(params.id);
    return NextResponse.json({ message: 'Repository removed successfully' });
  } catch (error) {
    console.error('Error removing repository:', error);
    return NextResponse.json(
      { error: 'Failed to remove repository' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'start_monitoring':
        await repositoryManager.startMonitoring(params.id);
        return NextResponse.json({ message: 'Monitoring started' });
        
      case 'stop_monitoring':
        await repositoryManager.stopMonitoring(params.id);
        return NextResponse.json({ message: 'Monitoring stopped' });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error updating repository:', error);
    return NextResponse.json(
      { error: 'Failed to update repository' },
      { status: 500 }
    );
  }
}