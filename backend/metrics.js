/**
 * Metrics Tracking System
 * 
 * SRE Requirement: Track API response times, error rates, latency, memory/CPU utilization
 * Purpose: Monitor system health, identify performance bottlenecks, alert on issues
 * Output: JSON logs (parseable by CloudWatch), in-memory metrics for /api/metrics endpoint
 * 
 * Key Metrics:
 * 1. API Response Time (p50, p95, p99 percentiles)
 * 2. Error Rate (% of failed requests)
 * 3. Request Latency (time to first byte)
 * 4. Memory Utilization (heap usage)
 * 5. CPU Utilization (process CPU percentage)
 * 6. Concurrent Users (active user sessions)
 * 
 * Integration: Import and use in server.js as middleware
 */

// ==================== In-Memory Metrics Storage ====================
// Note: In production, these would be sent to CloudWatch, Prometheus, or Datadog
// For demo purposes, we keep last 1000 data points in memory

class MetricsCollector {
  constructor() {
    // Response time tracking
    this.responseTimes = []; // Array of {timestamp, duration, endpoint, statusCode}
    this.maxStoredSamples = 1000; // Keep last 1000 requests
    
    // Error tracking
    this.errorCount = 0;
    this.totalRequests = 0;
    
    // User tracking
    this.activeUsers = new Set(); // Set of unique userIds
    this.peakConcurrentUsers = 0;
    
    // System metrics (updated periodically)
    this.systemMetrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      lastUpdated: new Date()
    };
    
    // Start collecting system metrics every 30 seconds
    this.startSystemMetricsCollection();
  }
  
  // ==================== Response Time Tracking ====================
  
  /**
   * Record a request completion
   */
  recordRequest(data) {
    const { duration, endpoint, statusCode, userId, timestamp } = data;
    
    // Store response time
    this.responseTimes.push({
      timestamp: timestamp || new Date(),
      duration,
      endpoint,
      statusCode,
      userId
    });
    
    // Trim old data to prevent memory bloat
    if (this.responseTimes.length > this.maxStoredSamples) {
      this.responseTimes.shift(); // Remove oldest
    }
    
    // Track total requests
    this.totalRequests++;
    
    // Track errors (4xx and 5xx status codes)
    if (statusCode >= 400) {
      this.errorCount++;
    }
    
    // Track active users
    if (userId) {
      this.activeUsers.add(userId);
      
      // Update peak concurrent users
      if (this.activeUsers.size > this.peakConcurrentUsers) {
        this.peakConcurrentUsers = this.activeUsers.size;
      }
    }
  }
  
  /**
   * Calculate percentiles from response times
   * p50 (median): 50% of requests are faster
   * p95: 95% of requests are faster (useful for SLOs)
   * p99: 99% of requests are faster (catches outliers)
   */
  calculatePercentiles() {
    if (this.responseTimes.length === 0) {
      return { p50: 0, p95: 0, p99: 0, count: 0 };
    }
    
    // Sort by duration
    const sorted = this.responseTimes
      .map(r => r.duration)
      .sort((a, b) => a - b);
    
    const p50Index = Math.floor(sorted.length * 0.50);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    
    return {
      p50: sorted[p50Index] || 0,
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0,
      count: sorted.length,
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0
    };
  }
  
  /**
   * Calculate error rate
   * Returns percentage of failed requests
   */
  getErrorRate() {
    if (this.totalRequests === 0) return 0;
    return ((this.errorCount / this.totalRequests) * 100).toFixed(2);
  }
  
  /**
   * Get endpoint-specific metrics
   */
  getEndpointMetrics() {
    const endpointStats = {};
    
    this.responseTimes.forEach(req => {
      if (!endpointStats[req.endpoint]) {
        endpointStats[req.endpoint] = {
          count: 0,
          totalDuration: 0,
          errors: 0
        };
      }
      
      endpointStats[req.endpoint].count++;
      endpointStats[req.endpoint].totalDuration += req.duration;
      
      if (req.statusCode >= 400) {
        endpointStats[req.endpoint].errors++;
      }
    });
    
    // Calculate averages
    Object.keys(endpointStats).forEach(endpoint => {
      const stats = endpointStats[endpoint];
      stats.avgDuration = Math.round(stats.totalDuration / stats.count);
      stats.errorRate = ((stats.errors / stats.count) * 100).toFixed(2) + '%';
      delete stats.totalDuration; // Clean up
    });
    
    return endpointStats;
  }
  
  // ==================== System Metrics Collection ====================
  
  /**
   * Start periodic system metrics collection
   */
  startSystemMetricsCollection() {
    // Collect every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
    
    // Collect immediately on start
    this.collectSystemMetrics();
  }
  
  /**
   * Collect CPU and memory metrics
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.systemMetrics = {
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB (total memory)
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        usagePercent: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        // Note: CPU percentage requires comparing two samples over time
        // For simplicity, we store raw values here
      },
      uptime: process.uptime(),
      lastUpdated: new Date()
    };
    
    // MOCK: In production, send these to CloudWatch
    // await cloudwatch.putMetricData({
    //   Namespace: 'ZoomDemo',
    //   MetricData: [
    //     { MetricName: 'MemoryUtilization', Value: this.systemMetrics.memory.usagePercent },
    //     { MetricName: 'HeapUsed', Value: this.systemMetrics.memory.heapUsed },
    //   ]
    // });
  }
  
  // ==================== Active User Management ====================
  
  /**
   * Remove inactive users (cleanup)
   * Call this periodically to prevent set from growing indefinitely
   */
  cleanupInactiveUsers() {
    // MOCK: In production, track last activity timestamp
    // Remove users with no activity in last 5 minutes
    // For now, clear all after 10 minutes
    setTimeout(() => {
      this.activeUsers.clear();
    }, 600000); // 10 minutes
  }
  
  /**
   * Get current concurrent user count
   */
  getConcurrentUsers() {
    return this.activeUsers.size;
  }
  
  // ==================== Metrics Summary ====================
  
  /**
   * Get all metrics as a summary object
   */
  getSummary() {
    const percentiles = this.calculatePercentiles();
    
    return {
      timestamp: new Date().toISOString(),
      
      // API Performance
      api: {
        totalRequests: this.totalRequests,
        errorCount: this.errorCount,
        errorRate: this.getErrorRate() + '%',
        
        responseTime: {
          p50: percentiles.p50 + 'ms',
          p95: percentiles.p95 + 'ms',
          p99: percentiles.p99 + 'ms',
          min: percentiles.min + 'ms',
          max: percentiles.max + 'ms',
          sampleSize: percentiles.count
        },
        
        byEndpoint: this.getEndpointMetrics()
      },
      
      // User Metrics
      users: {
        current: this.getConcurrentUsers(),
        peak: this.peakConcurrentUsers,
        limit: 10, // Max concurrent users (from requirements)
        capacityUsed: ((this.getConcurrentUsers() / 10) * 100).toFixed(1) + '%'
      },
      
      // System Metrics
      system: this.systemMetrics,
      
      // SLO Tracking
      slo: {
        target: '99% uptime',
        responseTimeTarget: '<1000ms (p95)',
        responseTimeCurrent: percentiles.p95 + 'ms',
        responseTimeMet: percentiles.p95 < 1000,
        
        errorRateTarget: '<5%',
        errorRateCurrent: this.getErrorRate() + '%',
        errorRateMet: parseFloat(this.getErrorRate()) < 5
      }
    };
  }
  
  /**
   * Reset all metrics (useful for testing or new deployment)
   */
  reset() {
    this.responseTimes = [];
    this.errorCount = 0;
    this.totalRequests = 0;
    this.activeUsers.clear();
    this.peakConcurrentUsers = 0;
  }
}

// Create singleton instance
const metricsCollector = new MetricsCollector();

// ==================== Express Middleware ====================

/**
 * Metrics collection middleware
 * Attach this to Express app to automatically track all requests
 */
export function metricsMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Intercept response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    metricsCollector.recordRequest({
      timestamp: new Date(),
      duration: duration,
      endpoint: req.path,
      statusCode: res.statusCode,
      userId: req.params.userId || req.body?.userId || null
    });
    
    // MOCK: Alert if response is too slow (>1 second)
    if (duration > 1000) {
      console.warn(JSON.stringify({
        level: 'WARN',
        event: 'slow_request',
        duration: duration,
        endpoint: req.path,
        threshold: 1000
      }));
    }
    
    // MOCK: Alert if error rate is too high (>5%)
    const errorRate = parseFloat(metricsCollector.getErrorRate());
    if (errorRate > 5 && metricsCollector.totalRequests > 20) {
      console.warn(JSON.stringify({
        level: 'WARN',
        event: 'high_error_rate',
        errorRate: errorRate + '%',
        threshold: '5%',
        totalRequests: metricsCollector.totalRequests
      }));
    }
  });
  
  next();
}

/**
 * Metrics endpoint route handler
 * Add this as a route: app.get('/api/metrics', getMetricsHandler)
 */
export function getMetricsHandler(req, res) {
  try {
    const summary = metricsCollector.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
}

/**
 * MOCK: Send metrics to CloudWatch
 * In production, this would use AWS SDK
 */
export async function sendMetricsToCloudWatch() {
  const summary = metricsCollector.getSummary();
  
  console.log('[MOCK] Sending metrics to CloudWatch:', {
    namespace: 'ZoomDemo/Backend',
    metrics: {
      ApiResponseTimeP95: parseFloat(summary.api.responseTime.p95),
      ApiErrorRate: parseFloat(summary.api.errorRate),
      ConcurrentUsers: summary.users.current,
      MemoryUtilization: summary.system.memory.usagePercent
    }
  });
  
  // MOCK: AWS SDK call
  // await cloudwatch.putMetricData({ ... });
  
  return { success: true };
}

// Export singleton
export { metricsCollector };

// ==================== Usage Instructions ====================

/**
 * INTEGRATION EXAMPLE:
 * 
 * In server.js:
 * 
 * import { metricsMiddleware, getMetricsHandler, sendMetricsToCloudWatch } from './metrics.js';
 * 
 * // Add middleware to track all requests
 * app.use(metricsMiddleware);
 * 
 * // Add metrics endpoint
 * app.get('/api/metrics', getMetricsHandler);
 * 
 * // Optionally: Send to CloudWatch every 5 minutes
 * setInterval(sendMetricsToCloudWatch, 300000);
 * 
 * // View metrics:
 * http://localhost:3001/api/metrics
 */

