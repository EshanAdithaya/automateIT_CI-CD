import { spawn, ChildProcess } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { ScanResult } from '@/lib/scanner/project-scanner';
import { EventEmitter } from 'events';

export interface PipelineJob {
  id: string;
  repositoryId: string;
  repositoryPath: string;
  scanResult: ScanResult;
  stages: PipelineStage[];
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  logs: PipelineLog[];
}

export interface PipelineStage {
  name: string;
  steps: PipelineStep[];
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
}

export interface PipelineStep {
  name: string;
  command: string;
  workingDirectory?: string;
  timeout?: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  output?: string;
  error?: string;
  exitCode?: number;
}

export interface PipelineLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  stage: string;
  step: string;
  message: string;
}

export class PipelineExecutor extends EventEmitter {
  private jobs: Map<string, PipelineJob> = new Map();
  private runningJobs: Set<string> = new Set();
  private maxConcurrentJobs: number = 3;

  constructor() {
    super();
  }

  async createJob(repositoryId: string, repositoryPath: string, scanResult: ScanResult): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stages = this.generateStages(scanResult);
    
    const job: PipelineJob = {
      id: jobId,
      repositoryId,
      repositoryPath,
      scanResult,
      stages,
      status: 'queued',
      logs: [],
    };

    this.jobs.set(jobId, job);
    this.emit('jobCreated', job);

    this.processQueue();
    
    return jobId;
  }

  private generateStages(scanResult: ScanResult): PipelineStage[] {
    const stages: PipelineStage[] = [];

    // Setup stage
    stages.push({
      name: 'setup',
      status: 'pending',
      steps: [
        {
          name: 'Install Dependencies',
          command: scanResult.buildConfig.installCommand,
          status: 'pending',
          timeout: 300000, // 5 minutes
        },
      ],
    });

    // Lint stage
    if (scanResult.projectType.language === 'javascript' || scanResult.projectType.language === 'typescript') {
      stages.push({
        name: 'lint',
        status: 'pending',
        steps: [
          {
            name: 'Run Linter',
            command: 'npm run lint || npx eslint . --ext .js,.jsx,.ts,.tsx',
            status: 'pending',
            timeout: 120000, // 2 minutes
          },
        ],
      });
    }

    // Test stage
    if (scanResult.hasTests) {
      stages.push({
        name: 'test',
        status: 'pending',
        steps: [
          {
            name: 'Run Tests',
            command: scanResult.buildConfig.testCommand,
            status: 'pending',
            timeout: 600000, // 10 minutes
          },
        ],
      });
    }

    // Security scan stage
    stages.push({
      name: 'security',
      status: 'pending',
      steps: [
        {
          name: 'Audit Dependencies',
          command: this.getAuditCommand(scanResult.projectType.packageManager),
          status: 'pending',
          timeout: 180000, // 3 minutes
        },
      ],
    });

    // Build stage
    if (scanResult.buildConfig.buildCommand) {
      stages.push({
        name: 'build',
        status: 'pending',
        steps: [
          {
            name: 'Build Project',
            command: scanResult.buildConfig.buildCommand,
            status: 'pending',
            timeout: 900000, // 15 minutes
          },
        ],
      });
    }

    // Docker stage
    if (scanResult.hasDocker || scanResult.projectType.type !== 'library') {
      stages.push({
        name: 'docker',
        status: 'pending',
        steps: [
          {
            name: 'Build Docker Image',
            command: 'docker build -t temp-image:latest .',
            status: 'pending',
            timeout: 1200000, // 20 minutes
          },
        ],
      });
    }

    return stages;
  }

  private getAuditCommand(packageManager: string): string {
    switch (packageManager) {
      case 'yarn':
        return 'yarn audit';
      case 'pnpm':
        return 'pnpm audit';
      case 'pip':
        return 'pip-audit || echo "pip-audit not installed, skipping"';
      default:
        return 'npm audit';
    }
  }

  private async processQueue(): Promise<void> {
    if (this.runningJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    const queuedJobs = Array.from(this.jobs.values()).filter(job => job.status === 'queued');
    
    for (const job of queuedJobs) {
      if (this.runningJobs.size >= this.maxConcurrentJobs) {
        break;
      }
      
      this.executeJob(job);
    }
  }

  private async executeJob(job: PipelineJob): Promise<void> {
    this.runningJobs.add(job.id);
    job.status = 'running';
    job.startTime = new Date();

    this.addLog(job, 'info', 'pipeline', 'start', `Pipeline started for ${job.repositoryId}`);
    this.emit('jobStarted', job);

    try {
      for (const stage of job.stages) {
        stage.status = 'running';
        stage.startTime = new Date();
        
        this.addLog(job, 'info', stage.name, 'start', `Stage ${stage.name} started`);
        this.emit('stageStarted', job, stage);

        let stageSuccess = true;

        for (const step of stage.steps) {
          step.status = 'running';
          
          this.addLog(job, 'info', stage.name, step.name, `Step ${step.name} started`);
          this.emit('stepStarted', job, stage, step);

          try {
            const result = await this.executeStep(job, step);
            
            if (result.exitCode === 0) {
              step.status = 'success';
              step.output = result.stdout;
              this.addLog(job, 'info', stage.name, step.name, `Step ${step.name} completed successfully`);
            } else {
              step.status = 'failed';
              step.error = result.stderr;
              step.exitCode = result.exitCode;
              stageSuccess = false;
              this.addLog(job, 'error', stage.name, step.name, `Step ${step.name} failed with exit code ${result.exitCode}`);
              break;
            }
          } catch (error) {
            step.status = 'failed';
            step.error = error instanceof Error ? error.message : 'Unknown error';
            stageSuccess = false;
            this.addLog(job, 'error', stage.name, step.name, `Step ${step.name} failed: ${step.error}`);
            break;
          }

          this.emit('stepCompleted', job, stage, step);
        }

        stage.endTime = new Date();
        stage.status = stageSuccess ? 'success' : 'failed';
        
        this.addLog(job, stageSuccess ? 'info' : 'error', stage.name, 'end', 
          `Stage ${stage.name} ${stageSuccess ? 'completed' : 'failed'}`);
        this.emit('stageCompleted', job, stage);

        if (!stageSuccess) {
          job.status = 'failed';
          break;
        }
      }

      if (job.status === 'running') {
        job.status = 'success';
        this.addLog(job, 'info', 'pipeline', 'end', 'Pipeline completed successfully');
      }
    } catch (error) {
      job.status = 'failed';
      this.addLog(job, 'error', 'pipeline', 'error', 
        `Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    job.endTime = new Date();
    this.runningJobs.delete(job.id);
    this.emit('jobCompleted', job);

    this.processQueue();
  }

  private async executeStep(job: PipelineJob, step: PipelineStep): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return new Promise((resolve, reject) => {
      const workingDir = step.workingDirectory || job.repositoryPath;
      const [command, ...args] = step.command.split(' ');

      const child = spawn(command, args, {
        cwd: workingDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        this.addLog(job, 'info', 'output', step.name, output.trim());
      });

      child.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        this.addLog(job, 'warn', 'output', step.name, output.trim());
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Step ${step.name} timed out after ${step.timeout}ms`));
      }, step.timeout || 300000);

      child.on('close', (code) => {
        clearTimeout(timeout);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private addLog(job: PipelineJob, level: 'info' | 'warn' | 'error', stage: string, step: string, message: string): void {
    const log: PipelineLog = {
      timestamp: new Date(),
      level,
      stage,
      step,
      message,
    };

    job.logs.push(log);
    this.emit('log', job, log);
  }

  getJob(jobId: string): PipelineJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): PipelineJob[] {
    return Array.from(this.jobs.values());
  }

  getJobsByRepository(repositoryId: string): PipelineJob[] {
    return Array.from(this.jobs.values()).filter(job => job.repositoryId === repositoryId);
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'running') {
      job.status = 'cancelled';
      this.runningJobs.delete(jobId);
      this.addLog(job, 'warn', 'pipeline', 'cancelled', 'Pipeline was cancelled');
      this.emit('jobCancelled', job);
      return true;
    }

    return false;
  }

  getQueueStatus(): {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
  } {
    const jobs = Array.from(this.jobs.values());
    
    return {
      total: jobs.length,
      queued: jobs.filter(j => j.status === 'queued').length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'success').length,
      failed: jobs.filter(j => j.status === 'failed').length,
    };
  }
}