// Type declarations for Node.js 24 built-in fetch with undici dispatcher support
declare module "node:fetch" {
  interface RequestInit {
    /**
     * An object describing how to reuse TCP connections.
     */
    dispatcher?: any;
  }

  export function fetch(
    input: string | URL,
    init?: RequestInit & { dispatcher?: any }
  ): Promise<Response>;
}