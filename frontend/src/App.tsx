import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode, FormEvent } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckCircleIcon,
  CircleIcon,
  CubeIcon,
  HandshakeIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  StackIcon,
  WalletIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  adapter,
  availableActions,
  ownCredit,
  stateLabel,
} from "./lib/adapter.ts";
import type {
  Address,
  Bundle,
  Command,
  ContractAdapter,
  CreateBundle,
  TxStatus,
  WalletSession,
} from "./lib/adapter.ts";
import { discoverWallets, isAddress, sameAddress } from "./lib/wallet.ts";
import type { DetectedWallet } from "./lib/wallet.ts";

interface ProductContext {
  service: ContractAdapter;
  wallet: WalletSession | null;
  walletName: string;
  wallets: DetectedWallet[];
  picker: () => void;
  logout: () => void;
  run: (command: Command) => Promise<void>;
  resume: () => Promise<void>;
  tx: TxStatus | null;
  pending: boolean;
  revision: number;
}
const Context = createContext<ProductContext | null>(null);
const useProduct = () => useContext(Context)!;
const short = (value: string) =>
  value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Not connected";
const date = (value: number) =>
  new Date(value * 1000).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
const seconds = () => Math.floor(Date.now() / 1000);
const actionLabel: Partial<Record<Command["method"], string>> = {
  ratify_bundle: "Accept this agreement",
  review_bundle: "Check coverage",
  refund_expired: "Recover purchase",
  consume_permit: "Use permission",
  expire_permit: "Expire unused permission",
  withdraw_credit: "Withdraw my GEN",
  close_bundle: "Archive agreement",
};

function ProductProvider({
  children,
  service,
}: {
  children: ReactNode;
  service: ContractAdapter;
}) {
  const [wallet, setWallet] = useState<WalletSession | null>(null);
  const [walletName, setWalletName] = useState("");
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [tx, setTx] = useState<TxStatus | null>(null);
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const pendingRef = useRef(false);
  const lastCommand = useRef<Command | null>(null);
  const navigate = useNavigate();
  useEffect(() => discoverWallets(window, setWallets), []);
  useEffect(() => {
    if (showPicker) dialog.current?.showModal();
    else dialog.current?.close();
  }, [showPicker]);
  const logout = useCallback(() => {
    setWallet(null);
    setWalletName("");
    setShowPicker(false);
    try { sessionStorage.removeItem("coverweave.wallet-choice"); } catch {}
  }, []);
  useEffect(() => {
    let active = true;
    let chosen = "";
    try { chosen = sessionStorage.getItem("coverweave.wallet-choice") || ""; } catch {}
    const selected = wallets.find(w => w.id === chosen);
    if (!selected || wallet || showPicker) return;
    void selected.provider.request({ method: "eth_accounts" }).then(accounts => {
      if (active && Array.isArray(accounts) && typeof accounts[0] === "string" && isAddress(accounts[0])) {
        setWallet({ provider: selected.provider, address: accounts[0] });
        setWalletName(selected.name);
      }
    }).catch(() => { /* Previously authorized session unavailable; picker remains explicit. */ });
    return () => { active = false; };
  }, [wallets, wallet, showPicker]);
  useEffect(() => {
    if (!wallet) return;
    const clear = () => logout();
    wallet.provider.on?.("accountsChanged", clear);
    wallet.provider.on?.("disconnect", clear);
    return () => {
      wallet.provider.removeListener?.("accountsChanged", clear);
      wallet.provider.removeListener?.("disconnect", clear);
    };
  }, [wallet, logout]);
  const connect = async (selected: DetectedWallet) => {
    setConnecting(true);
    setWalletError("");
    try {
      const accounts = await selected.provider.request({
        method: "eth_requestAccounts",
      });
      if (
        !Array.isArray(accounts) ||
        typeof accounts[0] !== "string" ||
        !isAddress(accounts[0])
      )
        throw new Error(
          "This wallet did not provide a valid account. Choose another wallet.",
        );
      const session = { provider: selected.provider, address: accounts[0] };
      await service.prepareWallet?.(session);
      setWallet(session);
      setWalletName(selected.name);
      try { sessionStorage.setItem("coverweave.wallet-choice", selected.id); } catch {}
      setShowPicker(false);
    } catch (error) {
      setWalletError(
        error !== null && typeof error === "object" && "code" in error && error.code === 4001
          ? "The wallet rejected this connection. Open your selected wallet and approve account access, then try again."
          : error instanceof Error
          ? error.message
          : "Wallet connection did not complete. Check the selected wallet and try again.",
      );
    } finally {
      setConnecting(false);
    }
  };
  const run = async (command: Command) => {
    if (!wallet) throw new Error("Connect a wallet before continuing.");
    if (!service.ready) throw new Error(service.unavailableReason);
    if (pendingRef.current)
      throw new Error(
        "Wait for the current transaction before starting another.",
      );
    pendingRef.current = true;
    setPending(true);
    lastCommand.current = command;
    setTx(null);
    try {
      await service.transact(command, wallet, setTx);
      setRevision((v) => v + 1);
    } catch (error) {
      setTx((previous) => ({
        stage: error instanceof Error && error.name === "PendingTransactionError" ? "timeout" : "failed",
        hash: error instanceof Error && "hash" in error && typeof error.hash === "string" ? error.hash : previous?.hash,
        message:
          error instanceof Error
            ? error.message
            : "The transaction could not complete.",
      }));
      throw error;
    } finally {
      setPending(false);
      pendingRef.current = false;
    }
  };
  const resume = async () => {
    if (!wallet || !tx?.hash || !service.resumeTransaction || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      await service.resumeTransaction(wallet, tx.hash, setTx);
      setRevision(v => v + 1);
      if (lastCommand.current?.method === "open_bundle") {
        navigate(`/bundles/${encodeURIComponent(lastCommand.current.input.id)}`);
      }
    } catch (error) {
      setTx({ stage: error instanceof Error && error.name === "PendingTransactionError" ? "timeout" : "failed",
        hash: tx.hash, message: error instanceof Error ? error.message : "Confirmation could not be checked." });
    } finally {
      setPending(false);
      pendingRef.current = false;
    }
  };
  return (
    <Context.Provider
      value={{
        service,
        wallet,
        walletName,
        wallets,
        picker: () => {
          setWalletError("");
          setShowPicker(true);
        },
        logout,
        run,
        resume,
        tx,
        pending,
        revision,
      }}
    >
      {children}
      <dialog
        ref={dialog}
        className="wallet-dialog"
        onCancel={() => setShowPicker(false)}
        aria-labelledby="wallet-title"
      >
        <div className="dialog-head">
          <div>
            <span className="eyebrow">Your account</span>
            <h2 id="wallet-title">Choose your wallet</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close wallet selection"
            onClick={() => setShowPicker(false)}
          >
            <XIcon size={22} />
          </button>
        </div>
        <p>
          Choose an installed EVM wallet. CoverWeave requests access only after
          you select one.
        </p>
        {wallets.length === 0 ? (
          <div className="notice">
            No EVM wallet was detected. Install or enable a compatible wallet
            extension, then reload this page.
          </div>
        ) : (
          <div className="wallet-list">
            {wallets.map((w) => (
              <button
                key={w.id}
                disabled={connecting}
                onClick={() => void connect(w)}
              >
                <WalletIcon size={24} aria-hidden="true" />
                <span>{w.name}</span>
                <ArrowRightIcon size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
        {connecting && <p role="status">Waiting for wallet permission…</p>}
        {walletError && (
          <p className="error" role="alert">
            {walletError}
          </p>
        )}
        <p className="small muted">
          No keys or recovery phrases are requested. Transactions use Studio Dev
          and real GEN.
        </p>
      </dialog>
    </Context.Provider>
  );
}

function Header() {
  const { wallet, picker, logout } = useProduct();
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand" aria-label="CoverWeave home">
          <span className="brand-mark">
            <StackIcon weight="bold" size={22} aria-hidden="true" />
          </span>
          CoverWeave
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/bundles">Workspace</NavLink>
          <NavLink to="/credits">My credits</NavLink>
          <NavLink to="/guide">Guide</NavLink>
        </nav>
        <div className="header-account">
          {wallet ? (
            <details className="account-menu">
              <summary>{short(wallet.address)}</summary>
              <div>
                <Link to="/account">Account & network</Link>
                <button onClick={logout}>Disconnect wallet</button>
              </div>
            </details>
          ) : (
            <button className="button subtle" onClick={picker}>
              <WalletIcon size={18} aria-hidden="true" />
              Connect wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer className="site-footer">
      <Link to="/" className="brand">
        CoverWeave
      </Link>
      <span>Protocol permissions. Shared by meaning.</span>
      <div>
        <Link to="/guide">How it works</Link>
        <Link to="/account">Account</Link>
        <span className="network-dot">Studio Dev</span>
      </div>
    </footer>
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function ConfigurationNotice() {
  const { service } = useProduct();
  return !service.ready ? (
    <div className="notice configuration">
      <ShieldCheckIcon size={22} aria-hidden="true" />
      <div>
        <strong>Live connection unavailable</strong>
        <p>{service.unavailableReason}</p>
      </div>
    </div>
  ) : null;
}
function TransactionNotice() {
  const { tx, wallet, service, pending, resume } = useProduct();
  if (!tx) return null;
  const labels = {
    "awaiting-signature": "Confirm in your wallet",
    submitted: "Transaction submitted",
    accepted: "Decision accepted — awaiting finalization",
    finalized: "Finalized — refreshing agreement",
    failed: "Transaction failed",
    timeout: "Still awaiting confirmation",
  };
  return (
    <div
      className={`notice tx ${tx.stage === "failed" ? "danger" : ""}`}
      role={tx.stage === "failed" ? "alert" : "status"}
    >
      <div>
        <strong>{labels[tx.stage]}</strong>
        {tx.message && <p>{tx.message}</p>}
        {tx.stage === "timeout" && tx.hash && wallet && service.resumeTransaction && (
          <button className="button subtle" disabled={pending} onClick={() => void resume()}>
            {pending ? "Checking confirmation…" : "Check confirmation"}
          </button>
        )}
        {tx.hash && (
          <a
            href={`https://explorer-studio-dev.genlayer.com/transactions/${tx.hash}`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction <ArrowUpRightIcon aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}
function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <CubeIcon size={40} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
function useBundles() {
  const { service, revision } = useProduct();
  const [data, setData] = useState<Bundle[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    if (!service.ready) {
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    service
      .listBundles()
      .then((rows) => {
        if (active) setData(rows);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Agreements could not load.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [service, revision, reload]);
  return { data, error, loading, reload: () => setReload((v) => v + 1) };
}
function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="notice danger" role="alert">
      <div>
        <strong>Could not load agreements</strong>
        <p>{message}</p>
        <button className="button subtle" onClick={retry}>
          Try again
        </button>
      </div>
    </div>
  );
}

function Welcome() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-line" />A shared permission workspace
          </span>
          <h1>
            Permission,
            <br />
            <span>together.</span>
          </h1>
          <p className="hero-description">
            Some grants work alone. Others need a partner. Combine two
            permissions, check what they cover, and share the purchase by what
            each brings.
          </p>
          <div className="button-row">
            <Link className="button primary" to="/bundles/new">
              Start a bundle <ArrowRightIcon size={19} aria-hidden="true" />
            </Link>
            <Link className="text-link" to="/guide">
              Understand the rules{" "}
              <ArrowUpRightIcon size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="hero-meta">
            <span>
              <ShieldCheckIcon aria-hidden="true" />
              Validator-reviewed coverage
            </span>
            <span>Fixed purchase · 2 GEN</span>
          </div>
        </div>
        <div
          className="hero-illustration"
          aria-label="Two complementary grants can together cover one goal"
        >
          <div className="illustration-top">
            <span className="eyebrow">The idea, at a glance</span>
            <span className="badge">Concept illustration</span>
          </div>
          <div className="grant-example">
            <span className="letter">A</span>
            <div>
              <strong>Permission to analyze</strong>
              <span>One part of the goal</span>
            </div>
            <CircleIcon size={21} aria-hidden="true" />
          </div>
          <div className="join-line">
            <span />
            Together
            <span />
          </div>
          <div className="grant-example">
            <span className="letter">B</span>
            <div>
              <strong>Permission to export</strong>
              <span>The other part of the goal</span>
            </div>
            <CircleIcon size={21} aria-hidden="true" />
          </div>
          <div className="joint-example">
            <CheckCircleIcon size={27} aria-hidden="true" />
            <div>
              <strong>Analyze and export</strong>
              <span>One complete permission bundle</span>
            </div>
          </div>
          <p className="small muted">
            An explanation of complementarity, not a live agreement or verdict.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">From terms to a shared result</span>
          <h2>
            A clear agreement.
            <br />A fair share.
          </h2>
        </div>
        <div className="steps-grid">
          {[
            [
              "01",
              "Define the goal",
              "Name two issuers and reserve a fixed 2 GEN purchase.",
            ],
            [
              "02",
              "Agree on permissions",
              "Each issuer offers exact terms. All three participants accept the same agreement.",
            ],
            [
              "03",
              "Share by coverage",
              "Validators assess the full goal. The contract derives each share and the buyer’s permit.",
            ],
          ].map(([n, t, d]) => (
            <article className="step" key={n}>
              <span className="step-number">{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="split-callout">
        <div>
          <span className="eyebrow">Made for returning participants</span>
          <h2>
            Keep every agreement
            <br />
            within reach.
          </h2>
          <p>
            Revisit accepted terms, see coverage history, finish a permission,
            or withdraw your GEN from one workspace.
          </p>
        </div>
        <Link to="/bundles" className="button primary">
          Open workspace <ArrowRightIcon aria-hidden="true" />
        </Link>
      </section>
      <div className="scope-note">
        <ShieldCheckIcon size={21} aria-hidden="true" />
        <p>
          CoverWeave creates permissions inside this protocol. It does not prove
          external service delivery, legal rights or intellectual-property
          ownership.
        </p>
      </div>
    </>
  );
}
function BundleCard({ bundle }: { bundle: Bundle }) {
  const { wallet } = useProduct();
  const mine =
    wallet && sameAddress(bundle.buyer, wallet.address)
      ? "Buyer"
      : wallet &&
          bundle.grants.some((g) => sameAddress(g.issuer, wallet.address))
        ? "Issuer"
        : "Viewer";
  return (
    <Link
      className="bundle-card"
      to={`/bundles/${encodeURIComponent(bundle.id)}`}
    >
      <div className="card-top">
        <span className={`badge status-${bundle.state.toLowerCase()}`}>
          {stateLabel[bundle.state]}
        </span>
        <span className="small muted">{mine}</span>
      </div>
      <h2>{bundle.goal}</h2>
      <div className="card-bottom">
        <span className="small muted">{bundle.id}</span>
        <span className="small">
          Open agreement <ArrowRightIcon size={16} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
function Workspace() {
  const { wallet, service } = useProduct();
  const rows = useBundles();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [mine, setMine] = useState(false);
  const filtered = rows.data?.filter(
    (b) =>
      (b.id + " " + b.goal).toLowerCase().includes(query.toLowerCase()) &&
      (status === "all" || b.state === status) &&
      (!mine ||
        Boolean(
          wallet &&
            (sameAddress(b.buyer, wallet.address) ||
              b.grants.some((g) => sameAddress(g.issuer, wallet.address))),
        )),
  );
  return (
    <>
      <PageHeading
        eyebrow="Your workspace"
        title="Build on shared permission."
        description="Find an agreement, see what needs your attention, and return to your results."
        action={
          <Link className="button primary" to="/bundles/new">
            New bundle <ArrowRightIcon aria-hidden="true" />
          </Link>
        }
      />
      <div className="toolbar">
        <label className="search">
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            aria-label="Search agreements"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search goal or agreement ID"
          />
        </label>
        <label className="filter-label">
          Status
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All agreements</option>
            {Object.entries(stateLabel).map(([s, l]) => (
              <option key={s} value={s}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={mine}
            onChange={(e) => setMine(e.target.checked)}
            disabled={!wallet}
          />
          My agreements
        </label>
      </div>
      <ConfigurationNotice />
      {rows.loading ? (
        <div className="loading" role="status">
          Loading agreements from Studio Dev…
        </div>
      ) : rows.error ? (
        <LoadError message={rows.error} retry={rows.reload} />
      ) : service.ready && filtered?.length ? (
        <div className="bundle-grid">
          {filtered.map((b) => (
            <BundleCard key={b.id} bundle={b} />
          ))}
        </div>
      ) : (
        <Empty
          title={
            !service.ready
              ? "Connect to live agreements"
              : query || status !== "all" || mine
                ? "No matching agreements"
                : "Your next agreement starts here"
          }
          action={
            <Link className="button subtle" to="/bundles/new">
              Create a bundle
            </Link>
          }
        >
          {!service.ready
            ? "The live connection must be configured before your onchain workspace can load. No sample records are displayed."
            : query || status !== "all" || mine
              ? "Try a different search or clear your filters."
              : "Define a goal and invite two permission issuers. Finalized agreements will appear here."}
        </Empty>
      )}
    </>
  );
}

const initialTime = (hours: number) => {
  const d = new Date(Date.now() + hours * 3600000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
function NewBundle() {
  const { wallet, picker, service, pending, run } = useProduct();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    id: "",
    goal: "",
    issuerA: "",
    issuerB: "",
    offerTime: initialTime(24),
    reviewTime: initialTime(48),
    useTime: initialTime(72),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const errorSummary = useRef<HTMLDivElement>(null);
  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const validate = () => {
    const e: Record<string, string> = {};
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(form.id))
      e.id = "Use 1–64 letters, numbers, underscores or hyphens.";
    if (
      !form.goal.trim() ||
      form.goal.length > 1200 ||
      !/^[\x20-\x7E\r\n]+$/.test(form.goal)
    )
      e.goal =
        "Describe your exact goal in plain ASCII text, up to 1,200 characters.";
    if (!isAddress(form.issuerA))
      e.issuerA = "Enter a valid issuer wallet address.";
    if (!isAddress(form.issuerB))
      e.issuerB = "Enter a valid issuer wallet address.";
    if (sameAddress(form.issuerA, form.issuerB))
      e.issuerB = "The two issuers must have different wallets.";
    if (
      wallet &&
      (sameAddress(form.issuerA, wallet.address) ||
        sameAddress(form.issuerB, wallet.address))
    )
      e.issuerA = "The buyer and both issuers must be different wallets.";
    const offer = Date.parse(form.offerTime) / 1000,
      review = Date.parse(form.reviewTime) / 1000,
      use = Date.parse(form.useTime) / 1000,
      now = seconds();
    if (!(now < offer && offer <= now + 7 * 86400))
      e.offerTime = "Choose a future offer deadline within 7 days.";
    if (!(offer < review && review <= now + 14 * 86400))
      e.reviewTime = "Review must end after offers and within 14 days.";
    if (!(review < use && use <= now + 21 * 86400))
      e.useTime = "Permission use must end after review and within 21 days.";
    setErrors(e);
    if (Object.keys(e).length) {
      setTimeout(() => errorSummary.current?.focus(), 0);
      return false;
    }
    return true;
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure("");
    if (!validate()) return;
    if (step === 1) {
      setStep(2);
      return;
    }
    if (!wallet) {
      picker();
      return;
    }
    const input: CreateBundle = {
      id: form.id,
      goal: form.goal,
      issuerA: form.issuerA as Address,
      issuerB: form.issuerB as Address,
      offerDeadline: Date.parse(form.offerTime) / 1000,
      reviewDeadline: Date.parse(form.reviewTime) / 1000,
      useDeadline: Date.parse(form.useTime) / 1000,
    };
    try {
      await run({ method: "open_bundle", input });
      navigate(`/bundles/${encodeURIComponent(form.id)}`);
    } catch (e) {
      setFailure(
        e instanceof Error ? e.message : "Creation could not complete.",
      );
    }
  };
  const field = (
    key: keyof typeof form,
    label: string,
    type = "text",
    hint?: string,
  ) => (
    <label className="field" key={key}>
      <span id={`${key}-label`}>{label}</span>
      <input
        aria-labelledby={`${key}-label`}
        id={key}
        type={type}
        value={form[key]}
        onChange={(e) => update(key, e.target.value)}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `${key}-error` : undefined}
        autoComplete="off"
      />
      {hint && <span className="hint">{hint}</span>}
      {errors[key] && (
        <span id={`${key}-error`} className="field-error">
          {errors[key]}
        </span>
      )}
    </label>
  );
  return (
    <>
      <PageHeading
        eyebrow="New agreement"
        title="What should your bundle allow?"
        description="Define one exact goal. Invite two issuers to offer permissions that can cover it together."
      />
      <div className="create-layout">
        <form
          className="panel create-form"
          onSubmit={(event) => void submit(event)}
          noValidate
        >
          <div className="form-progress" aria-label={`Step ${step} of 2`}>
            <span className={step === 1 ? "current" : ""}>
              1 · Define terms
            </span>
            <span className={step === 2 ? "current" : ""}>
              2 · Review & reserve
            </span>
          </div>
          {Object.keys(errors).length > 0 && (
            <div
              className="notice danger"
              role="alert"
              tabIndex={-1}
              ref={errorSummary}
            >
              <div>
                <strong>Check these details before continuing</strong>
                <ul>
                  {Object.entries(errors).map(([k, v]) => (
                    <li key={k}>
                      <a href={`#${k}`} onClick={() => setStep(1)}>
                        {v}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {step === 1 ? (
            <>
              <fieldset>
                <legend>The agreement</legend>
                {field(
                  "id",
                  "Agreement ID",
                  "text",
                  "Choose a unique ID you can share with both issuers.",
                )}
                <label className="field">
                  <span id="goal-label">Your exact goal</span>
                  <textarea
                    aria-labelledby="goal-label"
                    id="goal"
                    rows={4}
                    maxLength={1200}
                    value={form.goal}
                    onChange={(e) => update("goal", e.target.value)}
                    aria-invalid={Boolean(errors.goal)}
                    aria-describedby="goal-help"
                  />
                  <span
                    id="goal-help"
                    className={errors.goal ? "field-error" : "hint"}
                  >
                    {errors.goal ||
                      "Describe permission you want this protocol to create, not proof of work or outside ownership."}
                  </span>
                </label>
              </fieldset>
              <fieldset>
                <legend>Permission issuers</legend>
                {field("issuerA", "Issuer A wallet", "text")}
                {field(
                  "issuerB",
                  "Issuer B wallet",
                  "text",
                  "Each issuer will author its own immutable grant.",
                )}
              </fieldset>
              <fieldset>
                <legend>Time to agree, review and use</legend>
                {field(
                  "offerTime",
                  "Offers and agreement deadline",
                  "datetime-local",
                )}
                {field(
                  "reviewTime",
                  "Coverage review deadline",
                  "datetime-local",
                )}
                {field("useTime", "Permission use deadline", "datetime-local")}
              </fieldset>
              <button className="button primary" type="submit">
                Review terms <ArrowRightIcon aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <h2>Review your purchase</h2>
              <p className="review-goal">{form.goal}</p>
              <dl className="review-list">
                <dt>Agreement</dt>
                <dd>{form.id}</dd>
                <dt>Issuer A</dt>
                <dd>{form.issuerA}</dd>
                <dt>Issuer B</dt>
                <dd>{form.issuerB}</dd>
                <dt>Agreement deadline</dt>
                <dd>{new Date(form.offerTime).toLocaleString("en-US")}</dd>
                <dt>Review deadline</dt>
                <dd>{new Date(form.reviewTime).toLocaleString("en-US")}</dd>
                <dt>Use deadline</dt>
                <dd>{new Date(form.useTime).toLocaleString("en-US")}</dd>
                <dt>Reserved purchase</dt>
                <dd>
                  <strong>2 GEN</strong>
                </dd>
              </dl>
              <p className="small muted">
                These terms cannot be edited after creation. All participants
                accept the full grants before review. Wallet network fees are
                separate.
              </p>
              <ConfigurationNotice />
              <div className="button-row">
                <button
                  className="button subtle"
                  type="button"
                  onClick={() => setStep(1)}
                >
                  Back to terms
                </button>
                {wallet ? (
                  <button
                    className="button primary"
                    type="submit"
                    disabled={!service.ready || pending}
                  >
                    {pending
                      ? "Awaiting transaction…"
                      : "Reserve 2 GEN & create"}
                  </button>
                ) : (
                  <button
                    className="button primary"
                    type="button"
                    onClick={picker}
                  >
                    Connect wallet to continue
                  </button>
                )}
              </div>
            </>
          )}
          {failure && (
            <p className="error" role="alert">
              {failure}
            </p>
          )}
        </form>
        <aside className="purchase-aside">
          <span className="eyebrow">One fixed purchase</span>
          <strong className="purchase-price">
            2 <span>GEN</span>
          </strong>
          <p>
            The full amount remains reserved until a valid coverage verdict or
            eligible refund.
          </p>
          <hr />
          <h2>Shared by contribution</h2>
          <p>
            Complementary or substitute grants share 1 GEN each. A fully
            covering grant paired with an irrelevant one receives 2 GEN.
          </p>
          <Link className="text-link" to="/guide">
            Read the sharing rules <ArrowUpRightIcon aria-hidden="true" />
          </Link>
          <div className="scope-note">
            <ShieldCheckIcon aria-hidden="true" />
            <p>
              Protocol authorization only. External service delivery is outside
              this agreement.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function BundleDetail() {
  const { id = "" } = useParams();
  const { service, wallet, picker, revision, run, pending } = useProduct();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [grant, setGrant] = useState("");
  const [actionError, setActionError] = useState("");
  const [reload, setReload] = useState(0);
  const [now, setNow] = useState(seconds());
  useEffect(() => {
    const timer = setInterval(() => setNow(seconds()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    setBundle(null);
    setError("");
    if (!service.ready) return;
    setLoading(true);
    service
      .getBundle(id)
      .then((row) => {
        if (active) setBundle(row);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "This agreement could not load.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, service, revision, reload]);
  const perform = async (method: Command["method"]) => {
    if (!bundle) return;
    setActionError("");
    let command: Command;
    if (method === "offer_grant") {
      if (
        !grant.trim() ||
        grant.length > 1000 ||
        !/^[\x20-\x7E\r\n]+$/.test(grant)
      ) {
        setActionError(
          "Describe a positive protocol permission in plain ASCII text, up to 1,000 characters.",
        );
        return;
      }
      command = { method, id: bundle.id, terms: grant };
    } else if (method === "ratify_bundle")
      command = { method, id: bundle.id, digest: bundle.digest };
    else if (method !== "open_bundle") command = { method, id: bundle.id };
    else return;
    try {
      await run(command);
      setGrant("");
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "This action could not complete.",
      );
    }
  };
  const actions =
    bundle && wallet ? availableActions(bundle, wallet.address, now) : [];
  return (
    <>
      <Link className="back-link" to="/bundles">
        ← Workspace
      </Link>
      <PageHeading
        eyebrow="Agreement"
        title={bundle ? bundle.goal : "Your permission bundle"}
        description={
          bundle
            ? `Agreement ${bundle.id}`
            : "Review terms, follow coverage and complete your next step."
        }
      />
      <ConfigurationNotice />
      {loading ? (
        <div className="loading" role="status">
          Loading canonical agreement…
        </div>
      ) : error ? (
        <LoadError message={error} retry={() => setReload((v) => v + 1)} />
      ) : !bundle ? (
        <Empty
          title={
            service.ready
              ? "Agreement unavailable"
              : "Live agreement unavailable"
          }
        >
          Check the agreement ID and live connection. No sample verdict or
          permission is displayed.
        </Empty>
      ) : (
        <>
          <div className="detail-top">
            <span className={`badge status-${bundle.state.toLowerCase()}`}>
              {stateLabel[bundle.state]}
            </span>
            <span className="small muted">Fixed purchase · 2 GEN</span>
          </div>
          <div className="detail-layout">
            <section className="terms-column">
              <article className="panel">
                <span className="eyebrow">The agreed permissions</span>
                <h2>What each issuer offers</h2>
                <div className="grant-terms">
                  {bundle.grants.map((g, index) => (
                    <div className="grant-term" key={g.issuer}>
                      <div className="grant-term-head">
                        <span className="letter">
                          {index === 0 ? "A" : "B"}
                        </span>
                        <div>
                          <h3>Issuer {index === 0 ? "A" : "B"}</h3>
                          <span className="small muted break">{g.issuer}</span>
                        </div>
                        <span className="badge">
                          {g.assented ? "Accepted" : "Awaiting acceptance"}
                        </span>
                      </div>
                      <p className={!g.terms ? "muted" : ""}>
                        {g.terms ||
                          "This issuer has not offered a permission yet."}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="buyer-assent">
                  <HandshakeIcon size={21} aria-hidden="true" />
                  <span>
                    Buyer{" "}
                    {bundle.buyerAssented
                      ? "accepted the agreement"
                      : "has not accepted yet"}
                  </span>
                  <span className="small muted break">
                    {short(bundle.buyer)}
                  </span>
                </div>
              </article>
              <article className="panel">
                <span className="eyebrow">Coverage & history</span>
                <h2>What the grants cover</h2>
                {bundle.attempts.length === 0 ? (
                  <p className="muted">
                    Coverage appears after all three participants agree and a
                    validator review finalizes.
                  </p>
                ) : (
                  bundle.attempts.map((attempt) => (
                    <div className="attempt" key={attempt.index}>
                      <div className="card-top">
                        <strong>Review {attempt.index + 1}</strong>
                        <span className="small muted">
                          {date(attempt.timestamp)}
                        </span>
                      </div>
                      <div className="coverage-grid">
                        {["A alone", "B alone", "Together"].map(
                          (label, index) => (
                            <div key={label}>
                              <span className="small muted">{label}</span>
                              <strong>
                                {attempt.classes[index] === "COMPLETE"
                                  ? "Goal covered"
                                  : attempt.classes[index] === "INCOMPLETE"
                                    ? "Part missing"
                                    : "Unclear scope"}
                              </strong>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ))
                )}
              </article>
              {bundle.state === "PURCHASED" && (
                <article className="panel">
                  <span className="eyebrow">Purchase result</span>
                  <h2>Shared by marginal coverage</h2>
                  <div className="shares">
                    {bundle.grants.map((g, i) => (
                      <div key={g.issuer}>
                        <span>
                          Issuer {i === 0 ? "A" : "B"} · remaining credit
                        </span>
                        <strong>{ownCredit(bundle, g.issuer)} GEN</strong>
                      </div>
                    ))}
                  </div>
                  <p className="small muted">
                    Shares are derived by contract rules. Remaining credit
                    decreases after withdrawals; review history preserves
                    coverage.
                  </p>
                </article>
              )}
              <details className="technical">
                <summary>Verify agreement details</summary>
                <dl className="review-list">
                  <dt>Definition digest</dt>
                  <dd>{bundle.digest}</dd>
                  <dt>Buyer</dt>
                  <dd>{bundle.buyer}</dd>
                  <dt>Network</dt>
                  <dd>Studio Dev</dd>
                </dl>
                {service.address && (
                  <a
                    href={`https://explorer-studio-dev.genlayer.com/contracts/${service.address}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View contract <ArrowUpRightIcon aria-hidden="true" />
                  </a>
                )}
                <p className="small muted">
                  The digest binds exact bytes. Role-authenticated transactions
                  establish protocol authorship.
                </p>
              </details>
            </section>
            <aside className="detail-aside">
              <div className="panel next-action">
                <span className="eyebrow">Your next step</span>
                <h2>
                  {wallet ? "Continue the agreement" : "Join with your wallet"}
                </h2>
                {!wallet ? (
                  <>
                    <p>
                      Connect the buyer or issuer wallet to see actions for your
                      role.
                    </p>
                    <button className="button primary" onClick={picker}>
                      Connect wallet
                    </button>
                  </>
                ) : actions.length === 0 ? (
                  <p className="muted">
                    No action is available for this wallet right now. Check the
                    agreement progress or return when the next step opens.
                  </p>
                ) : (
                  <>
                    {actions.includes("offer_grant") && (
                      <div className="field">
                        <label htmlFor="grant-terms">Your permission</label>
                        <textarea
                          id="grant-terms"
                          aria-describedby="grant-help"
                          rows={4}
                          value={grant}
                          onChange={(e) => setGrant(e.target.value)}
                          maxLength={1000}
                        />
                        <span id="grant-help" className="hint">
                          Offer a positive permission created inside this
                          protocol. It cannot be edited later.
                        </span>
                        <button
                          className="button primary"
                          disabled={pending || !service.ready}
                          onClick={() => void perform("offer_grant")}
                        >
                          Offer my permission
                        </button>
                      </div>
                    )}
                    {actions
                      .filter((m) => m !== "offer_grant")
                      .map((method) => (
                        <button
                          key={method}
                          className={`button ${method === "close_bundle" || method === "expire_permit" ? "subtle" : "primary"}`}
                          disabled={pending || !service.ready}
                          onClick={() => void perform(method)}
                        >
                          {method === "review_bundle" &&
                          bundle.state === "RETRYABLE"
                            ? "Retry coverage"
                            : actionLabel[method]}
                        </button>
                      ))}
                  </>
                )}
                {actionError && (
                  <p className="error" role="alert">
                    {actionError}
                  </p>
                )}
                {bundle.state === "PURCHASED" && (
                  <div className="permit-state">
                    <strong>
                      {bundle.permit === "AVAILABLE"
                        ? "Permission ready to use"
                        : bundle.permit === "CONSUMED"
                          ? "Permission used"
                          : "Permission expired"}
                    </strong>
                    <p className="small muted">
                      One protocol use. External service execution is not
                      recorded here.
                    </p>
                  </div>
                )}
              </div>
              <div className="deadline-list">
                <h3>Agreement timing</h3>
                <div>
                  <span>Offer & accept by</span>
                  <strong>{date(bundle.offerDeadline)}</strong>
                </div>
                <div>
                  <span>Review by</span>
                  <strong>{date(bundle.reviewDeadline)}</strong>
                </div>
                <div>
                  <span>Use permission by</span>
                  <strong>{date(bundle.useDeadline)}</strong>
                </div>
                <p className="small muted">
                  Deadline equality is late. The contract enforces its own
                  transaction time.
                </p>
              </div>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
function Credits() {
  const { wallet, picker, service, run, pending } = useProduct();
  const rows = useBundles();
  const [error, setError] = useState("");
  const credits = rows.data?.filter(
    (b) => wallet && Number(ownCredit(b, wallet.address)) > 0,
  );
  const withdraw = async (id: string) => {
    setError("");
    try {
      await run({ method: "withdraw_credit", id });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Withdrawal could not complete.",
      );
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="My credits"
        title="Your GEN, ready to recover."
        description="Withdraw your earned share or purchase refund to the wallet that owns it."
      />
      <ConfigurationNotice />
      {!wallet ? (
        <Empty
          title="Connect the credit owner's wallet"
          action={
            <button className="button primary" onClick={picker}>
              Connect wallet
            </button>
          }
        >
          Each credit belongs to its immutable buyer or issuer. Your wallet
          reveals the credits you can withdraw.
        </Empty>
      ) : rows.loading ? (
        <div className="loading" role="status">
          Checking your credits…
        </div>
      ) : rows.error ? (
        <LoadError message={rows.error} retry={rows.reload} />
      ) : credits?.length ? (
        <div className="credit-list">
          {credits.map((b) => (
            <article className="panel credit-card" key={b.id}>
              <div>
                <span className="eyebrow">
                  {b.state === "REFUNDED" ? "Purchase refund" : "Issuer share"}
                </span>
                <h2>{b.goal}</h2>
                <Link
                  className="text-link"
                  to={`/bundles/${encodeURIComponent(b.id)}`}
                >
                  Open agreement <ArrowUpRightIcon aria-hidden="true" />
                </Link>
              </div>
              <strong className="credit-amount">
                {ownCredit(b, wallet.address)} <span>GEN</span>
              </strong>
              <button
                className="button primary"
                disabled={!service.ready || pending}
                onClick={() => void withdraw(b.id)}
              >
                Withdraw GEN
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title={
            service.ready ? "No outstanding credit" : "Live credits unavailable"
          }
        >
          {service.ready
            ? "Your finalized shares and refunds will appear here. You can revisit prior agreements in the workspace."
            : "Configure the live contract connection before checking credit. No balance is simulated."}
        </Empty>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="scope-note">
        <WalletIcon aria-hidden="true" />
        <p>
          Withdrawals are real Studio Dev transactions. The recipient is fixed
          to your credit-owning wallet; network fees are separate.
        </p>
      </div>
    </>
  );
}
function Guide() {
  return (
    <>
      <PageHeading
        eyebrow="The guide"
        title="Meaning makes the difference."
        description="Understand the agreement, the coverage decision, and the limits of a protocol permission."
      />
      <div className="guide-layout">
        <nav className="guide-nav" aria-label="Guide sections">
          <a href="#workflow">The workflow</a>
          <a href="#sharing">Sharing rules</a>
          <a href="#recovery">Recovery</a>
          <a href="#limits">Scope & limits</a>
          <a href="#integrate">For builders</a>
        </nav>
        <div className="guide-content">
          <section id="workflow">
            <span className="eyebrow">01 / The workflow</span>
            <h2>One goal. Two grants. Three participants.</h2>
            <p>
              The buyer reserves 2 GEN and names two issuers. Each issuer
              authors one positive permission. All three participants accept the
              exact goal, grant texts, deadlines and sharing policy.
            </p>
            <p>
              A registered participant then requests coverage review. GenLayer
              validators independently assess whether A alone, B alone and both
              together fully authorize the goal. The contract derives the
              outcome from that complete verdict.
            </p>
          </section>
          <section id="sharing">
            <span className="eyebrow">02 / Sharing rules</span>
            <h2>Share what the bundle needs.</h2>
            <div className="rule-list">
              <article>
                <strong>Complementary grants</strong>
                <p>
                  Neither alone covers the goal, but together they do. Each
                  issuer earns 1 GEN.
                </p>
              </article>
              <article>
                <strong>Substitute grants</strong>
                <p>Either issuer covers the whole goal. Each earns 1 GEN.</p>
              </article>
              <article>
                <strong>One complete grant, one irrelevant grant</strong>
                <p>
                  The complete contributor earns 2 GEN. The other earns 0 GEN.
                </p>
              </article>
              <article>
                <strong>No complete bundle</strong>
                <p>
                  If even the combined grants leave a clear gap, the buyer
                  receives a 2 GEN refund credit.
                </p>
              </article>
            </div>
            <p>
              No model chooses payout amounts or recipients. The buyer receives
              one single-use protocol permit only when the combined goal is
              covered.
            </p>
          </section>
          <section id="recovery">
            <span className="eyebrow">03 / Recovery</span>
            <h2>Unclear meaning keeps the purchase reserved.</h2>
            <p>
              Unverifiable coverage creates no share or permit. A participant
              can retry within the review deadline and attempt limit. A failed
              or undetermined transaction must be checked before resending.
            </p>
            <p>
              If no settlement completes before the review deadline, the buyer
              can recover the reserved purchase as credit. Credits remain
              withdrawable; an unused purchased permit expires without revoking
              earned issuer shares. Archive only after no credit or active
              permit remains.
            </p>
          </section>
          <section id="limits">
            <span className="eyebrow">04 / Scope & limits</span>
            <h2>Protocol permission has a precise boundary.</h2>
            <p>
              Wallet-authenticated transactions create these permissions inside
              CoverWeave. They do not prove external delivery,
              intellectual-property title, legal authority or a real service's
              availability. Consuming a permit records protocol use; it does not
              call an external service.
            </p>
            <p>
              Studio Dev is a development network with real GEN fees. Adoption
              and third-party enforcement are future integrations, not existing
              product claims.
            </p>
          </section>
          <section id="integrate">
            <span className="eyebrow">05 / For builders</span>
            <h2>Use the primitive, keep your own product.</h2>
            <p>
              Integration contexts include permission-bundle workspaces,
              multi-tool permission brokers and joint-vendor authorization.
              These are proposed consumers, not adopters.
            </p>
            <details className="technical">
              <summary>Contract interface reference</summary>
              <p>
                Read isolated bundles, exact grants, coalition review history,
                single-use permit state and owner credits. Writes are
                role-checked and deadline-bound. Consumers must read finalized
                canonical permit state and prevent duplicate consumption.
              </p>
              <p>
                The full source, API reference and verified address will be
                linked after deployment. No address is invented during
                development.
              </p>
            </details>
          </section>
        </div>
      </div>
    </>
  );
}
function Account() {
  const { wallet, walletName, picker, logout, service } = useProduct();
  const [checking, setChecking] = useState(false);
  const [networkStatus, setNetworkStatus] = useState("");
  const checkNetwork = async () => {
    if (!service.probeNetwork) return;
    setChecking(true);
    setNetworkStatus("");
    try {
      await service.probeNetwork();
      setNetworkStatus("Studio Dev is reachable.");
    } catch {
      setNetworkStatus("Studio Dev could not be reached. Try the network check again.");
    } finally {
      setChecking(false);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="Account & network"
        title="Stay in control of your wallet."
        description="Choose the account you want to use. CoverWeave never asks for keys or recovery phrases."
      />
      <div className="account-grid">
        <section className="panel">
          <WalletIcon size={32} aria-hidden="true" />
          <h2>{wallet ? walletName : "No wallet connected"}</h2>
          {wallet ? (
            <>
              <p className="break">{wallet.address}</p>
              <div className="button-row">
                <button className="button subtle" onClick={picker}>
                  Change wallet
                </button>
                <button className="button subtle" onClick={logout}>
                  Disconnect
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                Connect an installed EVM wallet. You choose from the detected
                providers.
              </p>
              <button className="button primary" onClick={picker}>
                Choose wallet
              </button>
            </>
          )}
        </section>
        <section className="panel">
          <ShieldCheckIcon size={32} aria-hidden="true" />
          <h2>Studio Dev</h2>
          <p>
            All agreement transactions and GEN credits use Studio Dev. Wallet
            writes and Intelligent Contract reads use their compatible network
            paths.
          </p>
          <span className="badge">
            {service.ready
              ? "Live connection configured"
              : "Connection unavailable"}
          </span>
          <p className="small muted">
            Network switching is requested before a write. A displayed account
            does not mean a transaction has been signed.
          </p>
          {service.probeNetwork && <div className="button-row">
            <button className="button subtle" disabled={checking} onClick={() => void checkNetwork()}>
              {checking ? "Checking network…" : "Check network"}
            </button>
          </div>}
          {networkStatus && <p role="status">{networkStatus}</p>}
        </section>
      </div>
      <ConfigurationNotice />
    </>
  );
}
function RouteFocus() {
  const location = useLocation();
  useEffect(() => {
    document.getElementById("main-content")?.focus();
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  return null;
}
export function App({ service = adapter }: { service?: ContractAdapter }) {
  return (
    <ProductProvider service={service}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      <RouteFocus />
      <main id="main-content" tabIndex={-1}>
        <TransactionNotice />
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/bundles" element={<Workspace />} />
          <Route path="/bundles/new" element={<NewBundle />} />
          <Route path="/bundles/:id" element={<BundleDetail />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/account" element={<Account />} />
          <Route
            path="*"
            element={
              <Empty
                title="This page could not be found"
                action={
                  <Link className="button primary" to="/bundles">
                    Return to workspace
                  </Link>
                }
              >
                Check your link or open the workspace to find an agreement.
              </Empty>
            }
          />
        </Routes>
      </main>
      <Footer />
    </ProductProvider>
  );
}
