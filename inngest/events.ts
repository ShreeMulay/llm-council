/**
 * Event type definitions for the AI Project Factory
 * 
 * These events are emitted by git hooks and consumed by Inngest functions.
 */

export interface GitCommitEvent {
  name: "git.commit";
  data: {
    project: string;
    sha: string;
    message: string;
    author?: string;
    timestamp: string;
  };
}

export interface GitPushEvent {
  name: "git.push";
  data: {
    project: string;
    branch: string;
    commits: number;
  };
}

export interface BeadsSyncEvent {
  name: "beads.sync";
  data: {
    project: string;
    issuesClosed: number;
    issuesCreated: number;
  };
}

export interface OpenSpecApprovedEvent {
  name: "openspec.approved";
  data: {
    project: string;
    changeId: string;
    taskCount: number;
  };
}

export interface OpenSpecArchivedEvent {
  name: "openspec.archived";
  data: {
    project: string;
    changeId: string;
    specsUpdated: string[];
  };
}

// Union type for all factory events
export type FactoryEvent = 
  | GitCommitEvent 
  | GitPushEvent 
  | BeadsSyncEvent 
  | OpenSpecApprovedEvent
  | OpenSpecArchivedEvent;
