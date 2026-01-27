import { Injectable, signal, computed } from '@angular/core';

export interface AiLogEntry {
  id: string;
  timestamp: number;
  promptHash: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  status: 'SUCCESS' | 'ERROR';
  errorDetails?: string;
  // Metadata for quality analysis
  contextSize?: number; // bytes or chars
  systemInstructionHash?: string;
  qualityScore?: number; // 0.0 - 1.0 (Confidence or Eval Score)
}

@Injectable({
  providedIn: 'root'
})
export class LoggingService {
  private _logs = signal<AiLogEntry[]>([]);
  logs = this._logs.asReadonly();

  // Metrics derived from logs
  totalTokens = computed(() => this._logs().reduce((acc, log) => acc + log.inputTokens + log.outputTokens, 0));
  
  averageLatency = computed(() => {
    const successLogs = this._logs().filter(l => l.status === 'SUCCESS');
    if (successLogs.length === 0) return 0;
    return Math.round(successLogs.reduce((acc, l) => acc + l.latencyMs, 0) / successLogs.length);
  });

  averageQualityScore = computed(() => {
     const scoredLogs = this._logs().filter(l => l.qualityScore !== undefined);
     if (scoredLogs.length === 0) return 0;
     const sum = scoredLogs.reduce((acc, l) => acc + (l.qualityScore || 0), 0);
     return Number((sum / scoredLogs.length).toFixed(2));
  });

  errorRate = computed(() => {
    const total = this._logs().length;
    if (total === 0) return 0;
    return (this._logs().filter(l => l.status === 'ERROR').length / total) * 100;
  });

  logInteraction(entry: Omit<AiLogEntry, 'id' | 'timestamp'>) {
    const newEntry: AiLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    
    // Add to log store (keep last 500 in memory)
    this._logs.update(logs => [newEntry, ...logs].slice(0, 500));
    
    // Structured Console Echo for DevTools/Observability
    const color = newEntry.status === 'SUCCESS' ? '#4ade80' : '#f87171';
    console.groupCollapsed(`%c[AI Log] ${newEntry.model} (${newEntry.latencyMs}ms)`, `color: ${color}`);
    console.log('ID:', newEntry.id);
    console.log('Timestamp:', new Date(newEntry.timestamp).toISOString());
    console.log('Tokens In/Out:', newEntry.inputTokens, '/', newEntry.outputTokens);
    console.log('Prompt Hash:', newEntry.promptHash);
    
    if (newEntry.qualityScore !== undefined) {
        console.log('Quality Score:', newEntry.qualityScore);
    }

    if (newEntry.contextSize) {
        console.log('Context Size:', newEntry.contextSize, 'bytes');
    }

    if (newEntry.errorDetails) {
        console.error(newEntry.errorDetails);
    }
    
    // Log the full object for detailed inspection
    console.log('Raw Entry:', newEntry);
    
    console.groupEnd();
  }

  hashString(str: string): string {
    let hash = 0;
    if (!str || str.length === 0) return '0';
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; 
    }
    return Math.abs(hash).toString(16);
  }
}