import { z } from "zod";

// Mirrors backend/firstseen/models.py. Change both together.

export const MatchSchema = z.object({
  title: z.string(),
  source: z.string().nullable(),
  link: z.string(),
  domain: z.string(),
  date_text: z.string().nullable(),
  date: z.string().nullable(),
  thumbnail: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  fact_checker: z.string().nullable(),
});

export const YearBucketSchema = z.object({
  year: z.number(),
  count: z.number(),
  examples: z.array(MatchSchema),
  tags: z.array(z.string()),
});

export const VerdictSchema = z.object({
  label: z.enum(["older_than_claimed", "first_seen", "no_history"]),
  headline: z.string(),
  detail: z.string(),
});

export const FactCheckSchema = z.object({
  title: z.string(),
  link: z.string(),
  publisher: z.string(),
  date_text: z.string().nullable(),
  found_in: z.enum(["copies", "similar"]),
});

export const ArticleSchema = z.object({
  title: z.string(),
  link: z.string(),
  source: z.string().nullable(),
  date_text: z.string().nullable(),
});

export const ContextSchema = z.object({
  kind: z.enum(["storm", "place", "event"]),
  label: z.string(),
  count: z.number(),
  first_year: z.number(),
  last_year: z.number(),
});

export const CheckReportSchema = z.object({
  check_id: z.string(),
  created_at: z.string(),
  mode: z.enum(["live", "cache", "replay"]),
  credits_used: z.number(),
  claim: z.string().nullable(),
  image_url: z.string().nullable(),
  searched_on: z.string(),
  total_matches: z.number(),
  dated_matches: z.number(),
  domains: z.number(),
  first_seen: MatchSchema.nullable(),
  earliest_uncorroborated: MatchSchema.nullable(),
  widely_shared_by: z.number().nullable(),
  years: z.array(YearBucketSchema),
  earliest: z.array(MatchSchema),
  verdict: VerdictSchema,
  fact_checks: z.array(FactCheckSchema),
  falsely_shared_as: z.array(z.string()),
  contexts: z.array(ContextSchema),
  scripts: z.array(z.object({ name: z.string(), count: z.number() })),
  current_news: z.object({ query: z.string(), articles: z.array(ArticleSchema) }).nullable(),
  reply: z.object({ en: z.string(), hi: z.string() }).nullable(),
  media: z.enum(["image", "video"]),
  frames: z.array(
    z.object({
      time_s: z.number(),
      scene_seconds: z.number(),
      copies: z.number(),
      first_seen: z.string().nullable(),
      first_seen_domain: z.string().nullable(),
    }),
  ),
});

export const CheckEventSchema = z.object({
  seq: z.number(),
  kind: z.enum(["info", "call", "done", "error"]),
  message: z.string(),
  cached: z.boolean().nullable(),
  credits_used: z.number(),
});

export const ExampleSchema = z.object({
  id: z.string(),
  label: z.string(),
  image_url: z.string(),
  claim: z.string(),
  thumbnail: z.string().optional(),
});

export type Match = z.infer<typeof MatchSchema>;
export type YearBucket = z.infer<typeof YearBucketSchema>;
export type Verdict = z.infer<typeof VerdictSchema>;
export type FactCheck = z.infer<typeof FactCheckSchema>;
export type Context = z.infer<typeof ContextSchema>;
export type CheckReport = z.infer<typeof CheckReportSchema>;
export type CheckEvent = z.infer<typeof CheckEventSchema>;
export type Example = z.infer<typeof ExampleSchema>;
