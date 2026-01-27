import { Injectable, signal, computed } from '@angular/core';

export interface TestCase {
  id: string;
  query: string;
  expectedKeyphrases: string[];
}

export interface EvalResult {
  id: string;
  query: string;
  response: string;
  latency: number;
  similarity: number; // 0.0 to 1.0
  status: 'PASS' | 'WARN' | 'FAIL';
}

@Injectable({
  providedIn: 'root'
})
export class EvaluationService {
  // State
  isRunning = signal(false);
  progress = signal(0);
  results = signal<EvalResult[]>([]);

  // Derived Metrics
  avgLatency = computed(() => {
    const res = this.results();
    if (res.length === 0) return 0;
    return Math.round(res.reduce((acc, r) => acc + r.latency, 0) / res.length);
  });

  passRate = computed(() => {
    const res = this.results();
    if (res.length === 0) return 0;
    const passed = res.filter(r => r.status === 'PASS').length;
    return Math.round((passed / res.length) * 100);
  });

  avgSimilarity = computed(() => {
    const res = this.results();
    if (res.length === 0) return 0;
    const total = res.reduce((acc, r) => acc + r.similarity, 0);
    return Number((total / res.length).toFixed(2));
  });

  // Golden Dataset (Test Cases)
  private testCases: TestCase[] = [
    { id: 'TC-001', query: 'Network slow on 3rd floor', expectedKeyphrases: ['switch', 'rack 4', 'latency'] },
    { id: 'TC-002', query: 'Printer showing Offline', expectedKeyphrases: ['spooler', 'restart', 'service'] },
    { id: 'TC-003', query: 'VPN connection failed', expectedKeyphrases: ['certificate', 'store', 'auth'] },
    { id: 'TC-004', query: 'Outlook password prompt loop', expectedKeyphrases: ['credential manager', 'clear', 'profile'] },
    { id: 'TC-005', query: 'Blue Screen 0x00000050', expectedKeyphrases: ['memory', 'driver', 'update'] }
  ];

  async runEvaluation() {
    if (this.isRunning()) return;
    
    this.isRunning.set(true);
    this.results.set([]);
    this.progress.set(0);
    
    const tempResults: EvalResult[] = [];
    
    for (let i = 0; i < this.testCases.length; i++) {
      const tc = this.testCases[i];
      
      // Simulate Inference
      const start = Date.now();
      await this.simulateNetworkDelay(); 
      const latency = Date.now() - start;

      // Simulate AI Response & Grading
      const response = this.generateMockResponse(tc);
      const similarity = this.calculateMockSimilarity(response, tc.expectedKeyphrases);
      
      const status = similarity > 0.85 ? 'PASS' : (similarity > 0.6 ? 'WARN' : 'FAIL');

      tempResults.push({
        id: tc.id,
        query: tc.query,
        response,
        latency,
        similarity,
        status
      });

      // Update state incrementally
      this.results.set([...tempResults]);
      this.progress.set(Math.round(((i + 1) / this.testCases.length) * 100));
    }

    this.isRunning.set(false);
  }

  private async simulateNetworkDelay() {
    const ms = 300 + Math.random() * 800; // 300ms to 1100ms
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateMockResponse(tc: TestCase): string {
    // Determine if we want to simulate a failure randomly
    const isFailure = Math.random() > 0.8;
    
    if (isFailure) {
       return "I am unable to determine the cause based on the current context. Please check the logs.";
    }

    // Construct a "good" response
    return `Based on historical logs, this issue is likely caused by ${tc.expectedKeyphrases[0]}. Recommended action: Check ${tc.expectedKeyphrases[1]} and verify system health.`;
  }

  private calculateMockSimilarity(response: string, expected: string[]): number {
    let hits = 0;
    expected.forEach(key => {
        if (response.toLowerCase().includes(key)) hits++;
    });
    
    // Base score + random noise
    let score = (hits / expected.length) * 0.9;
    
    // Add some variance
    score += (Math.random() * 0.1);
    
    return Math.min(score, 0.99);
  }
}