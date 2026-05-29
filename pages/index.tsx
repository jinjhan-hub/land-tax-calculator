import { FormEvent, useState } from "react";

type StoreProfile = {
  storeCode: string;
  storeName: string | null;
  brokerageName: string | null;
  brokerName: string | null;
  brokerLicenseNo: string | null;
  watermarkText: string | null;
  expiresAt: string | null;
};

type LoginResponse =
  | {
      success: true;
      sessionToken: string;
      store: StoreProfile;
    }
  | {
      success: false;
      reason?: string;
    };

export default function Home() {
  const [storeCode, setStoreCode] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [store, setStore] = useState<StoreProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeCode: storeCode.trim(), authCode }),
      });
      const data = (await response.json()) as LoginResponse;
      if (!response.ok || !data.success) {
        setSessionToken("");
        setStore(null);
        setError(data.success === false && data.reason ? data.reason : "登入失敗");
        return;
      }

      setSessionToken(data.sessionToken);
      setStore(data.store);
    } catch {
      setSessionToken("");
      setStore(null);
      setError("登入失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="login-panel">
        <h1>土地增值稅自動試算系統</h1>
        <form onSubmit={handleLogin} className="login-form">
          <label>
            <span>分店代碼</span>
            <input
              autoComplete="username"
              inputMode="text"
              name="storeCode"
              onChange={(event) => setStoreCode(event.target.value)}
              required
              value={storeCode}
            />
          </label>
          <label>
            <span>分店驗證碼</span>
            <input
              autoComplete="current-password"
              name="authCode"
              onChange={(event) => setAuthCode(event.target.value)}
              required
              type="password"
              value={authCode}
            />
          </label>
          <button disabled={loading} type="submit">
            {loading ? "登入中..." : "登入"}
          </button>
        </form>
        {error ? <p className="status error">{error}</p> : null}
        {sessionToken && store ? (
          <div className="store-profile" aria-live="polite">
            <p>登入成功</p>
            <dl>
              <div>
                <dt>使用分店</dt>
                <dd>{store.storeName ?? store.storeCode}</dd>
              </div>
              <div>
                <dt>經紀業名稱</dt>
                <dd>{store.brokerageName ?? "-"}</dd>
              </div>
              <div>
                <dt>經紀人</dt>
                <dd>{store.brokerName ?? "-"}</dd>
              </div>
              <div>
                <dt>經紀人字號</dt>
                <dd>{store.brokerLicenseNo ?? "-"}</dd>
              </div>
              <div>
                <dt>到期日</dt>
                <dd>{store.expiresAt ?? "-"}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </section>
      <style jsx>{`
        .page-shell {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #f5f7fa;
          color: #172033;
        }

        .login-panel {
          width: min(100%, 420px);
          background: #ffffff;
          border: 1px solid #dbe2ea;
          border-radius: 8px;
          padding: 28px;
          box-shadow: 0 12px 32px rgba(23, 32, 51, 0.08);
        }

        h1 {
          margin: 0 0 24px;
          font-size: 24px;
          line-height: 1.3;
        }

        .login-form {
          display: grid;
          gap: 16px;
        }

        label {
          display: grid;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #c5cfdb;
          border-radius: 6px;
          padding: 11px 12px;
          font-size: 16px;
        }

        button {
          min-height: 44px;
          border: 0;
          border-radius: 6px;
          background: #176b87;
          color: #ffffff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }

        button:disabled {
          cursor: wait;
          opacity: 0.7;
        }

        .status {
          margin: 16px 0 0;
          font-size: 14px;
        }

        .error {
          color: #b42318;
        }

        .store-profile {
          margin-top: 20px;
          border-top: 1px solid #dbe2ea;
          padding-top: 16px;
        }

        .store-profile p {
          margin: 0 0 12px;
          font-weight: 700;
          color: #176b87;
        }

        dl {
          display: grid;
          gap: 10px;
          margin: 0;
        }

        dl div {
          display: grid;
          grid-template-columns: 96px 1fr;
          gap: 12px;
        }

        dt {
          color: #64748b;
        }

        dd {
          margin: 0;
        }
      `}</style>
    </main>
  );
}
