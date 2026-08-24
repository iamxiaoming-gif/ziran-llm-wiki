import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

export default tseslint.config(
	{
		ignores: ["**/node_modules/**", "**/main.js", "**/esbuild.config.mjs"],
	},
	...obsidianmd.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"@typescript-eslint/require-await": "off",
			"@typescript-eslint/no-base-to-string": "off",
			"obsidianmd/ui/sentence-case": "off",
		},
	},
);
