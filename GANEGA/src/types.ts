export interface Review {
  id: number;
  google_review_id: string;
  author_name: string;
  review_text: string;
  star_rating: number;
  reviewer_language?: string;
  review_created_at: string;
  app_version_name: string;
  device?: string;
  data_source: 'REAL_GOOGLE_PLAY' | 'HISTORICAL_GOOGLE_PLAY_EXPORT' | 'SYNTHETIC_DEMO';
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  issue_category?: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  urgency_score?: number;
  confidence_score?: number;
  evidence_span?: string;
  detected_issue?: string;
  repeated_issue_flag?: boolean | number;
  analysis_status?: string;
  case_id?: number;
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
  priority_score?: number;
  qc_status?: 'NEW' | 'UNDER_REVIEW' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  assigned_to?: string | null;
  sla?: {
    priority: string;
    targetMin: number;
    elapsedMin: number;
    status: 'WITHIN_SLA' | 'APPROACHING_SLA' | 'SLA_BREACHED';
  };
}

export interface ReviewAnalysis {
  id: number;
  review_id: number;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  issue_category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  urgency_score: number;
  confidence_score: number;
  complaint_summary: string;
  detected_issue: string;
  recommended_action: string;
  evidence_span: string;
  repeated_issue_flag: boolean | number;
  analysis_status: string;
  analysis_model: string;
  analyzed_at: string;
}

export interface QCCase {
  case_id: number;
  review_id: number;
  google_review_id: string;
  author_name: string;
  review_text: string;
  star_rating: number;
  app_version_name: string;
  issue_category: string;
  severity: string;
  urgency_score: number;
  detected_issue: string;
  evidence_span: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  priority_score: number;
  priority_reasons: string[];
  status: 'NEW' | 'UNDER_REVIEW' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  assigned_to: string | null;
  queue_created_at: string;
  first_action_at: string | null;
  resolved_at: string | null;
  operator_note: string | null;
  resolution_note: string | null;
  sla: {
    priority: string;
    targetMin: number;
    elapsedMin: number;
    status: 'WITHIN_SLA' | 'APPROACHING_SLA' | 'SLA_BREACHED';
  };
}

export interface IssueCluster {
  id: number;
  cluster_name: string;
  category: string;
  issue_description: string;
  occurrence_count: number;
  previous_period_count: number;
  current_period_count: number;
  growth_percentage: number | null;
  trend_direction: 'INCREASING' | 'STABLE' | 'DECREASING' | 'NEW_ISSUE';
  severity: string;
  first_detected_at: string;
  last_detected_at: string;
  cluster_confidence: number;
}

export interface BottleneckMetrics {
  totalOpenCases: number;
  p1Open: number;
  p2Open: number;
  slaBreachesP1: number;
  slaBreachesP2: number;
  avgQueueAgeMinutes: number;
  medianQueueAgeMinutes: number;
  oldestCaseAgeMinutes: number;
  oldestCaseId: number | null;
  topUnresolvedCategory: string;
  categoryBacklog: Record<string, number>;
  operatorWorkload: Record<string, number>;
  alerts: {
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    message: string;
    evidence: string;
  }[];
}

export interface ResearchEvaluation {
  hypothesis: string;
  status: string;
  totalAnnotations: number;
  accuracy: {
    sentiment: number | null;
    category: number | null;
    severity: number | null;
    priority: number | null;
  };
  processingTime: {
    controlMeanSec: number | null;
    treatmentMeanSec: number | null;
    timeReductionPct: number | null;
  };
  confusionMatrix: Record<string, Record<string, number>>;
  marketTests: any[];
  rawAnnotations?: any[];
}

export interface SystemHealth {
  appName: string;
  packageName: string;
  activeDataSource: 'REAL_GOOGLE_PLAY' | 'HISTORICAL_GOOGLE_PLAY_EXPORT' | 'SYNTHETIC_DEMO';
  diagnostics: {
    credentials: { status: 'PASS' | 'FAIL'; explanation: string; action: string };
    googleApi: { status: 'PASS' | 'FAIL'; explanation: string; action: string };
    playConsole: { status: 'PASS' | 'FAIL'; explanation: string; action: string };
    packageAccess: { status: 'PASS' | 'FAIL'; explanation: string; action: string };
    reviewEndpoint: { status: 'PASS' | 'FAIL'; explanation: string; action: string };
    database: { status: 'PASS' | 'FAIL'; explanation: string; action: string };
    gemini: { status: 'PASS' | 'FAIL'; explanation: string; action: string };
    worker: { status: 'PASS' | 'FAIL'; explanation: string; action: string };
  };
  metrics: {
    totalReviews: number;
    pendingAnalysis: number;
    failedAnalysis: number;
    lastSync: string;
    apiRequestsThisHour: number;
    apiLimitPerHour: number;
  };
}

export interface AppConfig {
  appName: string;
  packageName: string;
  pollingInterval: number;
  priorityThresholds: {
    p1: number;
    p2: number;
    p3: number;
  };
  slaThresholds: {
    p1Minutes: number;
    p2Minutes: number;
    p3Minutes: number;
    p4Minutes: number;
  };
  privacyMaskAuthors: boolean;
  geminiModel: string;
}
