import type { NextApiRequest, NextApiResponse } from "next";

type ProxyResult = {
  status: number;
  body: Record<string, unknown>;
};

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getOrigin(req: NextApiRequest): string {
  const host = firstHeader(req.headers["x-forwarded-host"]) ?? req.headers.host;
  const protocol = firstHeader(req.headers["x-forwarded-proto"]) ?? "https";
  if (!host) {
    throw new Error("UNKNOWN_ERROR");
  }
  return `${protocol}://${host}`;
}

export function assertPost(req: NextApiRequest, res: NextApiResponse): boolean {
  if (req.method === "POST") return true;
  res.setHeader("Allow", "POST");
  res.status(405).json({ success: false, errorCode: "UNKNOWN_ERROR", stage: "method" });
  return false;
}

export async function proxyJsonPost(req: NextApiRequest, path: string, includeAuthorization = false): Promise<ProxyResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (includeAuthorization && req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }

  const response = await fetch(`${getOrigin(req)}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(req.body ?? {}),
  });
  const body = (await response.json()) as Record<string, unknown>;
  return { status: response.status, body };
}

export function toGptsError(source: ProxyResult, stage: string) {
  return {
    success: false,
    errorCode: typeof source.body.errorCode === "string" ? source.body.errorCode : "UNKNOWN_ERROR",
    reason: typeof source.body.reason === "string" ? source.body.reason : undefined,
    stage,
    sourceStatus: source.status,
  };
}
