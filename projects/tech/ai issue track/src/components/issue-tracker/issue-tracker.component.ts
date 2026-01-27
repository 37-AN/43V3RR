import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService, Issue } from '../../services/database.service';
import { IssueAiService } from '../../services/issue-ai.service';

@Component({
  selector: 'app-issue-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col space-y-4 relative">
      <div class="flex justify-between items-center">
        <div>
           <h2 class="text-xl font-bold text-white">IT Operations Issue Tracker</h2>
           <p class="text-sm text-gray-400">Local AI-Assisted Incident Management</p>
        </div>
        <div class="flex items-center space-x-4">
            <div class="flex space-x-2">
                <span class="px-2 py-1 rounded bg-gray-800 text-xs text-gray-400 border border-gray-700">Ollama: llama3.1:8b</span>
                <span class="px-2 py-1 rounded bg-gray-800 text-xs text-gray-400 border border-gray-700">DB: Local SQLite</span>
            </div>
            <button (click)="openCreateModal()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs font-bold transition flex items-center shadow-lg shadow-blue-900/20">
                <span class="mr-1 text-lg leading-none">+</span> New Issue
            </button>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-4 flex-grow overflow-hidden">
        <!-- Sidebar: Issue List -->
        <div class="col-span-4 glass-panel rounded-lg flex flex-col overflow-hidden">
            <div class="p-3 border-b border-gray-700 bg-gray-800/50">
                <input type="text" placeholder="Filter issues..." class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
            </div>
            <div class="overflow-y-auto flex-grow custom-scrollbar">
                @for (issue of db.activeIssues(); track issue.id) {
                    <div (click)="selectIssue(issue)" 
                         class="p-4 border-b border-gray-700/50 cursor-pointer transition hover:bg-gray-700/30"
                         [class.bg-blue-900_20]="selectedIssue()?.id === issue.id">
                        <div class="flex justify-between items-start mb-1">
                            <span class="text-xs font-mono text-gray-500">{{issue.id}}</span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                                  [class.bg-red-900_50]="issue.severity === 'CRITICAL' || issue.severity === 'HIGH'"
                                  [class.text-red-400]="issue.severity === 'CRITICAL' || issue.severity === 'HIGH'"
                                  [class.bg-yellow-900_50]="issue.severity === 'MEDIUM'"
                                  [class.text-yellow-400]="issue.severity === 'MEDIUM'"
                                  [class.bg-blue-900_50]="issue.severity === 'LOW'"
                                  [class.text-blue-400]="issue.severity === 'LOW'">
                                {{issue.severity}}
                            </span>
                        </div>
                        <h4 class="text-sm font-bold text-gray-200 truncate">{{issue.title}}</h4>
                        <div class="mt-2 flex justify-between items-center">
                            <span class="text-[10px] text-gray-400">{{issue.system}}</span>
                            <div class="flex items-center space-x-2">
                                @if (issue.images?.length) {
                                    <span class="text-[10px] text-gray-500 flex items-center">
                                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        {{issue.images?.length}}
                                    </span>
                                }
                                <span class="text-[10px] px-2 py-0.5 rounded border border-gray-700"
                                    [class.text-green-400]="issue.status === 'RESOLVED'"
                                    [class.text-blue-400]="issue.status === 'AI_PROPOSED'"
                                    [class.text-orange-400]="issue.status === 'IN_PROGRESS'"
                                    [class.text-purple-400]="issue.status === 'ANALYZED'"
                                    [class.text-gray-500]="issue.status === 'CLOSED'"
                                    [class.text-gray-400]="issue.status === 'NEW'">
                                    {{issue.status.replace('_', ' ')}}
                                </span>
                            </div>
                        </div>
                    </div>
                }
            </div>
        </div>

        <!-- Main Workspace -->
        <div class="col-span-8 glass-panel rounded-lg flex flex-col overflow-hidden relative">
            @if (selectedIssue(); as issue) {
                <!-- Issue Header -->
                <div class="p-6 pb-0 border-b border-gray-700 bg-gray-800/30 flex flex-col">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h2 class="text-lg font-bold text-white mb-2">{{issue.title}}</h2>
                            <div class="flex space-x-4 text-xs text-gray-400">
                                <span><strong class="text-gray-500">ID:</strong> {{issue.id}}</span>
                                <span><strong class="text-gray-500">Reporter:</strong> {{issue.reporter}}</span>
                                <span><strong class="text-gray-500">Created:</strong> {{ issue.created_at | date:'short' }}</span>
                            </div>
                        </div>
                        
                        <!-- Lifecycle Controls -->
                        <div class="flex flex-col items-end space-y-2">
                            <div class="flex space-x-2">
                                @if (issue.status === 'NEW' || issue.status === 'IN_PROGRESS' || issue.status === 'ANALYZED') {
                                    <button (click)="runAiAnalysis(issue)" [disabled]="isProcessing()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs font-bold transition flex items-center shadow-lg shadow-blue-900/20 disabled:opacity-50">
                                        @if (isProcessing()) { <span class="animate-spin mr-2">⟳</span> }
                                        {{ issue.status === 'NEW' ? 'Run AI Analysis' : 'Re-Run Analysis' }}
                                    </button>
                                }

                                @if (issue.status === 'NEW' || issue.status === 'ANALYZED') {
                                    <button (click)="startWork(issue)" class="px-3 py-1.5 border border-gray-600 hover:bg-gray-800 rounded text-gray-300 text-xs font-bold transition">
                                        Start Work
                                    </button>
                                }

                                @if (issue.status === 'AI_PROPOSED') {
                                    <button (click)="resolveIssue(issue)" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-white text-xs font-bold transition">
                                        Accept & Resolve
                                    </button>
                                    <button (click)="startWork(issue)" class="px-3 py-1.5 border border-gray-600 hover:bg-gray-800 rounded text-gray-300 text-xs font-bold transition">
                                        Investigate
                                    </button>
                                }

                                @if (issue.status === 'IN_PROGRESS') {
                                    <button (click)="resolveIssue(issue)" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-white text-xs font-bold transition">
                                        Mark Resolved
                                    </button>
                                }

                                @if (issue.status === 'RESOLVED') {
                                     <button (click)="generateSop(issue)" [disabled]="isProcessing() || hasSop(issue.id)" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-white text-xs font-bold transition disabled:opacity-50">
                                        {{ hasSop(issue.id) ? 'SOP Generated' : 'Generate SOP' }}
                                    </button>
                                    <button (click)="closeIssue(issue)" class="px-3 py-1.5 border border-gray-600 hover:bg-gray-800 text-gray-400 hover:text-white rounded text-xs font-bold transition">
                                        Close Ticket
                                    </button>
                                }

                                @if (issue.status === 'CLOSED') {
                                    <button (click)="reopenIssue(issue)" class="px-3 py-1.5 border border-red-900/50 hover:bg-red-900/20 text-red-400 rounded text-xs font-bold transition">
                                        Reopen Issue
                                    </button>
                                }
                            </div>
                        </div>
                    </div>

                    <!-- Tabs -->
                    <div class="flex space-x-6 mt-2">
                        <button (click)="issueTab.set('OVERVIEW')" class="pb-2 text-sm font-medium border-b-2 transition"
                                [class.border-blue-500]="issueTab() === 'OVERVIEW'" [class.text-white]="issueTab() === 'OVERVIEW'"
                                [class.border-transparent]="issueTab() !== 'OVERVIEW'" [class.text-gray-500]="issueTab() !== 'OVERVIEW'">
                            Overview & AI
                        </button>
                        <button (click)="issueTab.set('TIMELINE')" class="pb-2 text-sm font-medium border-b-2 transition"
                                [class.border-blue-500]="issueTab() === 'TIMELINE'" [class.text-white]="issueTab() === 'TIMELINE'"
                                [class.border-transparent]="issueTab() !== 'TIMELINE'" [class.text-gray-500]="issueTab() !== 'TIMELINE'">
                            Timeline
                        </button>
                        <button (click)="issueTab.set('TECH')" class="pb-2 text-sm font-medium border-b-2 transition"
                                [class.border-blue-500]="issueTab() === 'TECH'" [class.text-white]="issueTab() === 'TECH'"
                                [class.border-transparent]="issueTab() !== 'TECH'" [class.text-gray-500]="issueTab() !== 'TECH'">
                            Technical Data
                        </button>
                    </div>
                </div>

                <div class="flex-grow flex flex-col p-6 overflow-y-auto custom-scrollbar">
                    
                    @switch (issueTab()) {
                        @case ('OVERVIEW') {
                            <!-- Description -->
                            <div class="mb-6 animate-fade-in">
                                <h3 class="text-xs font-bold text-gray-500 uppercase mb-2">Description</h3>
                                <p class="text-sm text-gray-300 leading-relaxed bg-black/20 p-4 rounded border border-gray-800">
                                    {{issue.description}}
                                </p>
                            </div>

                            <!-- Images Gallery if present -->
                            @if (issue.images && issue.images.length > 0) {
                                <div class="mb-6 animate-fade-in">
                                    <h3 class="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center">
                                        Attached Images <span class="ml-2 text-[10px] bg-gray-800 px-2 py-0.5 rounded">{{issue.images.length}}</span>
                                    </h3>
                                    <div class="flex flex-wrap gap-2">
                                        @for (img of issue.images; track $index) {
                                            <div class="relative group cursor-pointer border border-gray-700 rounded overflow-hidden">
                                                <img [src]="img" class="h-24 w-auto object-cover transition-transform group-hover:scale-110">
                                                <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <span class="text-xs text-white">View</span>
                                                </div>
                                            </div>
                                        }
                                    </div>
                                </div>
                            }

                            <!-- AI Resolution Section -->
                            @if (currentResolution(); as res) {
                                <div class="mb-6 animate-fade-in">
                                    <div class="flex justify-between items-center mb-2">
                                        <h3 class="text-xs font-bold text-blue-400 uppercase flex items-center">
                                            <span class="mr-2">✨</span> AI Proposed Resolution
                                        </h3>
                                        <div class="text-[10px] text-gray-500">
                                            Confidence: <span class="text-green-400">{{res.confidence * 100}}%</span> • Model: {{res.model}}
                                        </div>
                                    </div>
                                    
                                    <div class="bg-blue-900/10 border border-blue-900/30 rounded p-4 text-sm text-gray-300 font-mono whitespace-pre-wrap">
                                        {{res.resolution_text}}
                                    </div>

                                    <!-- Rating Control -->
                                    @if (!res.user_rating) {
                                        <div class="mt-3 bg-gray-800/50 p-3 rounded border border-gray-700/50">
                                            <div class="flex justify-between items-center mb-2">
                                                <span class="text-xs text-gray-400 font-bold uppercase">Rate Resolution</span>
                                                 <!-- Interactive Star Rating -->
                                                 <div class="flex space-x-1" (mouseleave)="setHoverRating(0)">
                                                    @for (star of [1,2,3,4,5]; track star) {
                                                        <button (click)="rateResolution(issue.id, star)" 
                                                                (mouseenter)="setHoverRating(star)"
                                                                class="transition text-lg leading-none focus:outline-none transform hover:scale-110"
                                                                [class.text-yellow-400]="star <= hoverRating()"
                                                                [class.text-gray-600]="star > hoverRating()"
                                                                title="Rate {{star}} Stars">
                                                            ★
                                                        </button>
                                                    }
                                                </div>
                                            </div>
                                            <input type="text" 
                                                   [ngModel]="feedbackText()" 
                                                   (ngModelChange)="feedbackText.set($event)" 
                                                   placeholder="Optional: Add specific feedback..." 
                                                   class="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300 focus:border-blue-500 focus:outline-none placeholder-gray-600">
                                        </div>
                                    } @else {
                                        <div class="mt-2 flex flex-col items-end">
                                            <div class="text-xs text-yellow-500 font-bold flex items-center">
                                                Rated: 
                                                <span class="ml-1 text-lg leading-none">
                                                    {{ '★'.repeat(res.user_rating) }}<span class="text-gray-700">{{ '★'.repeat(5 - res.user_rating) }}</span>
                                                </span>
                                            </div>
                                            @if (res.user_feedback) {
                                                <div class="text-[10px] text-gray-400 italic mt-1 border-l-2 border-gray-700 pl-2">"{{res.user_feedback}}"</div>
                                            }
                                        </div>
                                    }
                                </div>
                            }

                            <!-- SOP Section -->
                            @if (currentSop(); as sop) {
                                <div class="mb-6 animate-fade-in border-t border-gray-700 pt-6">
                                    <h3 class="text-xs font-bold text-purple-400 uppercase mb-4 flex items-center">
                                        <span class="mr-2">📜</span> Generated SOP
                                    </h3>
                                    <div class="bg-gray-900 p-6 rounded border border-gray-700 shadow-lg">
                                        <pre class="text-sm text-gray-300 whitespace-pre-wrap font-sans">{{sop.sop_content}}</pre>
                                    </div>
                                    <!-- SOP Rating Control -->
                                    @if (!sop.user_rating) {
                                        <div class="mt-3 flex items-center justify-end space-x-3">
                                            <span class="text-xs text-gray-400">Rate this SOP Quality:</span>
                                            <div class="flex space-x-1">
                                                @for (star of [1,2,3,4,5]; track star) {
                                                    <button (click)="rateSop(issue.id, star)" class="text-gray-600 hover:text-yellow-400 transition text-lg">★</button>
                                                }
                                            </div>
                                        </div>
                                    }
                                </div>
                            }
                        }

                        @case ('TIMELINE') {
                             <div class="animate-fade-in space-y-4">
                                <h3 class="text-xs font-bold text-gray-500 uppercase">Incident Timeline</h3>
                                <div class="relative border-l border-gray-700 ml-3 space-y-6">
                                    @for (event of issue.timeline; track $index) {
                                        <div class="ml-6 relative">
                                            <div class="absolute -left-[31px] w-4 h-4 rounded-full border-2 border-gray-900"
                                                 [class.bg-blue-500]="event.type === 'USER'"
                                                 [class.bg-purple-500]="event.type === 'AI'"
                                                 [class.bg-gray-500]="event.type === 'SYSTEM'">
                                            </div>
                                            <div class="flex justify-between items-center mb-1">
                                                <span class="text-sm font-bold text-gray-200">{{event.action}}</span>
                                                <span class="text-[10px] text-gray-500">{{event.timestamp | date:'short'}}</span>
                                            </div>
                                            <p class="text-xs text-gray-400 mb-1">Actor: {{event.actor}}</p>
                                            @if (event.details) {
                                                <div class="text-xs text-gray-500 bg-gray-800/50 p-2 rounded">{{event.details}}</div>
                                            }
                                        </div>
                                    }
                                </div>
                             </div>
                        }

                        @case ('TECH') {
                            <div class="animate-fade-in grid grid-cols-2 gap-6">
                                <div>
                                    <h3 class="text-xs font-bold text-gray-500 uppercase mb-3">Environment Details</h3>
                                    <div class="bg-black/20 p-4 rounded border border-gray-800 space-y-2 text-sm text-gray-300">
                                        <div class="flex justify-between border-b border-gray-800 pb-2">
                                            <span class="text-gray-500">System</span>
                                            <span class="font-mono text-blue-300">{{issue.system}}</span>
                                        </div>
                                        <div class="flex justify-between border-b border-gray-800 pb-2">
                                            <span class="text-gray-500">Environment</span>
                                            <span>{{issue.environment}}</span>
                                        </div>
                                        <div class="flex justify-between border-b border-gray-800 pb-2">
                                            <span class="text-gray-500">Severity</span>
                                            <span [class.text-red-400]="issue.severity === 'HIGH' || issue.severity === 'CRITICAL'">{{issue.severity}}</span>
                                        </div>
                                        <div class="flex justify-between border-b border-gray-800 pb-2">
                                            <span class="text-gray-500">Category</span>
                                            <span>{{issue.category}}</span>
                                        </div>
                                         <div class="flex justify-between">
                                            <span class="text-gray-500">Affected Users</span>
                                            <span class="text-yellow-400 font-mono">{{issue.affected_users || 'Unknown'}}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 class="text-xs font-bold text-gray-500 uppercase mb-3">Tech Stack & Assets</h3>
                                    @if (issue.tech_stack?.length) {
                                        <div class="mb-4">
                                            <h4 class="text-[10px] text-gray-600 uppercase mb-1">Detected Stack</h4>
                                            <div class="flex flex-wrap gap-2">
                                                @for (stack of issue.tech_stack; track stack) {
                                                    <span class="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs text-gray-300">{{stack}}</span>
                                                }
                                            </div>
                                        </div>
                                    }
                                    @if (issue.related_assets?.length) {
                                        <div>
                                            <h4 class="text-[10px] text-gray-600 uppercase mb-1">Related Assets</h4>
                                            <ul class="text-xs text-gray-400 space-y-1 bg-black/20 p-3 rounded border border-gray-800">
                                                @for (asset of issue.related_assets; track asset) {
                                                    <li class="flex items-center">
                                                        <span class="w-1.5 h-1.5 rounded-full bg-gray-600 mr-2"></span> {{asset}}
                                                    </li>
                                                }
                                            </ul>
                                        </div>
                                    }
                                </div>
                            </div>
                        }
                    }

                </div>

            } @else {
                <div class="flex flex-col items-center justify-center h-full text-gray-600">
                    <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    <p class="text-sm">Select an issue from the list to view details.</p>
                </div>
            }
        </div>
      </div>

      <!-- Create Issue Modal -->
      @if (isCreating()) {
          <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div class="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                  <div class="p-6 border-b border-gray-800 flex justify-between items-center">
                      <h3 class="text-lg font-bold text-white">Create New Incident</h3>
                      <button (click)="closeCreateModal()" class="text-gray-500 hover:text-white transition">✕</button>
                  </div>
                  
                  <div class="p-6 space-y-4">
                      <!-- Title -->
                      <div>
                          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Issue Title</label>
                          <input type="text" [(ngModel)]="newIssue.title" class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" placeholder="e.g. Server Unreachable">
                      </div>

                      <!-- Grid for Selects -->
                      <div class="grid grid-cols-2 gap-4">
                          <div>
                              <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Category</label>
                              <select [(ngModel)]="newIssue.category" class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
                                  <option value="Hardware">Hardware</option>
                                  <option value="Network">Network</option>
                                  <option value="Application">Application</option>
                                  <option value="Security">Security</option>
                                  <option value="Access">Access / IAM</option>
                              </select>
                          </div>
                          <div>
                              <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Severity</label>
                              <select [(ngModel)]="newIssue.severity" class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
                                  <option value="LOW">LOW</option>
                                  <option value="MEDIUM">MEDIUM</option>
                                  <option value="HIGH">HIGH</option>
                                  <option value="CRITICAL">CRITICAL</option>
                              </select>
                          </div>
                      </div>

                       <div class="grid grid-cols-2 gap-4">
                          <div>
                              <label class="block text-xs font-bold text-gray-400 uppercase mb-1">System Affected</label>
                              <input type="text" [(ngModel)]="newIssue.system" class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" placeholder="e.g. ERP-01">
                          </div>
                          <div>
                              <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Environment</label>
                              <select [(ngModel)]="newIssue.environment" class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
                                  <option value="Production">Production</option>
                                  <option value="Staging">Staging</option>
                                  <option value="Development">Development</option>
                                  <option value="Corporate">Corporate Office</option>
                              </select>
                          </div>
                      </div>

                      <!-- Description -->
                      <div>
                          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Detailed Description</label>
                          <textarea [(ngModel)]="newIssue.description" rows="4" class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" placeholder="Describe the issue..."></textarea>
                      </div>

                      <!-- Image Upload -->
                      <div>
                          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Attachments (Screenshots/Logs)</label>
                          <div class="flex items-center space-x-4">
                              <label class="cursor-pointer bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-300 text-xs px-4 py-2 rounded transition flex items-center">
                                  <input type="file" multiple (change)="handleImageUpload($event)" class="hidden" accept="image/*">
                                  <span>+ Upload Images</span>
                              </label>
                              <span class="text-xs text-gray-500">{{ newIssueImages().length }} files selected</span>
                          </div>
                          
                          <!-- Preview Grid -->
                          @if (newIssueImages().length > 0) {
                              <div class="flex flex-wrap gap-2 mt-3">
                                  @for (img of newIssueImages(); track $index) {
                                      <div class="relative w-16 h-16 border border-gray-700 rounded overflow-hidden group">
                                          <img [src]="img" class="w-full h-full object-cover">
                                          <button (click)="removeNewImage($index)" class="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition">✕</button>
                                      </div>
                                  }
                              </div>
                          }
                      </div>

                  </div>

                  <div class="p-6 border-t border-gray-800 flex justify-end space-x-3 bg-gray-900/50">
                      <button (click)="closeCreateModal()" class="px-4 py-2 rounded text-gray-400 hover:text-white transition text-sm">Cancel</button>
                      <button (click)="createIssue()" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-bold text-sm shadow-lg shadow-blue-900/20 transition">Create Ticket</button>
                  </div>
              </div>
          </div>
      }
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-in; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class IssueTrackerComponent {
  db = inject(DatabaseService);
  ai = inject(IssueAiService);
  
  selectedIssue = signal<Issue | null>(null);
  issueTab = signal<'OVERVIEW' | 'TIMELINE' | 'TECH'>('OVERVIEW');
  isProcessing = signal(false);
  isCreating = signal(false);
  feedbackText = signal('');
  hoverRating = signal(0);

  // New Issue Form State
  newIssue: Partial<Issue> = {
      category: 'Application',
      severity: 'MEDIUM',
      environment: 'Production'
  };
  newIssueImages = signal<string[]>([]);

  // Computed views for the selected issue
  currentResolution = computed(() => {
    const issue = this.selectedIssue();
    return issue ? this.db.getResolution(issue.id) : null;
  });

  currentSop = computed(() => {
    const issue = this.selectedIssue();
    return issue ? this.db.getSop(issue.id) : null;
  });

  hasSop(id: string) {
    return !!this.db.getSop(id);
  }

  selectIssue(issue: Issue) {
    this.selectedIssue.set(issue);
    this.issueTab.set('OVERVIEW');
  }

  async runAiAnalysis(issue: Issue) {
    this.isProcessing.set(true);
    // Explicitly transition to ANALYZED while processing
    this.db.updateIssueStatus(issue.id, 'ANALYZED');
    
    try {
        await this.ai.proposeResolution(issue);
        // Note: proposeResolution internally transitions to 'AI_PROPOSED' on success
    } finally {
        this.isProcessing.set(false);
    }
  }

  startWork(issue: Issue) {
    this.db.updateIssueStatus(issue.id, 'IN_PROGRESS');
    this.db.addTimelineEvent(issue.id, {
        timestamp: Date.now(),
        actor: 'current-user',
        action: 'Work Started',
        type: 'USER'
    });
  }

  resolveIssue(issue: Issue) {
    this.db.updateIssueStatus(issue.id, 'RESOLVED');
  }

  closeIssue(issue: Issue) {
    this.db.updateIssueStatus(issue.id, 'CLOSED');
    this.selectedIssue.set(null); // Deselect closed issue or handle as needed
  }

  reopenIssue(issue: Issue) {
    this.db.updateIssueStatus(issue.id, 'IN_PROGRESS');
  }

  async generateSop(issue: Issue) {
    const res = this.db.getResolution(issue.id);
    
    // Fallback context if no AI resolution exists
    const context = res ? res.resolution_text : `Issue: ${issue.title}\nDescription: ${issue.description}\nSystem: ${issue.system}`;

    this.isProcessing.set(true);
    try {
        await this.ai.generateSOP(issue, context);
    } finally {
        this.isProcessing.set(false);
    }
  }

  setHoverRating(r: number) {
    this.hoverRating.set(r);
  }

  rateResolution(id: string, rating: number) {
    this.db.rateResolution(id, rating, this.feedbackText());
    this.feedbackText.set('');
    this.hoverRating.set(0);
  }

  rateSop(id: string, rating: number) {
    this.db.rateSop(id, rating);
  }

  // --- Create Issue Logic ---

  openCreateModal() {
      this.isCreating.set(true);
      this.newIssue = {
          category: 'Application',
          severity: 'MEDIUM',
          environment: 'Production'
      };
      this.newIssueImages.set([]);
  }

  closeCreateModal() {
      this.isCreating.set(false);
  }

  handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const res = e.target?.result as string;
                this.newIssueImages.update(imgs => [...imgs, res]);
            };
            reader.readAsDataURL(file);
        });
        input.value = ''; // Reset for re-selection if needed
    }
  }

  removeNewImage(index: number) {
      this.newIssueImages.update(imgs => imgs.filter((_, i) => i !== index));
  }

  createIssue() {
      if (!this.newIssue.title || !this.newIssue.description) {
          alert('Please fill in Title and Description');
          return;
      }

      const issue: Issue = {
          id: `INC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          title: this.newIssue.title,
          description: this.newIssue.description,
          category: this.newIssue.category || 'Other',
          severity: this.newIssue.severity || 'MEDIUM',
          environment: this.newIssue.environment || 'Production',
          system: this.newIssue.system || 'Unknown',
          reporter: 'current-user', // Mocked
          created_at: Date.now(),
          status: 'NEW',
          images: this.newIssueImages(),
          timeline: [{ timestamp: Date.now(), actor: 'current-user', action: 'Ticket Created', type: 'USER' }],
          comments: []
      };

      this.db.addIssue(issue);
      this.closeCreateModal();
      this.selectIssue(issue); // Select the newly created issue
  }
}