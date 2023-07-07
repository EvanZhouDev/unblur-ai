/// <reference types="typescript" />

declare module "unblur-ai" {
	export type unblur = (from: string, to: images) => Promise<string>;
}
