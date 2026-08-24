export type FeynmanVerdict = "correct" | "partial" | "incorrect" | "unverifiable";

export interface KnowledgeEvidence {
	id: string;
	path: string;
	title: string;
	excerpt: string;
	score: number;
}

export interface FeynmanClaim {
	userClaim: string;
	verdict: FeynmanVerdict;
	explanation: string;
	correction: string;
	evidenceIds: string[];
}

export interface FeynmanScores {
	accuracy: number;
	completeness: number;
	clarity: number;
}

export interface FeynmanEvaluation {
	topic: string;
	overallVerdict: FeynmanVerdict;
	summary: string;
	scores: FeynmanScores;
	claims: FeynmanClaim[];
	missingPoints: string[];
	reviewQuestions: string[];
	evidence: KnowledgeEvidence[];
	createdAt: string;
}

export interface RecordedAudio {
	blob: Blob;
	mimeType: string;
	durationSeconds: number;
	originalFilename?: string;
}
