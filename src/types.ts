export interface OpenLoop {
  id: string;
  title: string;
  owner?: string;
  relatedPeople?: string[];
  relatedCompany?: string;
  status: "open" | "waiting" | "resolved" | "stale" | "unclear";
  priority: "high" | "medium" | "low";
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  lastMentionedAt?: string;
  evidence: string[];
  nextAction?: string;
}

export interface LivingContext {
  activeClients: string[];         // clients mentioned recently with job/status info
  keyDecisions: string[];          // decisions made, with date
  teamNotes: string[];             // anything notable about team members
  vendorStatus: string[];          // vendor/partner updates
  pricingNotes: string[];          // any pricing decisions or exceptions mentioned
  businessUpdates: string[];       // anything that changes how the business is operating
  updatedAt: string;
}

export interface DigestState {
  openLoops: OpenLoop[];
  livingContext?: LivingContext;
  lastRunAt?: string;
  recentDigestIds?: string[];
}

export interface NormalizedMessage {
  channelId: string;
  channelName: string;
  messageId: string;
  authorId: string;
  authorDisplayName: string;
  timestamp: string;
  content: string;
}

export interface ClaudeDigestOutput {
  summaryTitle: string;
  topPriorities: string[];
  openLoops: OpenLoop[];
  livingContext: LivingContext;
  activeThreads: string[];
  reminders: string[];
  ideaBridges: string[];
  nextSteps: string[];
  staleNeedsCleanup: string[];
  discordDigest: string;
}
