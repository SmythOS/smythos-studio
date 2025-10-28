/* eslint-disable no-console */
/**
 * Performance Monitoring Utility for Chat Streaming
 *
 * PRODUCTION-SAFE monitoring tool that helps identify bottlenecks in:
 * - Network latency (server response time)
 * - Chunk processing time
 * - UI render time
 *
 * Features:
 * - Zero performance impact when disabled
 * - Automatic memory cleanup
 * - Type-safe implementation
 * - ESLint compliant
 *
 * Usage:
 * 1. Enable via localStorage: localStorage.setItem('CHAT_DEBUG_MODE', 'true')
 * 2. Check console for detailed metrics
 * 3. Use window.chatDebug.metrics() to analyze performance
 *
 * @example
 * // Enable monitoring
 * window.chatDebug.enable();
 *
 * // After chat stream completes
 * const metrics = window.chatDebug.metrics();
 * console.log(metrics);
 */

/**
 * Represents a single chunk's performance metrics
 */
interface ChunkMetric {
  timestamp: number; // High-resolution timestamp when chunk was received
  chunkIndex: number; // Sequential index of this chunk in the stream
  networkTime?: number; // Time elapsed since previous chunk (milliseconds)
  processingTime?: number; // Time spent processing/parsing the chunk (milliseconds)
  renderTime?: number; // Time spent rendering the chunk in UI (milliseconds)
  chunkSize: number; // Size of chunk data in bytes
  type: 'content' | 'thinking' | 'tool' | 'debug'; // Type of content in this chunk
}

/**
 * Aggregated performance metrics for an entire stream
 */
interface PerformanceMetrics {
  totalChunks: number; // Total number of chunks received
  averageNetworkTime: number; // Average time between chunks (milliseconds)
  averageProcessingTime: number; // Average processing time per chunk (milliseconds)
  averageRenderTime: number; // Average render time per chunk (milliseconds)
  totalDuration: number; // Total stream duration (milliseconds)
  slowestChunk: ChunkMetric | null; // Chunk with highest total latency
  chunksPerSecond: number; // Throughput in chunks per second
}

/**
 * Global debug interface exposed on window object
 */
interface ChatDebugInterface {
  enable: () => void; // Enable performance monitoring
  disable: () => void; // Disable performance monitoring
  metrics: () => PerformanceMetrics; // Get current performance metrics
}

/**
 * Extend Window interface with chatDebug property
 */
declare global {
  interface Window {
    chatDebug: ChatDebugInterface;
  }
}

/**
 * Maximum number of chunks to track before cleanup
 * Prevents memory issues in very long sessions
 */
const MAX_METRICS_SIZE = 10000;

class PerformanceMonitor {
  private enabled: boolean = false;
  private metrics: ChunkMetric[] = [];
  private streamStartTime: number = 0;
  private lastChunkTime: number = 0;
  private chunkIndex: number = 0;

  constructor() {
    // Check if debug mode is enabled
    this.enabled =
      typeof window !== 'undefined' && localStorage.getItem('CHAT_DEBUG_MODE') === 'true';
  }

  /**
   * Safe console logging wrapper
   * Only logs when monitoring is enabled
   */
  private log(...args: unknown[]): void {
    if (this.enabled && typeof console !== 'undefined') console.log(...args);
  }

  /**
   * Safe console warning wrapper
   */
  private warn(...args: unknown[]): void {
    if (this.enabled && typeof console !== 'undefined') console.warn(...args);
  }

  /**
   * Safe console error wrapper
   */
  private error(...args: unknown[]): void {
    if (this.enabled && typeof console !== 'undefined') console.error(...args);
  }

  /**
   * Cleanup old metrics to prevent memory bloat
   */
  private cleanupOldMetrics(): void {
    if (this.metrics.length > MAX_METRICS_SIZE) {
      // Keep only the most recent 1000 metrics
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Starts monitoring a new stream
   */
  startStream(): void {
    if (!this.enabled) return;

    this.streamStartTime = performance.now();
    this.lastChunkTime = this.streamStartTime;
    this.chunkIndex = 0;
    this.metrics = [];

    this.log('%c🚀 STREAM STARTED', 'color: #00ff00; font-weight: bold; font-size: 14px');
    this.log(`⏱️  Start Time: ${new Date().toISOString()}`);
  }

  /**
   * Records when a chunk arrives from network
   * @param chunkData - Raw chunk data received
   * @param type - Type of chunk content
   */
  recordChunkArrival(chunkData: string, type: ChunkMetric['type'] = 'content'): void {
    if (!this.enabled) return;

    const now = performance.now();
    const networkTime = now - this.lastChunkTime;

    const metric: ChunkMetric = {
      timestamp: now,
      chunkIndex: this.chunkIndex++,
      networkTime,
      chunkSize: new Blob([chunkData]).size,
      type,
    };

    this.metrics.push(metric);
    this.lastChunkTime = now;

    // Cleanup if metrics array is getting too large
    this.cleanupOldMetrics();

    // Log if chunk took too long (> 100ms is suspicious)
    if (networkTime > 100) {
      this.warn(
        `⚠️  SLOW CHUNK #${metric.chunkIndex}: ${networkTime.toFixed(2)}ms (${metric.chunkSize} bytes)`,
        `Type: ${type}`,
      );
    }
  }

  /**
   * Records chunk processing time
   * @param chunkIndex - Index of the chunk being processed
   * @param processingTime - Time taken to process in milliseconds
   */
  recordProcessingTime(chunkIndex: number, processingTime: number): void {
    if (!this.enabled) return;

    const metric = this.metrics.find((m) => m.chunkIndex === chunkIndex);
    if (metric) {
      metric.processingTime = processingTime;

      if (processingTime > 50) {
        this.warn(`⚠️  SLOW PROCESSING #${chunkIndex}: ${processingTime.toFixed(2)}ms`);
      }
    }
  }

  /**
   * Records UI render time
   * @param renderTime - Time taken to render in milliseconds
   */
  recordRenderTime(renderTime: number): void {
    if (!this.enabled) return;

    const lastMetric = this.metrics[this.metrics.length - 1];
    if (lastMetric) {
      lastMetric.renderTime = renderTime;

      if (renderTime > 16.67) {
        // More than 1 frame at 60fps
        this.warn(
          `⚠️  SLOW RENDER #${lastMetric.chunkIndex}: ${renderTime.toFixed(2)}ms (dropped frames!)`,
        );
      }
    }
  }

  /**
   * Ends stream and shows summary
   * Displays comprehensive performance report in console
   */
  endStream(): void {
    if (!this.enabled) return;

    const totalDuration = performance.now() - this.streamStartTime;
    const metrics = this.getMetrics();

    this.log('%c✅ STREAM COMPLETED', 'color: #00ff00; font-weight: bold; font-size: 14px');
    this.log(`⏱️  Total Duration: ${totalDuration.toFixed(2)}ms`);
    this.log(`📦 Total Chunks: ${metrics.totalChunks}`);
    this.log(`⚡ Chunks/Second: ${metrics.chunksPerSecond.toFixed(2)}`);
    this.log('\n📊 PERFORMANCE BREAKDOWN:');
    this.log(`  🌐 Network (avg): ${metrics.averageNetworkTime.toFixed(2)}ms`);
    this.log(`  ⚙️  Processing (avg): ${metrics.averageProcessingTime.toFixed(2)}ms`);
    this.log(`  🎨 Rendering (avg): ${metrics.averageRenderTime.toFixed(2)}ms`);

    if (metrics.slowestChunk) {
      this.log('\n🐌 SLOWEST CHUNK:');
      this.log(`  Index: #${metrics.slowestChunk.chunkIndex}`);
      this.log(`  Network: ${metrics.slowestChunk.networkTime?.toFixed(2)}ms`);
      this.log(`  Processing: ${metrics.slowestChunk.processingTime?.toFixed(2)}ms`);
      this.log(`  Render: ${metrics.slowestChunk.renderTime?.toFixed(2)}ms`);
      this.log(`  Size: ${metrics.slowestChunk.chunkSize} bytes`);
    }

    // Identify bottleneck
    this.identifyBottleneck(metrics);
  }

  /**
   * Analyzes metrics and identifies the bottleneck
   * @param metrics - Performance metrics to analyze
   */
  private identifyBottleneck(metrics: PerformanceMetrics): void {
    const { averageNetworkTime, averageProcessingTime, averageRenderTime } = metrics;

    this.log('\n🎯 BOTTLENECK ANALYSIS:');

    if (averageNetworkTime > 50) {
      this.error(
        '❌ SERVER/NETWORK BOTTLENECK DETECTED!',
        `\n   Average network time: ${averageNetworkTime.toFixed(2)}ms`,
        '\n   ➡️  Issue: Chunks are arriving slowly from server',
        '\n   ➡️  Check: Server processing time, network latency, concurrent calls',
      );
    }

    if (averageProcessingTime > 30) {
      this.error(
        '❌ CHUNK PROCESSING BOTTLENECK DETECTED!',
        `\n   Average processing time: ${averageProcessingTime.toFixed(2)}ms`,
        '\n   ➡️  Issue: Parsing/processing chunks is slow',
        '\n   ➡️  Check: JSON parsing, string operations, regex patterns',
      );
    }

    if (averageRenderTime > 16.67) {
      this.error(
        '❌ UI RENDERING BOTTLENECK DETECTED!',
        `\n   Average render time: ${averageRenderTime.toFixed(2)}ms`,
        '\n   ➡️  Issue: UI updates are slow (dropping frames)',
        '\n   ➡️  Check: Component re-renders, DOM operations, React memoization',
      );
    }

    if (averageNetworkTime <= 50 && averageProcessingTime <= 30 && averageRenderTime <= 16.67) {
      this.log('✅ NO BOTTLENECKS DETECTED! Performance is optimal.');
    }
  }

  /**
   * Gets computed metrics
   */
  getMetrics(): PerformanceMetrics {
    const totalChunks = this.metrics.length;

    if (totalChunks === 0) {
      return {
        totalChunks: 0,
        averageNetworkTime: 0,
        averageProcessingTime: 0,
        averageRenderTime: 0,
        totalDuration: 0,
        slowestChunk: null,
        chunksPerSecond: 0,
      };
    }

    const totalDuration = performance.now() - this.streamStartTime;

    // Calculate averages
    const networkTimes = this.metrics.map((m) => m.networkTime || 0).filter((t) => t > 0);
    const processingTimes = this.metrics.map((m) => m.processingTime || 0).filter((t) => t > 0);
    const renderTimes = this.metrics.map((m) => m.renderTime || 0).filter((t) => t > 0);

    const averageNetworkTime =
      networkTimes.length > 0 ? networkTimes.reduce((a, b) => a + b, 0) / networkTimes.length : 0;
    const averageProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0;
    const averageRenderTime =
      renderTimes.length > 0 ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length : 0;

    // Find slowest chunk (by total time)
    const slowestChunk = this.metrics.reduce((slowest, current) => {
      const currentTotal =
        (current.networkTime || 0) + (current.processingTime || 0) + (current.renderTime || 0);
      const slowestTotal =
        (slowest.networkTime || 0) + (slowest.processingTime || 0) + (slowest.renderTime || 0);

      return currentTotal > slowestTotal ? current : slowest;
    }, this.metrics[0]);

    return {
      totalChunks,
      averageNetworkTime,
      averageProcessingTime,
      averageRenderTime,
      totalDuration,
      slowestChunk,
      chunksPerSecond: (totalChunks / totalDuration) * 1000,
    };
  }

  /**
   * Enables debug mode
   * Persists setting to localStorage
   */
  enable(): void {
    this.enabled = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('CHAT_DEBUG_MODE', 'true');
    }
    this.log('✅ Performance monitoring enabled');
  }

  /**
   * Disables debug mode
   * Removes setting from localStorage
   */
  disable(): void {
    this.enabled = false;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('CHAT_DEBUG_MODE');
    }
    this.log('❌ Performance monitoring disabled');
  }

  /**
   * Checks if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * Singleton instance of PerformanceMonitor
 * Single instance ensures consistent tracking across the application
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Initialize global debug interface for browser console access
 * Safely attaches to window object with proper TypeScript typing
 *
 * Usage in browser console:
 * - window.chatDebug.enable() - Enable monitoring
 * - window.chatDebug.disable() - Disable monitoring
 * - window.chatDebug.metrics() - Get current metrics
 */
if (typeof window !== 'undefined') {
  window.chatDebug = {
    enable: () => performanceMonitor.enable(),
    disable: () => performanceMonitor.disable(),
    metrics: () => performanceMonitor.getMetrics(),
  };
}
