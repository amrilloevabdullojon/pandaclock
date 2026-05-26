/**
 * Минимальная JSON-RPC обвязка для Payme Merchant API.
 * Авторизация: Basic header "Paycom:<merchant_key>".
 * Документация: https://developer.help.paycom.uz/
 */

export interface PaymeRpcRequest<T = unknown> {
  id: number | string;
  method:
    | "CheckPerformTransaction"
    | "CreateTransaction"
    | "PerformTransaction"
    | "CancelTransaction"
    | "CheckTransaction"
    | "GetStatement";
  params: T;
}

export class PaymeProvider {
  constructor(private readonly merchantKey: string) {}

  verifyAuthHeader(header: string | undefined): boolean {
    if (!header || !header.startsWith("Basic ")) return false;
    const decoded = Buffer.from(header.slice(6), "base64").toString();
    const [login, password] = decoded.split(":");
    return login === "Paycom" && password === this.merchantKey;
  }

  errorResponse(code: number, message: string, requestId?: number | string): unknown {
    return {
      id: requestId ?? 0,
      error: { code, message, data: null },
    };
  }

  okResponse(result: unknown, requestId: number | string): unknown {
    return { id: requestId, result };
  }
}
