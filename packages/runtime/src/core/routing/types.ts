/**
 * Enterprise-grade routing system types
 * Following Domain-Driven Design and Clean Architecture principles
 */

import { Request } from "express";

export interface AgentContext {
  id: string;
  version?: string;
  usingTestDomain: boolean;
  debugSessionEnabled: boolean;
  isLocked?: boolean;
  agentVersion?: string;
}

export interface RequestContext {
  correlationId: string;
  timestamp: number;
  clientIp: string;
  userAgent?: string;
  headers: Record<string, string>;
}

export interface RoutingDecision {
  service: 'debugger' | 'agent-runner';
  reason: string;
  confidence: number;
  metadata: Record<string, any>;
}

export interface ServiceHealth {
  service: 'debugger' | 'agent-runner';
  healthy: boolean;
  lastCheck: number;
  responseTime?: number;
  errorRate?: number;
}

export interface RoutingMetrics {
  totalRequests: number;
  debuggerRequests: number;
  agentRunnerRequests: number;
  errors: number;
  averageResponseTime: number;
}

export interface AgentRequestProcessor {
  name: string;
  canHandle(agent: AgentContext, request: RequestContext): Promise<boolean>;
  process(agent: AgentContext, req: Request): Promise<ProcessingResult>;
  healthCheck(): Promise<ServiceHealth>;
}

export interface ProcessingResult {
  status: number;
  data: any;
  metadata?: {
    processingTime: number;
    service: string;
    correlationId: string;
  };
}

export interface RoutingStrategy {
  decide(agent: AgentContext, request: RequestContext): Promise<RoutingDecision>;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export interface RoutingConfig {
  enableMetrics: boolean;
  enableCircuitBreaker: boolean;
  circuitBreakerConfig: CircuitBreakerConfig;
  healthCheckInterval: number;
  requestTimeout: number;
  maxRetries: number;
}
