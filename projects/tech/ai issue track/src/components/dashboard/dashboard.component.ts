import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelemetryService } from '../../services/telemetry.service';
import { TelemetryChartComponent } from '../telemetry-chart.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TelemetryChartComponent],
  template: `
    <div class="h-full flex flex-col space-y-6 overflow-y-auto pr-2 custom-scrollbar">
      <!-- Top Stats Row -->
      <div class="grid grid-cols-4 gap-4">
        <!-- VRAM Card -->
        <div class="glass-panel p-4 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group">
            <div class="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition duration-500"></div>
            <span class="text-gray-400 text-xs font-bold uppercase z-10 mb-1">VRAM Usage</span>
            <div class="flex items-baseline z-10">
                <span class="text-3xl font-mono text-blue-400 font-bold">{{ ts.vramUsage().toFixed(1) }}</span>
                <span class="text-xs text-gray-500 ml-1">GB</span>
            </div>
            <div class="w-full bg-gray-800 h-1 mt-3 rounded-full overflow-hidden">
                <div class="h-full bg-blue-500 transition-all duration-300" [style.width.%]="(ts.vramUsage() / 24) * 100"></div>
            </div>
            <span class="text-[10px] text-gray-500 mt-1">RTX 4090 (24GB)</span>
        </div>

        <!-- GPU Temp Card -->
        <div class="glass-panel p-4 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group">
            <div class="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition duration-500"></div>
            <span class="text-gray-400 text-xs font-bold uppercase z-10 mb-1">GPU Temp</span>
            <div class="flex items-baseline z-10">
                <span class="text-3xl font-mono font-bold" 
                      [class.text-green-400]="ts.gpuTemp() < 70"
                      [class.text-yellow-400]="ts.gpuTemp() >= 70 && ts.gpuTemp() < 85"
                      [class.text-red-400]="ts.gpuTemp() >= 85">
                    {{ ts.gpuTemp() }}
                </span>
                <span class="text-xs text-gray-500 ml-1">°C</span>
            </div>
             <div class="w-full bg-gray-800 h-1 mt-3 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-300" [style.width.%]="(ts.gpuTemp() / 90) * 100"></div>
            </div>
             <span class="text-[10px] text-gray-500 mt-1">Thermal Headroom: {{ 90 - ts.gpuTemp() }}°C</span>
        </div>

        <!-- Latency Card -->
        <div class="glass-panel p-4 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group">
            <span class="text-gray-400 text-xs font-bold uppercase z-10 mb-1">Avg Latency (P99)</span>
            <div class="flex items-baseline z-10">
                <span class="text-3xl font-mono text-purple-400 font-bold">{{ ts.latencyHistory()[ts.latencyHistory().length-1]?.value.toFixed(0) }}</span>
                <span class="text-xs text-gray-500 ml-1">ms</span>
            </div>
            <div class="text-[10px] text-green-400 mt-2 flex items-center">
                <span class="mr-1">▼</span> 12% vs last hr
            </div>
        </div>

        <!-- Context Window -->
        <div class="glass-panel p-4 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group">
            <span class="text-gray-400 text-xs font-bold uppercase z-10 mb-1">Context Util</span>
            <div class="flex items-baseline z-10">
                <span class="text-3xl font-mono text-yellow-400 font-bold">{{ ts.contextUtilization() }}</span>
                <span class="text-xs text-gray-500 ml-1">%</span>
            </div>
             <div class="w-full bg-gray-800 h-1 mt-3 rounded-full overflow-hidden">
                <div class="h-full bg-yellow-500 transition-all duration-300" [style.width.%]="ts.contextUtilization()"></div>
            </div>
             <span class="text-[10px] text-gray-500 mt-1">Window: 8192 Tokens</span>
        </div>
      </div>

      <!-- Charts Area -->
      <div class="grid grid-cols-2 gap-4 flex-grow min-h-[300px]">
        <div class="glass-panel p-4 rounded-lg flex flex-col">
          <app-telemetry-chart 
            title="Inference Latency (ms)" 
            color="#a855f7"
            [data]="ts.latencyHistory()"
            class="flex-grow">
          </app-telemetry-chart>
        </div>
        <div class="glass-panel p-4 rounded-lg flex flex-col">
          <app-telemetry-chart 
            title="Throughput (Tokens/Sec)" 
            color="#10b981"
            [data]="ts.tpsHistory()"
            class="flex-grow">
          </app-telemetry-chart>
        </div>
      </div>

      <!-- Bottom System Status -->
      <div class="glass-panel p-4 rounded-lg grid grid-cols-3 gap-6">
        <div>
            <h4 class="text-xs font-bold text-gray-400 uppercase mb-2">Active Model</h4>
            <div class="flex items-center justify-between bg-black/20 p-2 rounded border border-gray-700">
                <div class="flex items-center">
                    <div class="w-2 h-2 rounded-full mr-2"
                         [class.bg-green-500]="ts.modelStatus() === 'Inferencing'"
                         [class.bg-gray-500]="ts.modelStatus() === 'Idle'"
                         [class.bg-yellow-500]="ts.modelStatus() === 'Loading'"
                         [class.bg-blue-500]="ts.modelStatus() === 'Indexing'">
                    </div>
                    <span class="text-sm font-mono text-gray-200">llama3.1:8b-instruct-q4_K_M</span>
                </div>
                <span class="text-[10px] text-gray-500 uppercase font-bold">{{ ts.modelStatus() }}</span>
            </div>
        </div>
        <div>
            <h4 class="text-xs font-bold text-gray-400 uppercase mb-2">RAG Health</h4>
             <div class="flex items-center justify-between bg-black/20 p-2 rounded border border-gray-700">
                <span class="text-sm text-gray-300">Vector Hit Rate</span>
                <span class="text-sm font-mono text-green-400 font-bold">{{ ts.ragHitRate() }}%</span>
            </div>
        </div>
         <div>
            <h4 class="text-xs font-bold text-gray-400 uppercase mb-2">Queue Depth</h4>
             <div class="flex items-center justify-between bg-black/20 p-2 rounded border border-gray-700">
                <span class="text-sm text-gray-300">Pending Requests</span>
                <span class="text-sm font-mono text-blue-400 font-bold">0</span>
            </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {
  ts = inject(TelemetryService);
}