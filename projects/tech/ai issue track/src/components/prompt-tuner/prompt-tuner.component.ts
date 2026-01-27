import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LlmService } from '../../services/llm.service';

interface PromptTemplate {
  name: string;
  description: string;
  system: string;
  user: string;
  mimeType: string;
}

@Component({
  selector: 'app-prompt-tuner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col space-y-4">
      <div class="flex justify-between items-center">
        <div>
           <h2 class="text-xl font-bold text-white">Prompt Engineering Lab</h2>
           <p class="text-sm text-gray-400">Optimize system instructions for deterministic output and issue analysis.</p>
        </div>
        <div class="flex space-x-2 items-center">
            <div class="relative group">
                <select (change)="loadTemplate($event)" class="appearance-none bg-gray-800 border border-gray-700 hover:border-blue-500 text-gray-300 text-xs rounded pl-3 pr-8 py-2 focus:outline-none cursor-pointer transition">
                    <option value="" disabled selected>Load Template...</option>
                    @for (t of templates; track t.name) {
                        <option [value]="t.name">{{t.name}}</option>
                    }
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
            <button (click)="runAnalysis()" [disabled]="isLoading()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium disabled:opacity-50 transition flex items-center">
                @if (isLoading()) {
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                }
                {{ isLoading() ? 'Simulating...' : 'Run Simulation' }}
            </button>
        </div>
      </div>

      <div class="flex-grow grid grid-cols-2 gap-4 h-full overflow-hidden">
        <!-- Editor Column -->
        <div class="flex flex-col space-y-4 h-full">
            <div class="glass-panel p-4 rounded-lg flex-grow flex flex-col relative">
                <label class="flex justify-between items-center text-xs font-bold text-gray-400 uppercase mb-2">
                    System Instruction (SOP)
                    <span *ngIf="currentMimeType() === 'application/json'" class="text-[10px] bg-yellow-900 text-yellow-200 px-1.5 py-0.5 rounded border border-yellow-700/50">JSON Mode</span>
                </label>
                <textarea [(ngModel)]="systemPrompt" class="w-full flex-grow bg-gray-900/50 border border-gray-700 rounded p-3 text-sm font-mono text-gray-200 focus:outline-none focus:border-blue-500 resize-none leading-relaxed" placeholder="Enter system instructions..."></textarea>
            </div>
            <div class="glass-panel p-4 rounded-lg h-1/3 flex flex-col">
                <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Test User Input</label>
                <textarea [(ngModel)]="userPrompt" class="w-full flex-grow bg-gray-900/50 border border-gray-700 rounded p-3 text-sm font-mono text-gray-200 focus:outline-none focus:border-blue-500 resize-none leading-relaxed" placeholder="Enter a test scenario..."></textarea>
            </div>
        </div>

        <!-- Output Column -->
        <div class="glass-panel p-4 rounded-lg flex flex-col h-full overflow-hidden">
            <div class="flex justify-between items-center mb-2">
                <label class="text-xs font-bold text-gray-400 uppercase">Model Output (Simulation)</label>
                <span class="text-xs px-2 py-1 rounded bg-green-900 text-green-200" *ngIf="lastLatency">Latency: {{lastLatency}}ms</span>
            </div>
            
            <div class="flex-grow bg-gray-950 rounded border border-gray-800 p-4 overflow-y-auto font-mono text-sm relative">
                @if (isLoading()) {
                    <div class="absolute inset-0 flex items-center justify-center bg-gray-950/80 z-10">
                         <div class="text-blue-400 animate-pulse font-medium">Generating response...</div>
                    </div>
                } 
                @if (output()) {
                    <pre class="whitespace-pre-wrap text-gray-300">{{ output() }}</pre>
                } @else {
                    <div class="text-gray-600 italic h-full flex items-center justify-center">Run a simulation to see the output here.</div>
                }
            </div>

            <!-- Analysis Box -->
             @if (analysis()) {
                <div class="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded">
                    <h4 class="text-xs font-bold text-yellow-500 uppercase mb-1">Prompt Quality Analysis</h4>
                    <p class="text-xs text-gray-300 leading-relaxed">{{ analysis() }}</p>
                </div>
             }
        </div>
      </div>
    </div>
  `
})
export class PromptTunerComponent {
  llmService = inject(LlmService);

  templates: PromptTemplate[] = [
    {
        name: 'Root Cause Analysis',
        description: 'Analyzes context to suggest root causes in JSON.',
        mimeType: 'application/json',
        system: `As an AI assistant, enhance the issue analysis process. After identifying the reported issue, analyze the context and historical data to suggest one or more potential root causes. Structure the output as a JSON object with 'issue_summary' and 'potential_root_causes' (an array of strings) keys.`,
        user: `[Context: System logs show high latency on port 8080. Historical data indicates memory leaks in module X.]
Issue: Application is unresponsive.`
    },
    {
        name: 'Resolution & Confidence',
        description: 'Generates resolution with a confidence score.',
        mimeType: 'application/json',
        system: `As an AI assistant, after generating a resolution for a technical issue, provide a confidence score between 0.0 and 1.0. This score should reflect the AI's certainty about the resolution's effectiveness. Output a JSON object containing the 'resolution' and 'confidence_score'.`,
        user: `Issue: "Printer on 2nd floor showing 'Offline' despite being powered on."`
    },
    {
        name: 'Actionable Steps (Markdown)',
        description: 'Generates clear Markdown steps.',
        mimeType: 'text/plain',
        system: `As an AI assistant, generate a resolution for a given technical issue. Ensure the resolution includes a list of clear, concise, and actionable steps. The output should be a Markdown formatted string detailing these steps.`,
        user: `Issue: "Outlook keeps asking for password after password reset."`
    }
  ];

  systemPrompt = this.templates[0].system;
  userPrompt = this.templates[0].user;
  currentMimeType = signal<string>(this.templates[0].mimeType);

  output = signal<string>('');
  analysis = signal<string>('');
  isLoading = signal<boolean>(false);
  lastLatency = 0;

  loadTemplate(event: Event) {
    const name = (event.target as HTMLSelectElement).value;
    const t = this.templates.find(x => x.name === name);
    if (t) {
      this.systemPrompt = t.system;
      this.userPrompt = t.user;
      this.currentMimeType.set(t.mimeType);
      this.output.set('');
      this.analysis.set('');
    }
  }

  async runAnalysis() {
    this.isLoading.set(true);
    this.output.set('');
    this.analysis.set('');
    
    const start = Date.now();
    
    try {
        // 1. Generate the actual simulated response
        // Use the current mime type setting for the selected template
        const response = await this.llmService.generateSimulation(this.userPrompt, this.systemPrompt, this.currentMimeType());
        this.output.set(response);

        // 2. Self-Correction Analysis (Simulated 'Phase 2' check)
        // Only run analysis if it's text, or generally useful. 
        // For strict JSON, the analysis might just say "It is valid JSON".
        const qualityCheck = await this.llmService.analyzePrompt(this.systemPrompt);
        this.analysis.set(qualityCheck);

    } finally {
        this.lastLatency = Date.now() - start;
        this.isLoading.set(false);
    }
  }
}