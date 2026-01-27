import { Injectable, signal, computed } from '@angular/core';

export interface MetricPoint {
  time: number;
  value: number;
}

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  // Signals for real-time data
  latencyHistory = signal<MetricPoint[]>([]);
  tpsHistory = signal<MetricPoint[]>([]); // Tokens per second
  
  // Hardware / System Stats
  vramUsage = signal<number>(14.2); // GB
  gpuTemp = signal<number>(62); // Celsius
  contextUtilization = signal<number>(45); // % of 8k context
  
  ragHitRate = signal<number>(85);
  modelStatus = signal<'Idle' | 'Inferencing' | 'Loading' | 'Indexing'>('Idle');
  
  private intervalId: any;

  constructor() {
    this.startSimulation();
  }

  private startSimulation() {
    const now = Date.now();
    // Initialize with some data
    const initialLatency = [];
    const initialTps = [];
    for (let i = 20; i > 0; i--) {
      initialLatency.push({ time: now - i * 1000, value: 150 + Math.random() * 50 });
      initialTps.push({ time: now - i * 1000, value: 45 + Math.random() * 10 });
    }
    this.latencyHistory.set(initialLatency);
    this.tpsHistory.set(initialTps);

    this.intervalId = setInterval(() => {
      this.updateMetrics();
    }, 1000);
  }

  private updateMetrics() {
    const now = Date.now();
    const isInferencing = this.modelStatus() === 'Inferencing';
    
    // Simulate Latency fluctuation
    const lastLatency = this.latencyHistory()[this.latencyHistory().length - 1]?.value || 150;
    let newLatency = lastLatency + (Math.random() - 0.5) * 40;
    if (newLatency < 50) newLatency = 50;
    if (newLatency > 400) newLatency = 400;

    // Simulate TPS
    const lastTps = this.tpsHistory()[this.tpsHistory().length - 1]?.value || 50;
    let newTps = lastTps + (Math.random() - 0.5) * 10;
    if (newTps < 10) newTps = 10;
    if (newTps > 100) newTps = 100;
    
    // Boost TPS if inferencing
    if (isInferencing) newTps += 20;

    // Update Arrays (keep last 60 points)
    this.latencyHistory.update(prev => [...prev.slice(-59), { time: now, value: newLatency }]);
    this.tpsHistory.update(prev => [...prev.slice(-59), { time: now, value: newTps }]);

    // Update Hardware Stats
    let currentVram = this.vramUsage();
    // Drift VRAM slightly
    currentVram += (Math.random() - 0.5) * 0.2;
    if (isInferencing && currentVram < 18) currentVram += 0.5; // Spike VRAM on inference
    if (!isInferencing && currentVram > 14.5) currentVram -= 0.3; // GC
    this.vramUsage.set(Number(currentVram.toFixed(1)));

    let currentTemp = this.gpuTemp();
    currentTemp += (Math.random() - 0.5);
    if (isInferencing && currentTemp < 75) currentTemp += 0.8;
    if (!isInferencing && currentTemp > 62) currentTemp -= 0.5;
    this.gpuTemp.set(Math.round(currentTemp));

    // Randomly change status
    if (Math.random() > 0.92) {
        const states: ('Idle' | 'Inferencing' | 'Loading' | 'Indexing')[] = ['Idle', 'Inferencing', 'Idle', 'Indexing'];
        this.modelStatus.set(states[Math.floor(Math.random() * states.length)]);
    }
  }
}