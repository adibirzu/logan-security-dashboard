// Health Check API Route for Logan Security Dashboard
import { NextRequest, NextResponse } from 'next/server';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      error?: string;
    };
    memory: {
      status: 'healthy' | 'unhealthy';
      usage: number;
      limit: number;
    };
    disk: {
      status: 'healthy' | 'unhealthy';
      usage: number;
      available: number;
    };
    python: {
      status: 'healthy' | 'unhealthy';
      version?: string;
      error?: string;
    };
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: await checkDatabase(),
        memory: checkMemory(),
        disk: await checkDisk(),
        python: await checkPython(),
      },
    };

    // Determine overall health status
    const checkStatuses = Object.values(healthStatus.checks).map(check => check.status);
    
    if (checkStatuses.some(status => status === 'unhealthy')) {
      healthStatus.status = 'unhealthy';
    } else if (checkStatuses.some(status => status === 'degraded')) {
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(healthStatus, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check-Duration': `${Date.now() - startTime}ms`,
      },
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      uptime: process.uptime(),
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}

async function checkDatabase() {
  const startTime = Date.now();
  
  try {
    // Import database client dynamically to avoid initialization issues
    const { testOracleConnection } = await import('@/lib/database/oracle-client');
    
    const isConnected = await testOracleConnection();
    const responseTime = Date.now() - startTime;
    
    return {
      status: isConnected ? 'healthy' as const : 'unhealthy' as const,
      responseTime,
      ...(isConnected ? {} : { error: 'Database connection failed' }),
    };
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Database check failed',
    };
  }
}

function checkMemory() {
  try {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal + memUsage.external;
    const usedMemory = memUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    // Consider memory unhealthy if usage > 90%
    const status = memoryUsagePercent > 90 ? 'unhealthy' : 'healthy';
    
    return {
      status: status as 'healthy' | 'unhealthy',
      usage: Math.round(memoryUsagePercent),
      limit: totalMemory,
    };
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      usage: 0,
      limit: 0,
    };
  }
}

async function checkDisk() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const stats = await fs.promises.statfs(path.resolve('./'));
    const totalSpace = stats.blocks * stats.bavail;
    const freeSpace = stats.bavail * stats.bsize;
    const usedSpace = totalSpace - freeSpace;
    const diskUsagePercent = (usedSpace / totalSpace) * 100;
    
    // Consider disk unhealthy if usage > 90%
    const status = diskUsagePercent > 90 ? 'unhealthy' : 'healthy';
    
    return {
      status: status as 'healthy' | 'unhealthy',
      usage: Math.round(diskUsagePercent),
      available: freeSpace,
    };
  } catch (error) {
    // Fallback for environments where fs.statfs is not available
    return {
      status: 'healthy' as const,
      usage: 0,
      available: 0,
    };
  }
}

async function checkPython() {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const { stdout } = await execAsync(`${pythonPath} --version`);
    
    return {
      status: 'healthy' as const,
      version: stdout.trim(),
    };
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      error: error instanceof Error ? error.message : 'Python check failed',
    };
  }
}

// Support for HEAD requests (common for health checks)
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  try {
    // Quick health check without detailed status
    const isHealthy = await quickHealthCheck();
    
    return new NextResponse(null, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}

async function quickHealthCheck(): Promise<boolean> {
  try {
    // Basic checks for quick health verification
    const memUsage = process.memoryUsage();
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    // Return healthy if memory usage is reasonable
    return memoryUsagePercent < 95;
  } catch (error) {
    return false;
  }
}