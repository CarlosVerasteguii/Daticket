import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "@supabase/supabase-js";
import { Image } from "@cross/image";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const THUMB_WIDTH = 512;
const THUMB_CONTENT_TYPE = "image/jpeg";
const BUCKET = "receipts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: JsonValue) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function thumbPathForReceipt(userId: string, receiptId: string) {
  return `${userId}/${receiptId}/thumb-${THUMB_WIDTH}.jpg`;
}

async function readBlobAsBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

async function createJpegThumbnail(originalBytes: Uint8Array) {
  const decoded = await Image.decode(originalBytes);

  const width = THUMB_WIDTH;
  const height = Math.max(1, Math.round((decoded.height * width) / decoded.width));

  const resized = decoded.resize({ width, height });

  const canvas = Image.create(width, height, 255, 255, 255);
  canvas.composite(resized, 0, 0);

  return { bytes: await canvas.encode("jpeg"), width, height };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    requireEnv("SUPABASE_URL", SUPABASE_URL);
    requireEnv("SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);
    requireEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "Server misconfigured" });
  }

  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  if (!isRecord(payload) || typeof payload.receipt_id !== "string") {
    return json(400, { error: "Body must include receipt_id (string)" });
  }

  const receiptId = payload.receipt_id;

  const bodyAccessToken = typeof payload.access_token === "string" ? payload.access_token : null;
  const rawAuthHeader = req.headers.get("Authorization");
  const authHeader =
    rawAuthHeader && rawAuthHeader.startsWith("Bearer ")
      ? rawAuthHeader
      : bodyAccessToken
        ? `Bearer ${bodyAccessToken}`
        : null;

  if (!authHeader) return json(401, { error: "Unauthorized" });

  const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) return json(401, { error: "Unauthorized" });

  const { data: receipt, error: receiptError } = await userClient
    .from("receipts")
    .select(
      `
      id,
      user_id,
      primary_file_id,
      thumbnail_file_id,
      primary_file:receipt_files!receipts_primary_file_id_fkey(
        id,
        path,
        mime_type,
        kind
      ),
      thumbnail_file:receipt_files!receipts_thumbnail_file_id_fkey(
        id,
        path,
        kind
      )
    `,
    )
    .eq("id", receiptId)
    .single();

  if (receiptError || !receipt) return json(404, { error: "Receipt not found" });

  const existingThumb = Array.isArray(receipt.thumbnail_file)
    ? receipt.thumbnail_file[0] ?? null
    : receipt.thumbnail_file ?? null;

  if (existingThumb?.path && typeof existingThumb.path === "string") {
    return json(200, { receipt_id: receiptId, thumbnail_path: existingThumb.path, thumbnail_file_id: existingThumb.id });
  }

  const primary = Array.isArray(receipt.primary_file) ? receipt.primary_file[0] ?? null : receipt.primary_file ?? null;
  if (!primary?.path || typeof primary.path !== "string") {
    return json(409, { error: "Receipt has no primary file yet" });
  }

  const thumbPath = thumbPathForReceipt(user.id, receiptId);

  const { data: originalBlob, error: downloadError } = await adminClient.storage.from(BUCKET).download(primary.path);
  if (downloadError || !originalBlob) return json(500, { error: "Failed to download original image" });

  const originalBytes = await readBlobAsBytes(originalBlob);

  let thumbBytes: Uint8Array;
  try {
    thumbBytes = (await createJpegThumbnail(originalBytes)).bytes;
  } catch (e) {
    return json(422, {
      error: "Unsupported image format for thumbnail generation",
      details: e instanceof Error ? e.message : null,
    });
  }

  const { error: uploadError } = await adminClient.storage.from(BUCKET).upload(thumbPath, thumbBytes, {
    contentType: THUMB_CONTENT_TYPE,
    upsert: true,
  });
  if (uploadError) return json(500, { error: "Failed to upload thumbnail" });

  const { data: thumbRow, error: upsertError } = await adminClient
    .from("receipt_files")
    .upsert(
      {
        receipt_id: receiptId,
        user_id: user.id,
        bucket_id: BUCKET,
        path: thumbPath,
        kind: "thumbnail",
        mime_type: THUMB_CONTENT_TYPE,
        size_bytes: thumbBytes.byteLength,
        source_file_id: primary.id,
      },
      { onConflict: "bucket_id,path" },
    )
    .select("id,path")
    .single();

  if (upsertError || !thumbRow) return json(500, { error: "Failed to upsert receipt_files thumbnail row" });

  const { error: linkError } = await adminClient
    .from("receipts")
    .update({ thumbnail_file_id: thumbRow.id })
    .eq("id", receiptId);

  if (linkError) return json(500, { error: "Failed to link thumbnail_file_id" });

  return json(200, { receipt_id: receiptId, thumbnail_path: thumbRow.path, thumbnail_file_id: thumbRow.id });
});
