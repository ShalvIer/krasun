interface GoogleCredentialResponse { credential: string; }
interface GoogleAccountsId {
  initialize(options: { client_id: string; callback(response: GoogleCredentialResponse): void }): void;
  renderButton(element: HTMLElement, options: Record<string, string | number>): void;
}
interface Window { google?: { accounts: { id: GoogleAccountsId } }; }
