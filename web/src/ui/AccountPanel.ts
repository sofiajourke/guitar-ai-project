/**
 * Sign up, sign in and out, and "forgot password" (FR-AC-01 to 03).
 *
 * An account is optional: everything works signed out, saved in this browser.
 * Signing in adds a copy in the cloud, so sessions follow the learner to any
 * device.
 */
import type { Translate } from "../i18n";
import { supabase } from "../storage/supabaseClient";
import { syncAll } from "../storage";
import { clear, element, requireElement } from "./dom";

export class AccountPanel {
  private root = requireElement("account");
  private card = requireElement("account-card");
  private toggle = requireElement<HTMLButtonElement>("account-toggle");
  private email: string | null = null;
  private message = "";
  private busy = false;
  private syncedHandler: () => void = () => {};

  constructor(private t: () => Translate) {
    this.toggle.addEventListener("click", () => this.setOpen(this.root.classList.contains("gone")));
    this.root.addEventListener("click", (event) => {
      if (event.target === this.root) this.setOpen(false);
    });
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      this.email = data.session?.user.email ?? null;
      if (this.email) void this.sync();
      this.render();
    });
    supabase.auth.onAuthStateChange((event, session) => {
      this.email = session?.user.email ?? null;
      if (event === "SIGNED_IN") void this.sync();
      this.render();
    });
  }

  /** Called after a sync, so the dashboard can show sessions that came down. */
  whenSynced(handler: () => void) {
    this.syncedHandler = handler;
  }

  get open(): boolean {
    return !this.root.classList.contains("gone");
  }

  setOpen(open: boolean) {
    this.root.classList.toggle("gone", !open);
    this.toggle.setAttribute("aria-pressed", String(open));
    if (open) {
      this.message = "";
      this.render();
    }
  }

  render() {
    const t = this.t();
    this.toggle.textContent = this.email ? t("account.toggle.in") : t("account.toggle");
    if (!this.open) return;
    clear(this.card);
    this.card.append(element("h2", { text: t("account.title") }));

    if (!supabase) {
      this.card.append(element("p", { className: "quiet", text: t("account.notConfigured") }));
    } else if (this.email) {
      this.signedInView(t);
    } else {
      this.signedOutView(t);
    }

    if (this.message) this.card.append(element("p", { className: "account-message", text: this.message, attrs: { role: "status" } }));
    const close = element("button", { className: "link", text: t("help.close"), attrs: { type: "button" } });
    close.addEventListener("click", () => this.setOpen(false));
    this.card.append(close);
  }

  private signedOutView(t: Translate) {
    this.card.append(element("p", { className: "quiet", text: t("account.lead") }));
    const email = element("input", { attrs: { type: "email", autocomplete: "email", placeholder: t("account.email"), "aria-label": t("account.email") } });
    const password = element("input", {
      attrs: { type: "password", autocomplete: "current-password", minlength: "8", placeholder: t("account.password"), "aria-label": t("account.password") },
    });
    const signIn = element("button", { className: "primary", text: t("account.signIn"), attrs: { type: "button" } });
    const signUp = element("button", { text: t("account.signUp"), attrs: { type: "button" } });
    const forgot = element("button", { className: "link", text: t("account.forgot"), attrs: { type: "button" } });

    signIn.addEventListener("click", () =>
      this.run(async () => {
        const { error } = await supabase!.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
        return error ? t("account.error", { message: error.message }) : "";
      }),
    );
    signUp.addEventListener("click", () =>
      this.run(async () => {
        if (password.value.length < 8) return t("account.passwordShort");
        const { data, error } = await supabase!.auth.signUp({
          email: email.value.trim(),
          password: password.value,
          options: { emailRedirectTo: location.origin },
        });
        if (error) return t("account.error", { message: error.message });
        return data.session ? "" : t("account.checkEmail");
      }),
    );
    forgot.addEventListener("click", () =>
      this.run(async () => {
        if (!email.value.trim()) return t("account.needEmail");
        const { error } = await supabase!.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: location.origin });
        return error ? t("account.error", { message: error.message }) : t("account.resetSent");
      }),
    );

    this.card.append(
      element("div", { className: "account-form" }, [email, password]),
      element("div", { className: "row" }, [signIn, signUp]),
      forgot,
    );
  }

  private signedInView(t: Translate) {
    this.card.append(element("p", { text: t("account.signedInAs", { email: this.email ?? "" }) }));
    this.card.append(element("p", { className: "quiet", text: t("account.syncNote") }));
    const syncNow = element("button", { text: t("account.sync"), attrs: { type: "button" } });
    const signOut = element("button", { text: t("account.signOut"), attrs: { type: "button" } });
    syncNow.addEventListener("click", () => this.run(async () => t("account.synced", { count: await this.sync() })));
    signOut.addEventListener("click", () =>
      this.run(async () => {
        await supabase!.auth.signOut();
        return t("account.signedOut");
      }),
    );
    this.card.append(element("div", { className: "row" }, [syncNow, signOut]));
  }

  private async sync(): Promise<number> {
    const added = await syncAll();
    this.syncedHandler();
    return added;
  }

  /** Runs one account action, showing its result, and never two at once. */
  private async run(action: () => Promise<string>) {
    if (this.busy) return;
    this.busy = true;
    this.message = this.t()("account.working");
    this.render();
    try {
      this.message = await action();
    } catch {
      this.message = this.t()("account.offline");
    } finally {
      this.busy = false;
      this.render();
    }
  }
}