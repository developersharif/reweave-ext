import type { Diagnostic, MessageErrorCode } from '@reskin/schema';

/** An expected "no" with a stable code; the router turns it into `{ ok: false, error }`. */
export class Refusal extends Error {
  readonly code: MessageErrorCode;
  readonly diagnostics: Diagnostic[];
  constructor(code: MessageErrorCode, message: string, diagnostics: Diagnostic[] = []) {
    super(message);
    this.code = code;
    this.diagnostics = diagnostics;
  }
}
