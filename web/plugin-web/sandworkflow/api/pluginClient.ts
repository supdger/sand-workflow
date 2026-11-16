import { env } from '@/config/env';
import i18n from '@/i18n/i18n';
import { getToken } from '@/lib/authToken';

/**
 * 插件后端请求封装。宿主 adminClient 固定走 `/api/admin/v1` 的 1.x 契约，
 * 而插件后端是 SaiAdmin 风格：路由挂在后端根路径 `/app/sandworkflow/admin`
 * （plugin/sandworkflow/config/route.php），响应壳 `{code:number, message, data}`，
 * code===200 为成功，业务失败时 HTTP 仍为 200、靠 body code 区分（ApiException::render）。
 * 两套契约不兼容，故独立一层薄封装，只复用宿主 token 与环境配置。
 */

const PLUGIN_API_PREFIX = '/app/sandworkflow/admin';

/**
 * env.apiBaseUrl 指向宿主 1.x 前缀（默认 `/api`）；插件路由挂在后端根路径，
 * 去掉 apiBaseUrl 末尾的 `/api` 段即得同源后端基地址。宿主若后续统一前缀，
 * 只改这一处。
 */
function pluginBaseUrl(): string {
  const base = env.apiBaseUrl.replace(/\/+$/, '');
  const origin = base.endsWith('/api') ? base.slice(0, -'/api'.length) : base;
  return `${origin}${PLUGIN_API_PREFIX}`;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type PluginQueryValue = string | number | boolean | null | undefined;
export type PluginQuery = Record<string, PluginQueryValue | PluginQueryValue[]>;

export interface PluginRequestOptions {
  query?: PluginQuery;
  signal?: AbortSignal;
}

/**
 * 插件请求失败。`code` 是后端数字业务码（0 为合成码）；
 * `system` 标记网络/5xx/响应不可读这类基础设施失败。
 */
export class PluginApiError extends Error {
  code: number;
  httpStatus: number;
  method: string;
  url: string;
  system: boolean;

  constructor(shape: {
    code: number;
    message: string;
    httpStatus: number;
    method: string;
    url: string;
    system?: boolean;
  }) {
    super(shape.message);
    this.name = 'PluginApiError';
    this.code = shape.code;
    this.httpStatus = shape.httpStatus;
    this.method = shape.method;
    this.url = shape.url;
    this.system = shape.system ?? false;
  }
}

export function isPluginApiError(error: unknown): error is PluginApiError {
  return error instanceof PluginApiError;
}

export function isPluginSystemError(error: unknown): error is PluginApiError {
  return error instanceof PluginApiError && error.system;
}

/** 业务错误直接展示后端中文 message；其余用调用方兜底文案。 */
export function pluginErrorMessage(error: unknown, fallback: string): string {
  return error instanceof PluginApiError && error.message ? error.message : fallback;
}

function buildUrl(path: string, query?: PluginQuery): string {
  const url = `${pluginBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) {
    return url;
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (item === null || item === undefined || item === '') {
        continue;
      }
      params.append(key, String(item));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function systemError(
  init: { code?: number; method: string; url: string; httpStatus: number },
  network: boolean,
): PluginApiError {
  return new PluginApiError({
    code: init.code ?? 0,
    message: i18n.t(network ? 'errors.network.message' : 'errors.system.message'),
    httpStatus: init.httpStatus,
    method: init.method,
    url: init.url,
    system: true,
  });
}

interface PluginEnvelope {
  code?: number;
  message?: string;
  data?: unknown;
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body: unknown,
  options?: PluginRequestOptions,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = buildUrl(path, options?.query);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options?.signal,
    });
  } catch {
    throw systemError({ code: 0, method, url, httpStatus: 0 }, true);
  }

  const status = res.status;
  let payload: PluginEnvelope | null = null;
  try {
    payload = (await res.json()) as PluginEnvelope;
  } catch {
    payload = null;
  }

  if (!res.ok || status >= 500) {
    throw systemError(
      { code: typeof payload?.code === 'number' ? payload.code : undefined, method, url, httpStatus: status },
      false,
    );
  }

  if (!payload || typeof payload.code !== 'number') {
    throw systemError({ method, url, httpStatus: status }, false);
  }

  if (payload.code !== 200) {
    throw new PluginApiError({
      code: payload.code,
      message: payload.message || i18n.t('errors.system.message'),
      httpStatus: status,
      method,
      url,
      system: false,
    });
  }

  return payload.data as T;
}

export function pluginGet<T>(path: string, options?: PluginRequestOptions): Promise<T> {
  return request('GET', path, undefined, options);
}

export function pluginPost<T>(path: string, body?: unknown, options?: PluginRequestOptions): Promise<T> {
  return request('POST', path, body, options);
}

export function pluginPut<T>(path: string, body?: unknown, options?: PluginRequestOptions): Promise<T> {
  return request('PUT', path, body, options);
}

export function pluginDelete<T>(path: string, body?: unknown, options?: PluginRequestOptions): Promise<T> {
  return request('DELETE', path, body, options);
}
