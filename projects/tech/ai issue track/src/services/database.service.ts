import { Injectable, signal, computed } from '@angular/core';

export type IssueStatus = 'NEW' | 'ANALYZED' | 'AI_PROPOSED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface TimelineEvent {
  timestamp: number;
  actor: string;
  action: string;
  details?: string;
  type: 'SYSTEM' | 'USER' | 'AI';
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

// Expanded Rating Dimensions
export interface RatingDimensions {
  correctness: number; // 1-5
  clarity: number;     // 1-5
  safety: number;      // 1-5
  actionability: number; // 1-5
}

export interface Feedback {
  overall_score: number;
  comment?: string;
  dimensions?: RatingDimensions;
  timestamp: number;
  user_id?: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  environment: string;
  system: string;
  reporter: string;
  created_at: number;
  status: IssueStatus;
  images?: string[]; // Base64 Data URLs
  
  // Extended Details
  timeline: TimelineEvent[];
  comments: Comment[];
  affected_users?: number;
  related_assets?: string[];
  tech_stack?: string[]; // e.g. ['Java', 'Tomcat', 'Oracle']
}

export interface AiResolution {
  id: string;
  issue_id: string;
  resolution_text: string;
  confidence: number;
  model: string;
  generated_at: number;
  
  // Rating Schema (Primary fields for UI)
  user_rating?: number; 
  user_feedback?: string;
  
  // Detailed feedback object (Backend/Analytics)
  feedback?: Feedback;
}

export interface AiSop {
  id: string;
  issue_id: string;
  title: string;
  sop_content: string; // Markdown
  generated_at: number;
  
  // Rating Schema
  feedback?: Feedback;
  
  // Compatibility fields
  user_rating?: number;
  user_feedback?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  // Simulating the Relational Tables
  issues = signal<Issue[]>([
    {
      id: 'INC-2024-001',
      title: 'ERP System Latency on Checkout',
      description: 'Users reporting 503 errors during final checkout step in the SAP web interface. Logs show high connection pool usage.',
      category: 'Application',
      severity: 'HIGH',
      environment: 'Production',
      system: 'SAP-ERP-01',
      reporter: 'j.doe@company.com',
      created_at: Date.now() - 1000 * 60 * 60 * 2,
      status: 'NEW',
      images: [],
      affected_users: 142,
      related_assets: ['sap-web-01', 'sap-db-02', 'load-balancer-int'],
      tech_stack: ['SAP NetWeaver', 'Oracle DB', 'F5 BigIP'],
      timeline: [
        { timestamp: Date.now() - 1000 * 60 * 60 * 2, actor: 'j.doe@company.com', action: 'Ticket Created', type: 'USER' },
        { timestamp: Date.now() - 1000 * 60 * 55 * 2, actor: 'System', action: 'Severity Upgraded', details: 'Automated impact analysis detected >100 affected sessions.', type: 'SYSTEM' }
      ],
      comments: [
        { id: 'c1', author: 'L1 Support', text: 'Checked basic connectivity, ping is fine. Escalating to Apps Team.', timestamp: Date.now() - 1000 * 60 * 45 * 2 }
      ]
    },
    {
      id: 'INC-2024-002',
      title: 'VPN Certificate Expiry Warning',
      description: 'Global Protect VPN client showing certificate expiry warning for 50+ users in remote branch.',
      category: 'Network',
      severity: 'MEDIUM',
      environment: 'Corporate',
      system: 'PaloAlto-VPN',
      reporter: 'network-ops',
      created_at: Date.now() - 1000 * 60 * 60 * 24,
      status: 'RESOLVED',
      images: [],
      affected_users: 55,
      related_assets: ['pa-vpn-gateway-01', 'radius-srv-02'],
      tech_stack: ['PaloAlto PanOS', 'Microsoft NPS'],
      timeline: [
         { timestamp: Date.now() - 1000 * 60 * 60 * 24, actor: 'network-ops', action: 'Ticket Created', type: 'USER' },
         { timestamp: Date.now() - 1000 * 60 * 60 * 23, actor: 'Ishtrak AI', action: 'Resolution Proposed', details: 'Identified Root CA expiry.', type: 'AI' },
         { timestamp: Date.now() - 1000 * 60 * 60 * 20, actor: 'sysadmin', action: 'Cert Renewed', type: 'USER' },
         { timestamp: Date.now() - 1000 * 60 * 60 * 19, actor: 'sysadmin', action: 'Ticket Resolved', type: 'USER' }
      ],
      comments: []
    },
    {
      id: 'INC-2024-003',
      title: 'Printer Spooler Stuck - HR Dept',
      description: 'HP LaserJet 400 not responding. Spooler service restart temporarily fixes it but it hangs again after 10 mins.',
      category: 'Hardware',
      severity: 'LOW',
      environment: 'Office-HQ',
      system: 'Print-Srv-04',
      reporter: 'hr-admin',
      created_at: Date.now() - 1000 * 60 * 30,
      status: 'AI_PROPOSED',
      images: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='],
      affected_users: 12,
      related_assets: ['print-srv-04', 'hp-laserjet-hr-01'],
      tech_stack: ['Windows Server 2019', 'Print Management'],
      timeline: [
          { timestamp: Date.now() - 1000 * 60 * 30, actor: 'hr-admin', action: 'Ticket Created', type: 'USER' },
          { timestamp: Date.now() - 1000 * 60 * 29, actor: 'System', action: 'Ingested via Email', type: 'SYSTEM' },
          { timestamp: Date.now() - 1000 * 60 * 5, actor: 'Ishtrak AI', action: 'Resolution Proposed', details: 'Suggested driver update and spooler clear script.', type: 'AI' }
      ],
      comments: []
    }
  ]);

  resolutions = signal<AiResolution[]>([]);
  sops = signal<AiSop[]>([
      {
          id: 'sop-mock-001',
          issue_id: 'INC-2024-002',
          title: 'SOP: VPN Certificate Renewal Procedure',
          generated_at: Date.now() - 1000 * 60 * 60 * 18,
          sop_content: `# SOP: VPN Certificate Renewal for Global Protect

**Purpose**: To guide administrators in renewing expired Root CA certificates on Palo Alto VPN Gateways.
**Scope**: All Network Administrators.

## Preconditions
- Access to Palo Alto Firewall Web UI.
- Access to Internal PKI/CA Server.
- Maintenance window approved.

## Procedure
1. **Identify Expired Cert**: Navigate to *Device > Certificate Management > Certificates*. Sort by Expiry Date.
2. **Generate CSR**: Select the expired cert, click *Renew* or *Generate CSR* if key rotation is needed.
3. **Sign Certificate**: Export CSR to Internal CA. Sign it using the 'VPN-Gateway-Template'.
4. **Import Signed Cert**: Import the .cer file back into the Firewall.
5. **Commit Changes**: Click *Commit* to push changes. Note that VPN tunnels may reconnect.

## Validation
- Verify the certificate status is 'Valid'.
- Ask a pilot user to connect via Global Protect Agent.

## Rollback
- If commit fails, revert to previous configuration snapshot via *Device > Setup > Operations > Load Config Version*.
`
      }
  ]);

  // Selectors
  activeIssues = computed(() => this.issues().filter(i => i.status !== 'CLOSED').sort((a, b) => b.created_at - a.created_at));
  
  getIssue(id: string) {
    return this.issues().find(i => i.id === id);
  }

  getResolution(issueId: string) {
    return this.resolutions().find(r => r.issue_id === issueId);
  }

  getSop(issueId: string) {
    return this.sops().find(s => s.issue_id === issueId);
  }

  // Actions
  addIssue(issue: Issue) {
    const newIssue = { 
        ...issue, 
        images: issue.images || [],
        timeline: issue.timeline || [{ timestamp: Date.now(), actor: issue.reporter, action: 'Ticket Created', type: 'USER' }],
        comments: issue.comments || []
    };
    this.issues.update(prev => [newIssue, ...prev]);
  }

  addResolution(res: AiResolution) {
    this.resolutions.update(prev => [...prev.filter(r => r.issue_id !== res.issue_id), res]);
    this.updateIssueStatus(res.issue_id, 'AI_PROPOSED');
    this.addTimelineEvent(res.issue_id, {
        timestamp: Date.now(),
        actor: 'Ishtrak AI',
        action: 'Resolution Proposed',
        details: `Confidence: ${(res.confidence * 100).toFixed(1)}%`,
        type: 'AI'
    });
  }

  addSop(sop: AiSop) {
    this.sops.update(prev => [...prev.filter(s => s.issue_id !== sop.issue_id), sop]);
    this.addTimelineEvent(sop.issue_id, {
        timestamp: Date.now(),
        actor: 'Ishtrak AI',
        action: 'SOP Generated',
        type: 'AI'
    });
  }

  updateSopContent(sopId: string, newContent: string) {
    this.sops.update(prev => prev.map(s => 
        s.id === sopId ? { ...s, sop_content: newContent } : s
    ));
  }

  updateIssueStatus(id: string, status: IssueStatus) {
    this.issues.update(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  }

  addTimelineEvent(issueId: string, event: TimelineEvent) {
    this.issues.update(prev => prev.map(i => {
        if (i.id === issueId) {
            return { ...i, timeline: [event, ...i.timeline] };
        }
        return i;
    }));
  }

  rateResolution(issueId: string, rating: number, textFeedback: string = '', dimensions?: RatingDimensions) {
    // Construct the detailed feedback object for analytics
    const feedback: Feedback = {
        overall_score: rating,
        comment: textFeedback,
        dimensions: dimensions || { 
            correctness: rating, 
            clarity: rating, 
            safety: rating, 
            actionability: rating 
        }, 
        timestamp: Date.now(),
        user_id: 'current-user'
    };

    // Update the resolution with the rating and feedback
    this.resolutions.update(prev => prev.map(r => 
      r.issue_id === issueId ? { 
          ...r, 
          user_rating: rating, 
          user_feedback: textFeedback,
          feedback: feedback
      } : r
    ));

    this.addTimelineEvent(issueId, {
        timestamp: Date.now(),
        actor: 'User',
        action: 'Resolution Rated',
        details: `${rating}/5 Stars`,
        type: 'USER'
    });
  }

  rateSop(issueId: string, rating: number, textFeedback: string = '', dimensions?: RatingDimensions) {
     const feedback: Feedback = {
        overall_score: rating,
        comment: textFeedback,
        dimensions: dimensions || { 
            correctness: rating, 
            clarity: rating, 
            safety: rating, 
            actionability: rating 
        },
        timestamp: Date.now(),
        user_id: 'current-user'
    };

     this.sops.update(prev => prev.map(s => 
      s.issue_id === issueId ? { 
          ...s, 
          user_rating: rating,
          user_feedback: textFeedback,
          feedback: feedback
      } : s
    ));

    this.addTimelineEvent(issueId, {
        timestamp: Date.now(),
        actor: 'User',
        action: 'SOP Rated',
        details: `${rating}/5 Stars`,
        type: 'USER'
    });
  }
}