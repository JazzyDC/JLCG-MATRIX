type SqlValue = string | number | null;
type Row = Record<string, unknown>;

export interface Statement {
  bind(...values: SqlValue[]): Statement;
  all(): Promise<{ results: Row[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface WorkspaceDatabase {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown>;
}

interface Configuration {
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_D1_DATABASE_ID?: string;
  CLOUDFLARE_D1_API_TOKEN?: string;
}

interface QueryResult {
  success: boolean;
  results?: Row[];
}

/** Server-only D1 access for runtimes without a Cloudflare Worker binding. */
export function createRemoteDatabase(
  configuration: Configuration,
  request: typeof fetch = fetch,
): WorkspaceDatabase {
  const account = configuration.CLOUDFLARE_ACCOUNT_ID;
  const database = configuration.CLOUDFLARE_D1_DATABASE_ID;
  const token = configuration.CLOUDFLARE_D1_API_TOKEN;
  if (!account || !database || !token) {
    throw new Error(
      "Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, and CLOUDFLARE_D1_API_TOKEN in Vercel to connect the workspace database.",
    );
  }

  const endpoint =
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}` +
    `/d1/database/${encodeURIComponent(database)}/query`;

  async function query(sql: string, params: SqlValue[]) {
    const response = await request(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`D1 query failed (HTTP ${response.status}).`);
    }
    const payload = (await response.json()) as {
      success: boolean;
      result?: QueryResult[];
    };
    if (
      !payload.success ||
      !payload.result?.length ||
      payload.result.some((result) => !result.success)
    ) {
      throw new Error("D1 rejected the database query.");
    }
    return payload.result[0];
  }

  function prepare(sql: string, params: SqlValue[] = []): Statement {
    return {
      bind: (...values) => prepare(sql, values),
      async all() {
        const result = await query(sql, params);
        return { results: result.results ?? [] };
      },
      async first<T>() {
        const result = await query(sql, params);
        return (result.results?.[0] as T | undefined) ?? null;
      },
      run: () => query(sql, params),
    };
  }

  return {
    prepare,
    // The workspace only batches idempotent CREATE TABLE statements.
    // Run them in order; this method does not promise a transaction.
    async batch(statements) {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    },
  };
}
