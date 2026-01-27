import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';

@Component({
  selector: 'app-evaluation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col space-y-4">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
           <h2 class="text-xl font-bold text-white">Automated Evaluation Suite</h2>
           <p class="text-sm text-gray-400">Continuous Quality Assurance & Regression Testing for AI Models.</p>
        </div>
        <button (click)="service.runEvaluation()" [disabled]="service.isRunning()" 
                class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white font-medium disabled:opacity-50 transition flex items-center shadow-lg shadow-purple-900/20">
           @if (service.isRunning()) {
             <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             Running Batch Eval...
           } @else {
             <span class="mr-2">▶</span> Run Full Evaluation
           }
        </button>
      </div>

      <!-- Metrics Row -->
      <div class="grid grid-cols-3 gap-4">
        <div class="glass-panel p-4 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group">
            <div class="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <span class="text-gray-400 text-xs font-bold uppercase z-10">Pass Rate</span>
            <span class="text-3xl font-mono mt-2 z-10" 
                  [class.text-green-400]="service.passRate() >= 80" 
                  [class.text-yellow-400]="service.passRate() >= 50 && service.passRate() < 80"
                  [class.text-red-400]="service.passRate() < 50">
                {{ service.passRate() }}%
            </span>
        </div>
        <div class="glass-panel p-4 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group">
            <div class="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <span class="text-gray-400 text-xs font-bold uppercase z-10">Avg Latency</span>
            <span class="text-3xl font-mono text-blue-300 mt-2 z-10">{{ service.avgLatency() }}ms</span>
        </div>
        <div class="glass-panel p-4 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group">
            <div class="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <span class="text-gray-400 text-xs font-bold uppercase z-10">Semantic Similarity</span>
            <span class="text-3xl font-mono text-purple-300 mt-2 z-10">{{ service.avgSimilarity() }}</span>
        </div>
      </div>

      <!-- Results Table -->
      <div class="glass-panel rounded-lg flex-grow overflow-hidden flex flex-col border-t border-gray-700">
        <div class="p-3 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center h-12">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Test Batch Results</h3>
            @if (service.isRunning()) {
                <div class="w-1/3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full bg-purple-500 transition-all duration-300 ease-out" [style.width.%]="service.progress()"></div>
                </div>
            }
        </div>
        <div class="overflow-y-auto flex-grow custom-scrollbar">
            <table class="w-full text-left text-sm text-gray-300">
                <thead class="sticky top-0 bg-gray-900/95 backdrop-blur z-20 shadow-md">
                    <tr class="border-b border-gray-700 text-gray-500 text-xs uppercase font-semibold">
                        <th class="p-3 w-24">ID</th>
                        <th class="p-3 w-1/4">Query Input</th>
                        <th class="p-3">AI Response</th>
                        <th class="p-3 w-24">Latency</th>
                        <th class="p-3 w-24">Score</th>
                        <th class="p-3 w-24 text-right">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-800">
                    @for (row of service.results(); track row.id) {
                        <tr class="hover:bg-white/5 transition duration-150">
                            <td class="p-3 font-mono text-xs text-gray-500">{{ row.id }}</td>
                            <td class="p-3">
                                <div class="truncate max-w-[200px] text-white" title="{{row.query}}">{{ row.query }}</div>
                            </td>
                            <td class="p-3">
                                <div class="text-gray-400 italic text-xs truncate max-w-[300px]" title="{{row.response}}">{{ row.response }}</div>
                            </td>
                            <td class="p-3 font-mono text-xs">{{ row.latency }}ms</td>
                            <td class="p-3 font-mono text-xs">{{ row.similarity.toFixed(2) }}</td>
                            <td class="p-3 text-right">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold border inline-block min-w-[50px] text-center"
                                      [class.bg-green-900_30]="row.status === 'PASS'"
                                      [class.text-green-400]="row.status === 'PASS'"
                                      [class.border-green-800]="row.status === 'PASS'"
                                      [class.bg-yellow-900_30]="row.status === 'WARN'"
                                      [class.text-yellow-400]="row.status === 'WARN'"
                                      [class.border-yellow-800]="row.status === 'WARN'"
                                      [class.bg-red-900_30]="row.status === 'FAIL'"
                                      [class.text-red-400]="row.status === 'FAIL'"
                                      [class.border-red-800]="row.status === 'FAIL'">
                                    {{ row.status }}
                                </span>
                            </td>
                        </tr>
                    }
                    @if (service.results().length === 0 && !service.isRunning()) {
                        <tr>
                            <td colspan="6" class="p-12 text-center text-gray-600">
                                <div class="flex flex-col items-center justify-center">
                                    <svg class="w-12 h-12 mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                                    <p class="text-sm">No evaluation data available.</p>
                                    <p class="text-xs mt-1">Click "Run Full Evaluation" to start the harness.</p>
                                </div>
                            </td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>
      </div>
    </div>
  `
})
export class EvaluationComponent {
  service = inject(EvaluationService);
}