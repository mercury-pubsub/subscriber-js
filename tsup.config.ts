import { createEnv } from "@t3-oss/env-core";
import { defineConfig } from "tsup";
import { z } from "zod";

const env = createEnv({
	server: {
		// biome-ignore lint/style/useNamingConvention: environment variable name
		BASE_URL: z.string().url(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});

export default defineConfig({
	entry: ["src/index.ts"],
	target: "es5",
	minify: true,
	format: ["cjs", "esm"],
	env: {
		// biome-ignore lint/style/useNamingConvention: environment variable name
		BASE_URL: env.BASE_URL,
	},
	dts: true,
	sourcemap: true,
	splitting: false,
	clean: true,
	treeshake: true,
});
