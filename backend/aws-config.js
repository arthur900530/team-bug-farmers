/**
 * AWS Deployment Configuration (SKELETON)
 * 
 * SRE Requirements from stakeholder:
 * 1. Prioritize COST first (AWS Free Tier, t2.micro EC2)
 * 2. Then UPTIME (99% SLO = ~7 hours downtime/month acceptable)
 * 3. Then LATENCY (must not impact video/audio quality, <5% packet loss for 10 users)
 * 
 * Deployment Strategy: On-demand (demo-focused, not 24/7)
 * Budget: $100-200 over 6 months (~$16-33/month)
 * Scale: Maximum 10 concurrent users
 * 
 * Recommended AWS Architecture:
 * - Service: AWS Elastic Beanstalk (simplest management) OR single EC2 t2.micro
 * - Instance: t2.micro (1 vCPU, 1GB RAM) - FREE TIER eligible
 * - Database: SQLite on instance (no RDS cost, simple for demo)
 * - Storage: EBS 8GB (FREE TIER eligible)
 * - Network: <750 hours/month EC2 runtime (FREE TIER)
 * - Region: us-east-1 (cheapest, closest to most users)
 */

// ==================== AWS Configuration ====================

export const AWS_CONFIG = {
  // Region selection
  // us-east-1: Cheapest, largest free tier, best for demos
  region: 'us-east-1',
  
  // Compute configuration
  compute: {
    // Instance type - t2.micro is FREE TIER eligible
    // 1 vCPU, 1GB RAM - sufficient for 10 concurrent users with SQLite
    instanceType: 't2.micro',
    
    // Free tier: 750 hours/month = ~31 days continuous OR on-demand usage
    // For demo purposes: Start before demo, stop after
    expectedMonthlyHours: 100, // ~3-4 hours per demo session * 25 demos
    
    // Auto-scaling (MOCK - not needed for 10 users, but skeleton for future)
    autoScaling: {
      enabled: false, // Disabled to save cost
      minInstances: 1,
      maxInstances: 1, // Single instance sufficient for 10 users
      targetCPUUtilization: 70, // Scale if CPU > 70% (not used currently)
    },
    
    // Health check configuration
    healthCheck: {
      endpoint: '/api/health',
      interval: 30, // Check every 30 seconds
      timeout: 5,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
    }
  },
  
  // Network configuration
  network: {
    // Single availability zone to save cost (99% SLO acceptable)
    availabilityZones: ['us-east-1a'],
    multiAZ: false, // Would cost extra, not needed for demo
    
    // Bandwidth expectations
    // 10 users * ~1.5 Mbps per user (audio+video) = ~15 Mbps total
    // AWS Free Tier: 15GB data transfer out/month
    expectedBandwidth: {
      perUser: '1.5 Mbps',
      total: '15 Mbps',
      dataTransferOut: '10 GB/month' // Well within free tier 15GB
    },
    
    // Packet loss requirement: <5% for acceptable Zoom quality
    // This is primarily dependent on user's network, not AWS
    maxAcceptablePacketLoss: 0.05, // 5%
  },
  
  // Storage configuration
  storage: {
    // EBS volume for OS + application + SQLite database
    volumeSize: 8, // GB - FREE TIER eligible (up to 30GB)
    volumeType: 'gp2', // General Purpose SSD
    
    // SQLite database size estimation
    // Each user state: ~200 bytes
    // 10 users * 200 bytes = 2KB (negligible)
    estimatedDatabaseSize: '1 MB',
  },
  
  // Monitoring & Logging
  monitoring: {
    // CloudWatch metrics (FREE TIER: 10 custom metrics)
    enableCloudWatch: true,
    metrics: [
      'CPUUtilization',      // Track CPU usage
      'MemoryUtilization',   // Track memory usage
      'NetworkIn',           // Track incoming bandwidth
      'NetworkOut',          // Track outgoing bandwidth (important for video)
      'StatusCheckFailed',   // Instance health
      'api_response_time',   // Custom metric from our app
      'api_error_rate',      // Custom metric from our app
      'concurrent_users',    // Custom metric from our app
    ],
    
    // CloudWatch Logs (FREE TIER: 5GB ingestion, 5GB storage)
    logRetention: 7, // days - keep logs for 1 week
    
    // Alarms (FREE TIER: 10 alarms)
    alarms: {
      highCPU: {
        threshold: 80, // Alert if CPU > 80%
        period: 300, // 5 minutes
        evaluationPeriods: 2,
        action: 'EMAIL' // MOCK: Would send to team@example.com
      },
      highMemory: {
        threshold: 85, // Alert if memory > 85%
        period: 300,
        evaluationPeriods: 2,
        action: 'EMAIL'
      },
      apiErrors: {
        threshold: 10, // Alert if >10 errors in 5 minutes
        period: 300,
        evaluationPeriods: 1,
        action: 'EMAIL'
      },
      instanceDown: {
        // Alert if health check fails
        action: 'EMAIL'
      }
    }
  },
  
  // Backup configuration (S3)
  backup: {
    // MOCK: S3 for database backups (FREE TIER: 5GB storage, 20K PUT requests)
    enabled: false, // Disabled for demo - can be enabled later
    bucket: 'zoom-demo-backups-dev', // S3 bucket name (must be globally unique)
    schedule: '0 3 * * *', // Daily at 3 AM UTC (cron format)
    retention: 7, // Keep last 7 daily backups
    estimatedCost: '$0.02/month', // 7 backups * 1MB each = 7MB in S3
  },
  
  // Security configuration
  security: {
    // Security group rules
    inboundRules: [
      { port: 3001, protocol: 'tcp', source: '0.0.0.0/0', description: 'API access' },
      { port: 22, protocol: 'tcp', source: 'YOUR_IP/32', description: 'SSH for team' }
    ],
    
    // HTTPS/SSL (MOCK - would use Let's Encrypt for free SSL)
    enableHTTPS: false, // For demo, HTTP is acceptable
    certificate: null, // Would be AWS Certificate Manager (free)
    
    // IAM roles (MOCK)
    instanceRole: 'ZoomDemoBackendRole',
    permissions: [
      'cloudwatch:PutMetricData', // Send metrics to CloudWatch
      'logs:CreateLogStream',     // Write logs
      'logs:PutLogEvents',        // Write logs
      's3:PutObject',            // Backup to S3 (if enabled)
    ]
  },
  
  // Cost estimation
  costEstimation: {
    // Monthly cost breakdown
    compute: '$0 (Free Tier: 750 hours t2.micro)',
    storage: '$0 (Free Tier: 30GB EBS)',
    dataTransfer: '$0 (Free Tier: 15GB out)',
    cloudWatch: '$0 (Free Tier: 10 metrics, 10 alarms)',
    s3: '$0 (Free Tier: 5GB, backups disabled)',
    
    totalEstimated: '$0-5/month',
    freeCreditsUsed: '$150-200 over 6 months',
    
    // Cost alerts (MOCK)
    budgetAlert: {
      threshold: '$10/month',
      action: 'EMAIL'
    }
  }
};

// ==================== Deployment Functions (MOCK) ====================

/**
 * MOCK: Initialize AWS infrastructure
 * In production, this would use AWS SDK or Terraform/CloudFormation
 */
export async function initializeAWSInfrastructure() {
  console.log('🚀 [MOCK] Initializing AWS infrastructure...');
  console.log('Region:', AWS_CONFIG.region);
  console.log('Instance Type:', AWS_CONFIG.compute.instanceType);
  console.log('Estimated Cost:', AWS_CONFIG.costEstimation.totalEstimated);
  
  // MOCK: Would create EC2 instance, security groups, IAM roles, etc.
  return {
    success: true,
    instanceId: 'i-mock-12345',
    publicIP: '0.0.0.0',
    endpoint: 'http://ec2-0-0-0-0.compute-1.amazonaws.com:3001'
  };
}

/**
 * MOCK: Deploy application to AWS
 */
export async function deployToAWS(version) {
  console.log(`🚀 [MOCK] Deploying version ${version} to AWS...`);
  
  // MOCK: Would SSH to instance, pull from Git, restart service
  return {
    success: true,
    version: version,
    deployedAt: new Date().toISOString()
  };
}

/**
 * MOCK: Get current metrics from CloudWatch
 */
export async function getMetrics() {
  console.log('📊 [MOCK] Fetching CloudWatch metrics...');
  
  // MOCK: Would call CloudWatch API
  return {
    cpuUtilization: Math.random() * 100,
    memoryUtilization: Math.random() * 100,
    apiResponseTime: Math.random() * 1000,
    errorRate: Math.random() * 5,
    concurrentUsers: Math.floor(Math.random() * 10)
  };
}

/**
 * MOCK: Check if instance is healthy
 */
export async function checkInstanceHealth() {
  console.log('❤️ [MOCK] Checking instance health...');
  
  // MOCK: Would call AWS API and our /api/health endpoint
  return {
    healthy: true,
    cpuOk: true,
    memoryOk: true,
    diskOk: true,
    applicationOk: true
  };
}

// ==================== Usage Instructions ====================

/**
 * TO DEPLOY TO AWS (Manual for now):
 * 
 * 1. Create EC2 instance:
 *    - Go to AWS Console → EC2
 *    - Launch t2.micro instance (FREE TIER)
 *    - Select Amazon Linux 2023
 *    - Configure security group (port 3001, port 22)
 * 
 * 2. Connect via SSH:
 *    ssh -i your-key.pem ec2-user@YOUR-INSTANCE-IP
 * 
 * 3. Install Node.js:
 *    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
 *    source ~/.bashrc
 *    nvm install 18
 * 
 * 4. Clone and deploy:
 *    git clone https://github.com/arthur900530/team-bug-farmers.git
 *    cd team-bug-farmers/backend
 *    npm install --production
 *    npm start
 * 
 * 5. Set up as service (systemd):
 *    See DEPLOYMENT_RUNBOOK.md
 * 
 * 6. Access application:
 *    http://YOUR-INSTANCE-IP:3001/api/health
 */

