import type { LLMWikiSettings } from "../../settings";
import type { AgentsContext } from "./agents-extractor";
import { buildRolePrompt } from "./system";
import { buildAgentsRulesPrompt } from "./agents-extractor";
import { buildConstraintsPrompt } from "./constraints";
import { buildBatchRulesPrompt } from "./batch";

export { extractAgentsContext, DEFAULT_AGENTS_CONTEXT } from "./agents-extractor";
export type { AgentsContext } from "./agents-extractor";

export function buildSystemPrompt(
	settings: LLMWikiSettings,
	agentsContext: AgentsContext | null,
	memoryContext: string = ""
): string {
	const sections: string[] = [];

	sections.push(buildRolePrompt(settings));
	sections.push(buildAgentsRulesPrompt(agentsContext));
	sections.push(buildConstraintsPrompt());
	sections.push(buildBatchRulesPrompt());

	if (memoryContext.trim()) {
		sections.push(`# 我的记忆\n\n${memoryContext}`);
	}

	return sections.join("\n\n---\n\n");
}
