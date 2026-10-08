import { z } from "zod";
import { CheckReportSchema, ExampleSchema, type CheckReport, type Example } from "./schema";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function startCheck(input: { file?: File | null; imageUrl?: string; claim?: string }): Promise<string> {
  const form = new FormData();
  if (input.file) form.append("file", input.file);
  if (input.imageUrl) form.append("image_url", input.imageUrl);
  if (input.claim) form.append("claim", input.claim);
  const res = await fetch(`${API_URL}/api/checks`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Check did not start (${res.status}): ${await res.text()}`);
  const body = (await res.json()) as { check_id: string };
  return body.check_id;
}

export async function getReport(checkId: string): Promise<CheckReport> {
  const res = await fetch(`${API_URL}/api/checks/${checkId}`);
  if (!res.ok) throw new Error(`Report unavailable (${res.status})`);
  return CheckReportSchema.parse(await res.json());
}

export async function getExamples(): Promise<Example[]> {
  const res = await fetch(`${API_URL}/api/examples`);
  if (!res.ok) return [];
  return z.array(ExampleSchema).parse(await res.json());
}

export function eventsUrl(checkId: string): string {
  return `${API_URL}/api/checks/${checkId}/events`;
}
