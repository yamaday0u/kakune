import { describe, test, expect, vi, beforeEach } from "vitest";
import { loader } from "./app-history-item-logs";
import { createSupabaseClient } from "~/lib/supabase.server";

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseClient: vi.fn(),
}));

const mockCreateSupabaseClient = vi.mocked(createSupabaseClient);

// ─── ヘルパー ──────────────────────────────────────────────────────────────────

/** Supabase クエリビルダーのチェーンをモックする */
function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    lt: () => chain,
    not: () => chain,
    in: () => chain,
    order: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
  };
  return chain;
}

function makeMockSupabase({
  user = { id: "user-1" } as { id: string } | null,
  item = { id: "item-1", name: "鍵", icon: "🔑" } as unknown,
  logs = [] as unknown[],
  signedUrl = null as string | null,
} = {}) {
  const mockCreateSignedUrl = vi.fn().mockResolvedValue({
    data: signedUrl ? { signedUrl } : null,
    error: null,
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((table: string) => {
      if (table === "check_items") return makeChain({ data: item, error: null });
      if (table === "check_logs") return makeChain({ data: logs, error: null });
      return makeChain({ data: null, error: null });
    }),
    storage: {
      from: () => ({ createSignedUrl: mockCreateSignedUrl }),
    },
  };
}

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/app/history/item-logs");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString());
}

// ─── テスト ────────────────────────────────────────────────────────────────────

describe("loader - /app/history/item-logs", () => {
  beforeEach(() => {
    mockCreateSupabaseClient.mockReturnValue(makeMockSupabase() as never);
  });

  // --- 認証 ---

  test("未認証の場合 401 を返す", async () => {
    mockCreateSupabaseClient.mockReturnValue(
      makeMockSupabase({ user: null }) as never,
    );
    const response = await loader({
      request: makeRequest({ itemId: "item-1", date: "2024-01-15" }),
    } as never);
    expect(response.status).toBe(401);
  });

  // --- バリデーション ---

  test("itemId が欠けている場合 400 を返す", async () => {
    const response = await loader({
      request: makeRequest({ date: "2024-01-15" }),
    } as never);
    expect(response.status).toBe(400);
  });

  test("date が欠けている場合 400 を返す", async () => {
    const response = await loader({
      request: makeRequest({ itemId: "item-1" }),
    } as never);
    expect(response.status).toBe(400);
  });

  test("date のフォーマットが不正な場合 400 を返す", async () => {
    const response = await loader({
      request: makeRequest({ itemId: "item-1", date: "2024/01/15" }),
    } as never);
    expect(response.status).toBe(400);
  });

  // --- Not Found ---

  test("アイテムが存在しない場合 404 を返す", async () => {
    mockCreateSupabaseClient.mockReturnValue(
      makeMockSupabase({ item: null }) as never,
    );
    const response = await loader({
      request: makeRequest({ itemId: "item-1", date: "2024-01-15" }),
    } as never);
    expect(response.status).toBe(404);
  });

  // --- 正常系 ---

  test("正常ケース: item と logs を返す", async () => {
    const logs = [
      {
        id: "log-1",
        checked_at: "2024-01-15T10:00:00Z",
        photo_path: null,
        photo_deleted_at: null,
      },
    ];
    mockCreateSupabaseClient.mockReturnValue(
      makeMockSupabase({ logs }) as never,
    );
    const response = await loader({
      request: makeRequest({ itemId: "item-1", date: "2024-01-15" }),
    } as never);
    // data() は React Router v7 では Response ではなく { data, init } を返す
    const body = (response as { data: { item: unknown; logs: unknown[] } }).data;
    expect(body.item).toMatchObject({ id: "item-1", name: "鍵" });
    expect(body.logs).toHaveLength(1);
    expect((body.logs[0] as { signedUrl: unknown }).signedUrl).toBeNull();
  });

  test("photo_path あり: 署名付き URL が logs に含まれる", async () => {
    const logs = [
      {
        id: "log-1",
        checked_at: "2024-01-15T10:00:00Z",
        photo_path: "user-1/abc.webp",
        photo_deleted_at: null,
      },
    ];
    mockCreateSupabaseClient.mockReturnValue(
      makeMockSupabase({
        logs,
        signedUrl: "https://example.com/signed.webp",
      }) as never,
    );
    const response = await loader({
      request: makeRequest({ itemId: "item-1", date: "2024-01-15" }),
    } as never);
    const body = (response as { data: { logs: { signedUrl: unknown }[] } }).data;
    expect(body.logs[0].signedUrl).toBe("https://example.com/signed.webp");
  });

  test("photo_path なし: signedUrl は null のまま（署名 URL 生成を呼ばない）", async () => {
    const logs = [
      {
        id: "log-1",
        checked_at: "2024-01-15T10:00:00Z",
        photo_path: null,
        photo_deleted_at: null,
      },
    ];
    mockCreateSupabaseClient.mockReturnValue(
      makeMockSupabase({ logs }) as never,
    );
    const response = await loader({
      request: makeRequest({ itemId: "item-1", date: "2024-01-15" }),
    } as never);
    const body = (response as { data: { logs: { signedUrl: unknown }[] } }).data;
    expect(body.logs[0].signedUrl).toBeNull();
  });

  test("photo_deleted_at あり: photo_deleted_at が logs に含まれ signedUrl は null", async () => {
    const logs = [
      {
        id: "log-1",
        checked_at: "2024-01-15T10:00:00Z",
        photo_path: null,
        photo_deleted_at: "2024-01-18T15:00:00Z",
      },
    ];
    mockCreateSupabaseClient.mockReturnValue(
      makeMockSupabase({ logs }) as never,
    );
    const response = await loader({
      request: makeRequest({ itemId: "item-1", date: "2024-01-15" }),
    } as never);
    const body = (response as {
      data: { logs: { photo_deleted_at: unknown; signedUrl: unknown }[] };
    }).data;
    expect(body.logs[0].photo_deleted_at).toBe("2024-01-18T15:00:00Z");
    expect(body.logs[0].signedUrl).toBeNull();
  });
});
