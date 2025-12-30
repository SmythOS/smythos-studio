/**
 * Represents a single chunk's performance metrics
 */
export type TChunkMetric = {
  /** High-resolution timestamp when chunk was received */
  timestamp: number;
  /** Sequential index of this chunk in the stream */
  chunkIndex: number;
  /** Time elapsed since previous chunk (milliseconds) */
  networkTime?: number;
  /** Time spent processing/parsing the chunk (milliseconds) */
  processingTime?: number;
  /** Size of chunk data in bytes */
  chunkSize: number;
  /** Type of content in this chunk */
  type: 'content' | 'thinking' | 'tool' | 'debug';
};

/**
 * Aggregated performance metrics for an entire stream
 */
export type TPerformanceMetrics = {
  /** Total number of chunks received */
  totalChunks: number;
  /** Average time between chunks (milliseconds) */
  averageNetworkTime: number;
  /** Average processing time per chunk (milliseconds) */
  averageProcessingTime: number;
  /** Total stream duration (milliseconds) */
  totalDuration: number;
  /** Chunk with highest total latency */
  slowestChunk: TChunkMetric | null;
  /** Throughput in chunks per second */
  chunksPerSecond: number;
};

/**
 * Global debug interface exposed on window object
 */
export interface IChatDebugInterface {
  /** Enable performance monitoring */
  enable: () => void;
  /** Disable performance monitoring */
  disable: () => void;
  /** Get current performance metrics */
  metrics: () => TPerformanceMetrics;
}

/**
 * Extend Window interface with chatDebug property
 */
declare global {
  interface Window {
    chatDebug: IChatDebugInterface;
  }
}

