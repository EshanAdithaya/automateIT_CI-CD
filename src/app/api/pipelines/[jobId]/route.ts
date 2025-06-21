import { NextRequest, NextResponse } from 'next/server';
import { PipelineExecutor } from '@/lib/pipeline/pipeline-executor';

const pipelineExecutor = new PipelineExecutor();

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const job = pipelineExecutor.getJob(params.jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Pipeline job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error fetching pipeline job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const cancelled = await pipelineExecutor.cancelJob(params.jobId);
    
    if (!cancelled) {
      return NextResponse.json(
        { error: 'Job not found or cannot be cancelled' },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Pipeline job cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling pipeline job:', error);
    return NextResponse.json(
      { error: 'Failed to cancel pipeline job' },
      { status: 500 }
    );
  }
}