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

export interface DigestState {
  openLoops: OpenLoop[];
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
  activeThreads: string[];
  reminders: string[];
  ideaBridges: string[];
  nextSteps: string[];
  staleNeedsCleanup: string[];
  discordDigest: string;
}
