import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { PromptTunerComponent } from './components/prompt-tuner/prompt-tuner.component';
import { RagExplorerComponent } from './components/rag-explorer/rag-explorer.component';
import { EvaluationComponent } from './components/evaluation/evaluation.component';
import { IssueTrackerComponent } from './components/issue-tracker/issue-tracker.component';
import { KnowledgeBaseComponent } from './components/knowledge-base/knowledge-base.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    DashboardComponent, 
    PromptTunerComponent, 
    RagExplorerComponent, 
    EvaluationComponent,
    IssueTrackerComponent,
    KnowledgeBaseComponent
  ],
  templateUrl: './app.component.html'
})
export class AppComponent {
  activeTab = signal<'dashboard' | 'issues' | 'kb' | 'prompt' | 'rag' | 'eval'>('dashboard');
}