import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const BATCH_SIZE = 15;
const REQUEST_DELAY_MS = 2000;
const SAVINGS_THRESHOLD = 0.15;
const HEB_SEARCH_URL = "https://www.heb.com.mx/api/catalog_system/pub/products/search";
const LOG_BUCKET = "scrape-logs";

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ts(): string {
  return new Date().toISOString();
}

function elapsed(startMs: number): string {
  return `${((performance.now() - startMs) / 1000).toFixed(2)}s`;
}

// ─── Logger ──────────────────────────────────────────────────────────
// Collects structured log entries in memory, then flushes them to
// Supabase Storage as JSON files at the end of the run.

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

interface LogEntry {
  timestamp: string;
  elapsed: string;
  level: LogLevel;
  step: string;
  message: string;
  data?: Record<string, unknown>;
}

class RunLogger {
  entries: LogEntry[] = [];
  productLogs: Map<string, LogEntry[]> = new Map();
  runId: string;
  runFolder: string;
  startMs: number;

  constructor() {
    const now = new Date();
    const dateStr = now.toISOString().replace(/:/g, "-").replace(/\.\d+Z$/, "");
    const shortId = crypto.randomUUID().slice(0, 8);
    this.runId = `${dateStr}_${shortId}`;
    this.runFolder = `runs/${now.toISOString().slice(0, 10)}/${this.runId}`;
    this.startMs = performance.now();
  }

  log(level: LogLevel, step: string, message: string, data?: Record<string, unknown>, productKey?: string) {
    const entry: LogEntry = {
      timestamp: ts(),
      elapsed: elapsed(this.startMs),
      level,
      step,
      message,
      ...(data ? { data } : {}),
    };
    this.entries.push(entry);

    if (productKey) {
      if (!this.productLogs.has(productKey)) {
        this.productLogs.set(productKey, []);
      }
      this.productLogs.get(productKey)!.push(entry);
    }

    // Also console.log for Supabase dashboard logs
    const prefix = `[${level}][${step}]`;
    if (level === "ERROR") {
      console.error(`${prefix} ${message}`, data || "");
    } else if (level === "WARN") {
      console.warn(`${prefix} ${message}`, data || "");
    } else {
      console.log(`${prefix} ${message}`, data ? JSON.stringify(data) : "");
    }
  }

  info(step: string, msg: string, data?: Record<string, unknown>, productKey?: string) {
    this.log("INFO", step, msg, data, productKey);
  }
  warn(step: string, msg: string, data?: Record<string, unknown>, productKey?: string) {
    this.log("WARN", step, msg, data, productKey);
  }
  error(step: string, msg: string, data?: Record<string, unknown>, productKey?: string) {
    this.log("ERROR", step, msg, data, productKey);
  }
  debug(step: string, msg: string, data?: Record<string, unknown>, productKey?: string) {
    this.log("DEBUG", step, msg, data, productKey);
  }

  async flush(adminClient: SupabaseClient, summary: Record<string, unknown>) {
    const totalElapsed = elapsed(this.startMs);

    // 1. Upload full run log (all entries)
    const fullLog = {
      run_id: this.runId,
      run_folder: this.runFolder,
      started_at: this.entries[0]?.timestamp,
      finished_at: ts(),
      total_elapsed: totalElapsed,
      total_entries: this.entries.length,
      summary,
      entries: this.entries,
    };

    await adminClient.storage
      .from(LOG_BUCKET)
      .upload(`${this.runFolder}/00_full-run-log.json`, JSON.stringify(fullLog, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    // 2. Upload summary file
    const summaryFile = {
      run_id: this.runId,
      ...summary,
      total_elapsed: totalElapsed,
      log_entries_count: this.entries.length,
      products_logged: this.productLogs.size,
      errors: this.entries.filter((e) => e.level === "ERROR").map((e) => ({
        step: e.step,
        message: e.message,
        data: e.data,
      })),
      warnings: this.entries.filter((e) => e.level === "WARN").map((e) => ({
        step: e.step,
        message: e.message,
        data: e.data,
      })),
    };

    await adminClient.storage
      .from(LOG_BUCKET)
      .upload(`${this.runFolder}/01_summary.json`, JSON.stringify(summaryFile, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    // 3. Upload individual product logs
    let fileIndex = 2;
    for (const [productKey, logs] of this.productLogs) {
      const safeName = productKey
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 60);
      const fileName = `${String(fileIndex).padStart(2, "0")}_product_${safeName}.json`;

      const productFile = {
        product_key: productKey,
        entries_count: logs.length,
        entries: logs,
      };

      await adminClient.storage
        .from(LOG_BUCKET)
        .upload(`${this.runFolder}/${fileName}`, JSON.stringify(productFile, null, 2), {
          contentType: "application/json",
          upsert: true,
        });

      fileIndex++;
    }

    this.info("flush", `Logs uploaded to Storage: ${this.runFolder}/ (${fileIndex} files)`);
  }
}

// ─── Types ───────────────────────────────────────────────────────────

interface HebSeller {
  sellerId: string;
  commertialOffer: {
    Price: number;
    ListPrice: number;
    AvailableQuantity: number;
    Installments?: unknown[];
  };
}

interface HebSkuItem {
  itemId: string;
  ean: string;
  sellers: HebSeller[];
}

interface HebProduct {
  productId: string;
  productName: string;
  brand: string;
  items: HebSkuItem[];
}

interface TrackedProduct {
  id: string;
  user_id: string;
  normalized_name: string;
  display_name: string;
  avg_purchase_price: number;
  heb_product_id: string | null;
  match_status: string;
}

// ─── HEB API ─────────────────────────────────────────────────────────

async function searchHeb(
  query: string,
  logger: RunLogger,
  productKey: string,
  attemptLabel: string,
): Promise<{ product: HebProduct | null; allProducts: HebProduct[]; rawStatus: number; rawUrl: string }> {
  const url = `${HEB_SEARCH_URL}?ft=${encodeURIComponent(query)}&_from=0&_to=2`;

  logger.debug("heb-search", `${attemptLabel}: Fetching URL`, { url, query }, productKey);

  const t0 = performance.now();
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Daticket/1.0 (price-monitor)",
      },
    });
  } catch (fetchErr) {
    logger.error("heb-search", `${attemptLabel}: Network error fetching HEB`, {
      query,
      error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
    }, productKey);
    return { product: null, allProducts: [], rawStatus: 0, rawUrl: url };
  }

  const fetchTime = `${((performance.now() - t0) / 1000).toFixed(2)}s`;

  logger.debug("heb-search", `${attemptLabel}: Response received`, {
    status: res.status,
    statusText: res.statusText,
    fetchTime,
    headers: Object.fromEntries(res.headers.entries()),
  }, productKey);

  if (!res.ok) {
    logger.warn("heb-search", `${attemptLabel}: Non-OK response from HEB`, {
      status: res.status,
      statusText: res.statusText,
      query,
    }, productKey);
    return { product: null, allProducts: [], rawStatus: res.status, rawUrl: url };
  }

  let allProducts: HebProduct[];
  try {
    allProducts = await res.json();
  } catch (parseErr) {
    logger.error("heb-search", `${attemptLabel}: Failed to parse JSON response`, {
      error: parseErr instanceof Error ? parseErr.message : String(parseErr),
    }, productKey);
    return { product: null, allProducts: [], rawStatus: res.status, rawUrl: url };
  }

  logger.info("heb-search", `${attemptLabel}: Got ${allProducts.length} result(s)`, {
    query,
    result_count: allProducts.length,
    fetchTime,
    results_preview: allProducts.slice(0, 3).map((p) => ({
      productId: p.productId,
      productName: p.productName,
      brand: p.brand,
      skus: p.items?.length ?? 0,
    })),
  }, productKey);

  return {
    product: allProducts.length > 0 ? allProducts[0] : null,
    allProducts,
    rawStatus: res.status,
    rawUrl: url,
  };
}

function extractHebPrice(
  product: HebProduct,
  logger: RunLogger,
  productKey: string,
): {
  price: number;
  listPrice: number;
  ean: string;
  isPromotion: boolean;
  sellerDetails: Record<string, unknown>;
} | null {
  logger.debug("price-extract", "Scanning SKUs and sellers", {
    productId: product.productId,
    productName: product.productName,
    total_skus: product.items?.length ?? 0,
    all_sellers: product.items?.flatMap((item) =>
      item.sellers?.map((s) => ({
        sku: item.itemId,
        ean: item.ean,
        sellerId: s.sellerId,
        price: s.commertialOffer?.Price,
        listPrice: s.commertialOffer?.ListPrice,
        stock: s.commertialOffer?.AvailableQuantity,
      }))
    ),
  }, productKey);

  for (const item of product.items ?? []) {
    for (const seller of item.sellers ?? []) {
      if (seller.sellerId === "1" && seller.commertialOffer.AvailableQuantity > 0) {
        const price = seller.commertialOffer.Price;
        const listPrice = seller.commertialOffer.ListPrice;
        const isPromotion = listPrice > price;
        const result = {
          price,
          listPrice,
          ean: item.ean || "",
          isPromotion,
          sellerDetails: {
            sellerId: seller.sellerId,
            skuId: item.itemId,
            ean: item.ean,
            availableQty: seller.commertialOffer.AvailableQuantity,
          },
        };

        logger.info("price-extract", `Found HEB seller price: $${price}${isPromotion ? ` (promo, regular $${listPrice})` : ""}`, {
          ...result,
        }, productKey);

        return result;
      }
    }
  }

  logger.warn("price-extract", "No valid HEB seller (sellerId=1) with stock found", {
    productId: product.productId,
    productName: product.productName,
  }, productKey);

  return null;
}

// ─── Main Handler ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const logger = new RunLogger();
  logger.info("init", "=== SCRAPE-HEB-PRICES RUN STARTED ===", {
    run_id: logger.runId,
    run_folder: logger.runFolder,
    config: { BATCH_SIZE, REQUEST_DELAY_MS, SAVINGS_THRESHOLD, HEB_SEARCH_URL, LOG_BUCKET },
  });

  // ── 1. Validate env vars ──
  logger.info("init", "Checking environment variables...");
  try {
    requireEnv("SUPABASE_URL", SUPABASE_URL);
    requireEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);
    logger.info("init", "Environment variables OK", {
      SUPABASE_URL: SUPABASE_URL!.replace(/\/\/(.{8}).*(@)/, "//$1...$2"),
    });
  } catch (e) {
    logger.error("init", "Missing environment variables", {
      error: e instanceof Error ? e.message : String(e),
    });
    return json(500, { error: e instanceof Error ? e.message : "Server misconfigured" });
  }

  // ── 2. Create admin client ──
  logger.info("init", "Creating Supabase admin client (service_role)...");
  const adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  logger.info("init", "Admin client created successfully");

  // ── 3. Fetch products to scrape ──
  logger.info("fetch-products", "Querying tracked_products...", {
    filters: { is_active: true, match_status: ["pending", "matched"] },
    order: "last_scraped_at ASC NULLS FIRST",
    limit: BATCH_SIZE,
  });

  const fetchT0 = performance.now();
  const { data: products, error: fetchError } = await adminClient
    .from("tracked_products")
    .select("id, user_id, normalized_name, display_name, avg_purchase_price, heb_product_id, match_status")
    .eq("is_active", true)
    .in("match_status", ["pending", "matched"])
    .order("last_scraped_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    logger.error("fetch-products", "Database query failed", {
      error: fetchError.message,
      code: fetchError.code,
      details: fetchError.details,
    });
    await logger.flush(adminClient, { status: "error", error: fetchError.message });
    return json(500, { error: "Failed to fetch tracked products", details: fetchError.message });
  }

  logger.info("fetch-products", `Fetched ${products?.length ?? 0} products in ${elapsed(fetchT0)}`, {
    count: products?.length ?? 0,
    products: (products ?? []).map((p: TrackedProduct) => ({
      id: p.id,
      name: p.display_name,
      normalized: p.normalized_name,
      avg_price: p.avg_purchase_price,
      match_status: p.match_status,
      has_heb_id: !!p.heb_product_id,
    })),
  });

  if (!products || products.length === 0) {
    logger.info("fetch-products", "No products to scrape. Run complete.");
    await logger.flush(adminClient, {
      status: "ok",
      message: "No products to scrape",
      processed: 0,
    });
    return json(200, { message: "No products to scrape", processed: 0, run_id: logger.runId });
  }

  // ── 4. Process each product ──
  let processed = 0;
  let matched = 0;
  let not_found = 0;
  let alerts_created = 0;
  let errors = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i] as TrackedProduct;
    const productKey = `${product.display_name} [${product.id.slice(0, 8)}]`;
    const productNum = `[${i + 1}/${products.length}]`;

    logger.info("process", `${productNum} ──────────────────────────────────────`, {}, productKey);
    logger.info("process", `${productNum} Starting product: "${product.display_name}"`, {
      id: product.id,
      normalized_name: product.normalized_name,
      display_name: product.display_name,
      avg_purchase_price: product.avg_purchase_price,
      current_match_status: product.match_status,
      heb_product_id: product.heb_product_id,
    }, productKey);

    const productT0 = performance.now();

    try {
      let hebProduct: HebProduct | null = null;
      let searchAttempts = 0;

      // ── 4a. Search HEB ──
      if (product.heb_product_id && product.match_status === "matched") {
        logger.info("search-strategy", `${productNum} Already matched (heb_id=${product.heb_product_id}), re-fetching by display name`, {}, productKey);
        const result = await searchHeb(product.display_name, logger, productKey, "Attempt 1 (re-fetch matched)");
        hebProduct = result.product;
        searchAttempts = 1;
      } else {
        logger.info("search-strategy", `${productNum} Status "${product.match_status}", searching by normalized name first`, {}, productKey);

        // Attempt 1: normalized name
        const result1 = await searchHeb(product.normalized_name, logger, productKey, "Attempt 1 (normalized)");
        hebProduct = result1.product;
        searchAttempts = 1;

        if (!hebProduct) {
          logger.info("search-strategy", `${productNum} Normalized name returned no results, trying display name as fallback`, {}, productKey);
          const result2 = await searchHeb(product.display_name, logger, productKey, "Attempt 2 (display name fallback)");
          hebProduct = result2.product;
          searchAttempts = 2;
        }
      }

      logger.info("search-result", `${productNum} Search complete after ${searchAttempts} attempt(s)`, {
        found: !!hebProduct,
        heb_product_id: hebProduct?.productId ?? null,
        heb_product_name: hebProduct?.productName ?? null,
      }, productKey);

      // ── 4b. No match found ──
      if (!hebProduct) {
        logger.warn("no-match", `${productNum} No HEB product found for "${product.display_name}"`, {
          action: "Marking as not_found",
        }, productKey);

        const { error: updateErr } = await adminClient
          .from("tracked_products")
          .update({ match_status: "not_found", last_scraped_at: new Date().toISOString() })
          .eq("id", product.id);

        if (updateErr) {
          logger.error("db-update", `${productNum} Failed to update match_status to not_found`, {
            error: updateErr.message,
          }, productKey);
        } else {
          logger.info("db-update", `${productNum} Updated match_status → not_found`, {}, productKey);
        }

        not_found++;
        processed++;
        logger.info("process", `${productNum} Product done in ${elapsed(productT0)} → NOT FOUND`, {}, productKey);
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      // ── 4c. Extract price ──
      logger.info("price", `${productNum} Extracting price from HEB product "${hebProduct.productName}"`, {}, productKey);
      const priceData = extractHebPrice(hebProduct, logger, productKey);

      if (!priceData) {
        logger.warn("price", `${productNum} No valid price data extracted, marking as not_found`, {}, productKey);

        const { error: updateErr } = await adminClient
          .from("tracked_products")
          .update({ match_status: "not_found", last_scraped_at: new Date().toISOString() })
          .eq("id", product.id);

        if (updateErr) {
          logger.error("db-update", `${productNum} Failed to update after no-price`, { error: updateErr.message }, productKey);
        }

        not_found++;
        processed++;
        logger.info("process", `${productNum} Product done in ${elapsed(productT0)} → NO PRICE`, {}, productKey);
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      // ── 4d. Update tracked_products ──
      logger.info("db-update", `${productNum} Updating tracked_products with HEB match info`, {
        heb_product_id: hebProduct.productId,
        heb_product_name: hebProduct.productName,
        heb_ean: priceData.ean,
        new_match_status: "matched",
      }, productKey);

      const { error: trackUpdateErr } = await adminClient
        .from("tracked_products")
        .update({
          heb_product_id: hebProduct.productId,
          heb_product_name: hebProduct.productName,
          heb_ean: priceData.ean,
          match_status: "matched",
          last_scraped_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (trackUpdateErr) {
        logger.error("db-update", `${productNum} Failed to update tracked_products`, {
          error: trackUpdateErr.message,
        }, productKey);
      } else {
        logger.info("db-update", `${productNum} tracked_products updated successfully`, {}, productKey);
      }

      // ── 4e. Upsert price snapshot ──
      logger.info("snapshot", `${productNum} Upserting price_snapshot`, {
        tracked_product_id: product.id,
        heb_price: priceData.price,
        heb_list_price: priceData.listPrice,
        is_promotion: priceData.isPromotion,
      }, productKey);

      const { data: snapshot, error: snapshotError } = await adminClient
        .from("price_snapshots")
        .upsert(
          {
            tracked_product_id: product.id,
            user_id: product.user_id,
            heb_price: priceData.price,
            heb_list_price: priceData.listPrice,
            is_promotion: priceData.isPromotion,
            promotion_text: priceData.isPromotion
              ? `Precio regular: $${priceData.listPrice.toFixed(2)}`
              : null,
          },
          { onConflict: "tracked_product_id,scrape_date" },
        )
        .select("id")
        .single();

      if (snapshotError) {
        logger.error("snapshot", `${productNum} Snapshot upsert FAILED`, {
          error: snapshotError.message,
          code: snapshotError.code,
        }, productKey);
        errors++;
        processed++;
        logger.info("process", `${productNum} Product done in ${elapsed(productT0)} → SNAPSHOT ERROR`, {}, productKey);
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      logger.info("snapshot", `${productNum} Snapshot upserted successfully`, {
        snapshot_id: snapshot.id,
      }, productKey);

      // ── 4f. Check for savings alert ──
      const savingsPercent =
        product.avg_purchase_price > 0
          ? (product.avg_purchase_price - priceData.price) / product.avg_purchase_price
          : 0;
      const savingsAmount = product.avg_purchase_price - priceData.price;

      logger.info("alert-check", `${productNum} Comparing prices`, {
        user_avg_price: product.avg_purchase_price,
        heb_price: priceData.price,
        difference: Number(savingsAmount.toFixed(2)),
        savings_percent: `${Math.round(savingsPercent * 100)}%`,
        threshold: `${SAVINGS_THRESHOLD * 100}%`,
        alert_triggered: savingsPercent >= SAVINGS_THRESHOLD,
      }, productKey);

      if (savingsPercent >= SAVINGS_THRESHOLD && snapshot) {
        const alertType = priceData.isPromotion ? "promotion" : "price_drop";

        logger.info("alert-create", `${productNum} ALERT TRIGGERED! Creating "${alertType}" alert`, {
          alert_type: alertType,
          heb_price: priceData.price,
          user_avg_price: product.avg_purchase_price,
          savings_percent: Math.round(savingsPercent * 100),
          savings_amount: Number(savingsAmount.toFixed(2)),
        }, productKey);

        const { error: alertErr } = await adminClient.from("price_alerts").insert({
          user_id: product.user_id,
          tracked_product_id: product.id,
          snapshot_id: snapshot.id,
          alert_type: alertType,
          heb_price: priceData.price,
          user_avg_price: product.avg_purchase_price,
          savings_percent: Math.round(savingsPercent * 100),
          savings_amount: Number(savingsAmount.toFixed(2)),
        });

        if (alertErr) {
          logger.error("alert-create", `${productNum} Failed to insert alert`, {
            error: alertErr.message,
          }, productKey);
        } else {
          logger.info("alert-create", `${productNum} Alert inserted successfully`, {}, productKey);
          alerts_created++;
        }
      } else {
        logger.info("alert-check", `${productNum} No alert needed (savings ${Math.round(savingsPercent * 100)}% < threshold ${SAVINGS_THRESHOLD * 100}%)`, {}, productKey);
      }

      matched++;
      processed++;
      logger.info("process", `${productNum} Product done in ${elapsed(productT0)} → OK (HEB $${priceData.price}, you pay avg $${product.avg_purchase_price})`, {}, productKey);
    } catch (err) {
      logger.error("process", `${productNum} UNCAUGHT ERROR processing "${product.display_name}"`, {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      }, productKey);
      errors++;
      processed++;
    }

    // Rate limiting
    if (i < products.length - 1) {
      logger.debug("rate-limit", `Sleeping ${REQUEST_DELAY_MS}ms before next product...`, {}, productKey);
      await sleep(REQUEST_DELAY_MS);
    }
  }

  // ── 5. Final summary ──
  const summary = {
    status: "completed",
    run_id: logger.runId,
    processed,
    matched,
    not_found,
    alerts_created,
    errors,
    total_products_in_batch: products.length,
  };

  logger.info("summary", "=== RUN COMPLETE ===", summary);
  logger.info("summary", `Matched: ${matched} | Not found: ${not_found} | Alerts: ${alerts_created} | Errors: ${errors}`);

  // ── 6. Flush logs to Storage ──
  logger.info("flush", "Flushing logs to Supabase Storage...");
  try {
    await logger.flush(adminClient, summary);
    logger.info("flush", "Logs flushed successfully");
  } catch (flushErr) {
    console.error("[FLUSH ERROR] Failed to upload logs:", flushErr);
  }

  return json(200, {
    ...summary,
    log_folder: logger.runFolder,
    message: `Processed ${processed} products (${matched} matched, ${not_found} not found, ${alerts_created} alerts, ${errors} errors)`,
  });
});
