declare module 'astro:content' {
	interface Render {
		'.mdx': Promise<{
			Content: import('astro').MarkdownInstance<{}>['Content'];
			headings: import('astro').MarkdownHeading[];
			remarkPluginFrontmatter: Record<string, any>;
		}>;
	}
}

declare module 'astro:content' {
	interface RenderResult {
		Content: import('astro/runtime/server/index.js').AstroComponentFactory;
		headings: import('astro').MarkdownHeading[];
		remarkPluginFrontmatter: Record<string, any>;
	}
	interface Render {
		'.md': Promise<RenderResult>;
	}

	export interface RenderedContent {
		html: string;
		metadata?: {
			imagePaths: Array<string>;
			[key: string]: unknown;
		};
	}
}

declare module 'astro:content' {
	type Flatten<T> = T extends { [K: string]: infer U } ? U : never;

	export type CollectionKey = keyof AnyEntryMap;
	export type CollectionEntry<C extends CollectionKey> = Flatten<AnyEntryMap[C]>;

	export type ContentCollectionKey = keyof ContentEntryMap;
	export type DataCollectionKey = keyof DataEntryMap;

	type AllValuesOf<T> = T extends any ? T[keyof T] : never;
	type ValidContentEntrySlug<C extends keyof ContentEntryMap> = AllValuesOf<
		ContentEntryMap[C]
	>['slug'];

	/** @deprecated Use `getEntry` instead. */
	export function getEntryBySlug<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		// Note that this has to accept a regular string too, for SSR
		entrySlug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;

	/** @deprecated Use `getEntry` instead. */
	export function getDataEntryById<C extends keyof DataEntryMap, E extends keyof DataEntryMap[C]>(
		collection: C,
		entryId: E,
	): Promise<CollectionEntry<C>>;

	export function getCollection<C extends keyof AnyEntryMap, E extends CollectionEntry<C>>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => entry is E,
	): Promise<E[]>;
	export function getCollection<C extends keyof AnyEntryMap>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => unknown,
	): Promise<CollectionEntry<C>[]>;

	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(entry: {
		collection: C;
		slug: E;
	}): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(entry: {
		collection: C;
		id: E;
	}): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		slug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(
		collection: C,
		id: E,
	): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;

	/** Resolve an array of entry references from the same collection */
	export function getEntries<C extends keyof ContentEntryMap>(
		entries: {
			collection: C;
			slug: ValidContentEntrySlug<C>;
		}[],
	): Promise<CollectionEntry<C>[]>;
	export function getEntries<C extends keyof DataEntryMap>(
		entries: {
			collection: C;
			id: keyof DataEntryMap[C];
		}[],
	): Promise<CollectionEntry<C>[]>;

	export function render<C extends keyof AnyEntryMap>(
		entry: AnyEntryMap[C][string],
	): Promise<RenderResult>;

	export function reference<C extends keyof AnyEntryMap>(
		collection: C,
	): import('astro/zod').ZodEffects<
		import('astro/zod').ZodString,
		C extends keyof ContentEntryMap
			? {
					collection: C;
					slug: ValidContentEntrySlug<C>;
				}
			: {
					collection: C;
					id: keyof DataEntryMap[C];
				}
	>;
	// Allow generic `string` to avoid excessive type errors in the config
	// if `dev` is not running to update as you edit.
	// Invalid collection names will be caught at build time.
	export function reference<C extends string>(
		collection: C,
	): import('astro/zod').ZodEffects<import('astro/zod').ZodString, never>;

	type ReturnTypeOrOriginal<T> = T extends (...args: any[]) => infer R ? R : T;
	type InferEntrySchema<C extends keyof AnyEntryMap> = import('astro/zod').infer<
		ReturnTypeOrOriginal<Required<ContentConfig['collections'][C]>['schema']>
	>;

	type ContentEntryMap = {
		"blog": {
"bloodwork-guide.md": {
	id: "bloodwork-guide.md";
  slug: "bloodwork-guide";
  body: string;
  collection: "blog";
  data: any
} & { render(): Render[".md"] };
"bpc-157-guide.md": {
	id: "bpc-157-guide.md";
  slug: "bpc-157-guide";
  body: string;
  collection: "blog";
  data: any
} & { render(): Render[".md"] };
"cjc-ipamorelin-stack.md": {
	id: "cjc-ipamorelin-stack.md";
  slug: "cjc-ipamorelin-stack";
  body: string;
  collection: "blog";
  data: any
} & { render(): Render[".md"] };
"fat-loss-protocol-case-study.md": {
	id: "fat-loss-protocol-case-study.md";
  slug: "fat-loss-protocol-case-study";
  body: string;
  collection: "blog";
  data: any
} & { render(): Render[".md"] };
"ghk-cu-guide.md": {
	id: "ghk-cu-guide.md";
  slug: "ghk-cu-guide";
  body: string;
  collection: "blog";
  data: any
} & { render(): Render[".md"] };
"glp1-comparison.md": {
	id: "glp1-comparison.md";
  slug: "glp1-comparison";
  body: string;
  collection: "blog";
  data: any
} & { render(): Render[".md"] };
"injection-techniques.md": {
	id: "injection-techniques.md";
  slug: "injection-techniques";
  body: string;
  collection: "blog";
  data: any
} & { render(): Render[".md"] };
"reconstitution-guide.md": {
	id: "reconstitution-guide.md";
  slug: "reconstitution-guide";
  body: string;
  collection: "blog";
  data: any
} & { render(): Render[".md"] };
"sa-peptide-sourcing.md": {
	id: "sa-peptide-sourcing.md";
  slug: "sa-peptide-sourcing";
  body: string;
  collection: "blog";
  data: any
} & { render(): Render[".md"] };
"sahpra-peptide-regulations.md": {
	id: "sahpra-peptide-regulations.md";
  slug: "sahpra-peptide-regulations";
  body: string;
  collection: "blog";
  data: any
} & { render(): Render[".md"] };
"tb-500-guide.md": {
	id: "tb-500-guide.md";
  slug: "tb-500-guide";
  body: string;
  collection: "blog";
  data: any
} & { render(): Render[".md"] };
};

	};

	type DataEntryMap = {
		"categories": Record<string, {
  id: string;
  collection: "categories";
  data: any;
}>;
"guides": Record<string, {
  id: string;
  collection: "guides";
  data: any;
}>;
"peptides": Record<string, {
  id: string;
  collection: "peptides";
  data: any;
}>;

	};

	type AnyEntryMap = ContentEntryMap & DataEntryMap;

	export type ContentConfig = never;
}
