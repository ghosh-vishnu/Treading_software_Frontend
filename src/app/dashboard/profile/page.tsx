"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { api } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";
import type { BrokerAccount, UserProfile } from "@/lib/types";

type ActiveTab = "profile" | "trading" | "password" | "notification";

type BrokerAccountSnapshot = {
  balance?: {
    broker?: string;
    balance?: string | number;
    currency?: string;
  };
  positions?: Array<Record<string, unknown>>;
};

type ProfileFormState = {
  full_name: string;
  username: string;
  email: string;
  phone: string;
  gender: string;
  age: string;
  experience_level: string;
  bio: string;
  public_profile: boolean;
};

type PasswordFormState = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

type BrokerCatalogItem = {
  id: string;
  name: string;
  badge: string;
  comingSoon?: boolean;
};

const DEFAULT_PROFILE_FORM: ProfileFormState = {
  full_name: "",
  username: "",
  email: "",
  phone: "",
  gender: "",
  age: "",
  experience_level: "Intermediate",
  bio: "",
  public_profile: true,
};

const DEFAULT_PASSWORD_FORM: PasswordFormState = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

const TAB_LABELS: Array<{ key: ActiveTab; label: string }> = [
  { key: "profile", label: "Profile Setting" },
  { key: "trading", label: "Trading Account" },
  { key: "password", label: "Password Reset" },
];

const BROKER_CATALOG: BrokerCatalogItem[] = [
  { id: "coinswitch", name: "CoinSwitch", badge: "CS" },
  { id: "shark", name: "Shark", badge: "SH" },
  { id: "cryptx", name: "Cryptx", badge: "CX" },
  { id: "bybit", name: "ByBit", badge: "BB" },
  { id: "pi42", name: "Pi42", badge: "P4", comingSoon: true },
  { id: "binance", name: "Binance", badge: "BN", comingSoon: true },
  { id: "coindcx", name: "CoinDCX", badge: "CD", comingSoon: true },
  { id: "mudrex", name: "Mudrex", badge: "MX", comingSoon: true },
];

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = (searchParams.get("tab") || "profile") as ActiveTab;
  const activeTab: ActiveTab = ["profile", "trading", "password", "notification"].includes(requestedTab)
    ? requestedTab
    : "profile";

  const [brokerSnapshot, setBrokerSnapshot] = useState<BrokerAccountSnapshot | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(DEFAULT_PROFILE_FORM);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(DEFAULT_PASSWORD_FORM);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<BrokerAccount[]>([]);
  const [loadingTrading, setLoadingTrading] = useState(false);
  const [tradingError, setTradingError] = useState<string | null>(null);
  const [tradingMessage, setTradingMessage] = useState<string | null>(null);
  const [removingAccountId, setRemovingAccountId] = useState<number | null>(null);
  const [showAddAccountCatalog, setShowAddAccountCatalog] = useState(false);

  const deltaConnected = (brokerSnapshot?.balance?.broker || "").toLowerCase().includes("delta");

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }

    if (activeTab === "profile") {
      setLoadingProfile(true);
      setProfileMessage(null);
      setProfileError(null);
      void api
        .get<UserProfile>("/auth/me")
        .then((response) => {
          const user = response.data;
          setProfile(user);
          setProfileForm({
            full_name: user.full_name,
            username: user.username ?? "",
            email: user.email,
            phone: user.phone ?? "",
            gender: user.gender ?? "",
            age: user.age ? String(user.age) : "",
            experience_level: user.experience_level ?? "Intermediate",
            bio: user.bio ?? "",
            public_profile: user.public_profile,
          });
        })
        .catch(() => setProfileError("Unable to load profile data."))
        .finally(() => setLoadingProfile(false));
    }

    if (activeTab === "trading") {
      setShowAddAccountCatalog(false);
      setLoadingTrading(true);
      setTradingError(null);
      setTradingMessage(null);
      void api
        .get<BrokerAccount[]>("/broker/accounts")
        .then(async (accountsResponse) => {
          const accounts = accountsResponse.data;
          setConnectedAccounts(accounts);

          if (accounts.length > 0) {
            try {
              const snapshotResponse = await api.get<BrokerAccountSnapshot>("/broker/account");
              setBrokerSnapshot(snapshotResponse.data);
            } catch {
              setBrokerSnapshot(null);
            }
          } else {
            setBrokerSnapshot(null);
          }
        })
        .catch(() => {
          setConnectedAccounts([]);
          setBrokerSnapshot(null);
          setTradingError("Unable to load connected broker accounts.");
        })
        .finally(() => setLoadingTrading(false));
    }
  }, [activeTab, router]);


  const setTab = (tab: ActiveTab) => router.push(`/dashboard/profile?tab=${tab}`);

  const onLogout = () => {
    clearTokens();
    router.push("/login");
  };

  const updateProfileField = <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetProfileForm = () => {
    if (!profile) {
      return;
    }

    setProfileForm({
      full_name: profile.full_name,
      username: profile.username ?? "",
      email: profile.email,
      phone: profile.phone ?? "",
      gender: profile.gender ?? "",
      age: profile.age ? String(profile.age) : "",
      experience_level: profile.experience_level ?? "Intermediate",
      bio: profile.bio ?? "",
      public_profile: profile.public_profile,
    });
    setProfileMessage("Changes reset.");
    setProfileError(null);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage(null);
    setProfileError(null);

    try {
      const payload = {
        full_name: profileForm.full_name.trim(),
        username: profileForm.username.trim() || null,
        phone: profileForm.phone.trim() || null,
        gender: profileForm.gender.trim() || null,
        age: profileForm.age.trim() ? Number(profileForm.age) : null,
        experience_level: profileForm.experience_level || null,
        bio: profileForm.bio.trim() || null,
        public_profile: profileForm.public_profile,
      };

      const response = await api.patch<UserProfile>("/auth/me", payload);
      const user = response.data;
      setProfile(user);
      setProfileForm((prev) => ({ ...prev, email: user.email }));
      setProfileMessage("Profile updated successfully.");
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setProfileError(typeof detail === "string" ? detail : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePasswordField = <K extends keyof PasswordFormState>(field: K, value: PasswordFormState[K]) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetPasswordForm = () => {
    setPasswordForm(DEFAULT_PASSWORD_FORM);
    setPasswordMessage(null);
    setPasswordError(null);
  };

  const savePassword = async () => {
    setPasswordMessage(null);
    setPasswordError(null);

    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      setPasswordError("Please fill all password fields.");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New password and confirm password must match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const response = await api.post<{ message: string }>("/auth/change-password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordMessage(response.data.message || "Password updated successfully.");
      setPasswordForm(DEFAULT_PASSWORD_FORM);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setPasswordError(typeof detail === "string" ? detail : "Failed to update password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const brokerText = useMemo(() => {
    if (!brokerSnapshot?.balance) {
      return "No broker connected yet.";
    }

    const currency = brokerSnapshot.balance.currency || "USD";
    const balance = brokerSnapshot.balance.balance ?? "--";
    const broker = brokerSnapshot.balance.broker || "Connected Broker";
    return `${broker} | ${currency} ${balance}`;
  }, [brokerSnapshot]);

  const totalBalanceLabel = useMemo(() => {
    if (!brokerSnapshot?.balance) {
      return "--";
    }
    const currency = brokerSnapshot.balance.currency || "USD";
    const balance = brokerSnapshot.balance.balance ?? "--";
    return `${currency} ${balance}`;
  }, [brokerSnapshot]);

  const openPositionsCount = brokerSnapshot?.positions?.length ?? 0;

  const formatBrokerName = (value: string) => {
    if (value.toLowerCase() === "delta") {
      return "Delta Exchange";
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const openAddAccountCatalog = () => {
    setShowAddAccountCatalog(true);
  };

  const closeAddAccountCatalog = () => {
    setShowAddAccountCatalog(false);
  };

  const removeAccount = async (account: BrokerAccount) => {
    const confirmed = window.confirm(`Remove ${formatBrokerName(account.broker_name)} account?`);
    if (!confirmed) {
      return;
    }

    setTradingError(null);
    setTradingMessage(null);
    setRemovingAccountId(account.id);

    try {
      await api.delete(`/broker/accounts/${account.id}`);
      const nextAccounts = connectedAccounts.filter((item) => item.id !== account.id);
      setConnectedAccounts(nextAccounts);
      if (nextAccounts.length === 0) {
        setBrokerSnapshot(null);
      } else {
        try {
          const snapshotResponse = await api.get<BrokerAccountSnapshot>("/broker/account");
          setBrokerSnapshot(snapshotResponse.data);
        } catch {
          setBrokerSnapshot(null);
        }
      }
      setTradingMessage("Broker account removed successfully.");
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setTradingError(typeof detail === "string" ? detail : "Failed to remove broker account.");
    } finally {
      setRemovingAccountId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#050607] text-[#E8ECEF]">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl border border-[#1A1E23] bg-[#090B0F]/90 px-5 py-4 shadow-[0_0_0_1px_rgba(153,255,0,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1A1E23] pb-4">
            <nav className="flex items-center gap-2 text-sm">
              <button onClick={() => router.push("/dashboard")} className="rounded-full px-3 py-1.5 text-[#AAB4C0] hover:bg-[#0F141B] hover:text-[#F3F7FB]">Dashboard</button>
              <button className="rounded-full px-3 py-1.5 text-[#AAB4C0] hover:bg-[#0F141B] hover:text-[#F3F7FB]">Strategy</button>
              <button className="rounded-full px-3 py-1.5 text-[#AAB4C0] hover:bg-[#0F141B] hover:text-[#F3F7FB]">Academy</button>
            </nav>

            <div className="flex items-center gap-2">
              <button onClick={onLogout} className="rounded-full border border-[#2A313A] bg-[#0B0F14] px-4 py-2 text-sm text-[#C1CBD8] hover:bg-[#10151D]">Sign Out</button>
            </div>
          </div>

          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[#8B95A1]">Account Settings</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#F6FAFF]">Profile & Account</h1>
        </header>

        <section className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-4">
            <div className="space-y-1">
              {TAB_LABELS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    activeTab === item.key
                      ? "bg-[#111822] text-[#F6FAFF]"
                      : "text-[#9AA5B1] hover:bg-[#10151D] hover:text-[#DDE4EC]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <div className="rounded-2xl border border-[#1A1E23] bg-[#0A0D13] p-6">
            {activeTab === "profile" ? (
              <div className="space-y-6">
                {loadingProfile ? (
                  <div className="rounded-xl border border-[#283240] bg-[#111822] px-4 py-3 text-sm text-[#9CB0C3]">Loading profile data...</div>
                ) : null}

                {profileError ? (
                  <div className="rounded-xl border border-[#4F2A2A] bg-[#2A1414] px-4 py-3 text-sm text-[#FFB4B4]">{profileError}</div>
                ) : null}

                {profileMessage ? (
                  <div className="rounded-xl border border-[#31503A] bg-[#142419] px-4 py-3 text-sm text-[#AEE7B8]">{profileMessage}</div>
                ) : null}

                <div className="rounded-2xl border border-[#1E2530] bg-[#0C1117] p-5">
                    <div className="flex items-center justify-between border-b border-[#202A35] pb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#F3F7FB]">Personal Information</h3>
                        <p className="mt-1 text-xs text-[#8B95A1]">This data appears across your dashboard and account reports.</p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <label className="text-sm text-[#9AA5B1]">
                        Full Name
                        <input
                          className="mt-1.5 w-full rounded-xl border border-[#26303B] bg-[#0E141B] px-3 py-2.5 text-[#E8ECEF] placeholder:text-[#5E6A78] focus:border-[#3A4A5C] focus:outline-none"
                          value={profileForm.full_name}
                          onChange={(e) => updateProfileField("full_name", e.target.value)}
                        />
                      </label>

                      <label className="text-sm text-[#9AA5B1]">
                        Username
                        <input
                          className="mt-1.5 w-full rounded-xl border border-[#26303B] bg-[#0E141B] px-3 py-2.5 text-[#E8ECEF] placeholder:text-[#5E6A78] focus:border-[#3A4A5C] focus:outline-none"
                          value={profileForm.username}
                          onChange={(e) => updateProfileField("username", e.target.value)}
                        />
                      </label>

                      <label className="text-sm text-[#9AA5B1] sm:col-span-2">
                        Email Address
                        <input
                          className="mt-1.5 w-full rounded-xl border border-[#26303B] bg-[#0E141B] px-3 py-2.5 text-[#A3AEBB] placeholder:text-[#5E6A78] focus:border-[#3A4A5C] focus:outline-none"
                          value={profileForm.email}
                          readOnly
                        />
                      </label>

                      <label className="text-sm text-[#9AA5B1]">
                        Phone
                        <input
                          className="mt-1.5 w-full rounded-xl border border-[#26303B] bg-[#0E141B] px-3 py-2.5 text-[#E8ECEF] placeholder:text-[#5E6A78] focus:border-[#3A4A5C] focus:outline-none"
                          value={profileForm.phone}
                          onChange={(e) => updateProfileField("phone", e.target.value)}
                        />
                      </label>

                      <label className="text-sm text-[#9AA5B1]">
                        Experience
                        <select
                          className="mt-1.5 w-full rounded-xl border border-[#26303B] bg-[#0E141B] px-3 py-2.5 text-[#E8ECEF] focus:border-[#3A4A5C] focus:outline-none"
                          value={profileForm.experience_level}
                          onChange={(e) => updateProfileField("experience_level", e.target.value)}
                        >
                          <option>Beginner</option>
                          <option>Intermediate</option>
                          <option>Advanced</option>
                        </select>
                      </label>

                      <label className="text-sm text-[#9AA5B1]">
                        Gender
                        <select
                          className="mt-1.5 w-full rounded-xl border border-[#26303B] bg-[#0E141B] px-3 py-2.5 text-[#E8ECEF] focus:border-[#3A4A5C] focus:outline-none"
                          value={profileForm.gender}
                          onChange={(e) => updateProfileField("gender", e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </label>

                      <label className="text-sm text-[#9AA5B1]">
                        Age
                        <input
                          type="number"
                          min={13}
                          max={120}
                          className="mt-1.5 w-full rounded-xl border border-[#26303B] bg-[#0E141B] px-3 py-2.5 text-[#E8ECEF] placeholder:text-[#5E6A78] focus:border-[#3A4A5C] focus:outline-none"
                          value={profileForm.age}
                          onChange={(e) => updateProfileField("age", e.target.value)}
                        />
                      </label>

                      <label className="text-sm text-[#9AA5B1] sm:col-span-2">
                        Bio
                        <textarea
                          rows={3}
                          className="mt-1.5 w-full resize-none rounded-xl border border-[#26303B] bg-[#0E141B] px-3 py-2.5 text-[#E8ECEF] placeholder:text-[#5E6A78] focus:border-[#3A4A5C] focus:outline-none"
                          value={profileForm.bio}
                          onChange={(e) => updateProfileField("bio", e.target.value)}
                        />
                      </label>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#202A35] pt-4">
                  <button
                    onClick={resetProfileForm}
                    className="rounded-lg border border-[#2A313A] bg-[#0B0F14] px-4 py-2 text-sm text-[#C1CBD8] hover:bg-[#10151D]"
                  >
                    Reset
                  </button>
                  <button
                    onClick={saveProfile}
                    disabled={savingProfile || loadingProfile}
                    className="rounded-lg bg-[#9BFF00] px-6 py-2 font-semibold text-[#11140D] shadow-[0_10px_30px_rgba(155,255,0,0.2)] hover:bg-[#B7FF45] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : null}

            {activeTab === "trading" ? (
              <div>
                {showAddAccountCatalog ? (
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-3xl font-semibold text-[#F3F7FB]">Connect Your Trading Accounts</h2>
                        <p className="mt-2 text-sm text-[#8B95A1]">Manage all your accounts from a single dashboard. You can link up to 8 different accounts.</p>
                      </div>
                      <button
                        onClick={closeAddAccountCatalog}
                        className="rounded-full border border-[#2A313A] bg-[#0B0F14] px-4 py-2 text-sm text-[#C1CBD8] hover:bg-[#10151D]"
                      >
                        Back
                      </button>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      {BROKER_CATALOG.map((item) => (
                        <button
                          key={item.id}
                          disabled={item.comingSoon}
                          className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-left ${
                            item.comingSoon
                              ? "cursor-not-allowed border-[#242C35] bg-[#0C1117] opacity-60"
                              : "border-[#2D3744] bg-[#101722] hover:border-[#3A4A5E]"
                          }`}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#27303A] bg-[#111822] text-xs font-semibold text-[#9BFF00]">
                            {item.badge}
                          </span>
                          <div>
                            <p className="text-lg font-semibold text-[#EEF4FA]">{item.name}</p>
                            <p className="text-sm text-[#8B95A1]">{item.comingSoon ? "Coming soon" : "Tap to connect"}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-3xl font-semibold text-[#F3F7FB]">Connected Accounts</h2>
                    <p className="mt-2 text-sm text-[#8B95A1]">Connect your exchanges and automate your trades seamlessly.</p>

                    <div className="mt-6 flex items-center justify-end">
                      <button
                        onClick={openAddAccountCatalog}
                        className="rounded-full bg-[#9BFF00] px-5 py-2 text-sm font-semibold text-[#11140D] hover:bg-[#B7FF45]"
                      >
                        + Add Account
                      </button>
                    </div>

                    {loadingTrading && connectedAccounts.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-[#242C35] bg-[#0E141B] px-4 py-3 text-sm text-[#AAB4C0]">Loading connected accounts...</div>
                    ) : null}

                    {tradingError ? (
                      <div className="mt-4 rounded-xl border border-[#4F2A2A] bg-[#2A1414] px-4 py-3 text-sm text-[#FFB4B4]">{tradingError}</div>
                    ) : null}

                    {tradingMessage ? (
                      <div className="mt-4 rounded-xl border border-[#31503A] bg-[#142419] px-4 py-3 text-sm text-[#AEE7B8]">{tradingMessage}</div>
                    ) : null}

                    <div className="mt-6 divide-y divide-[#20262E] rounded-2xl border border-[#1E2530] bg-[#0C1117]">
                      {connectedAccounts.length === 0 && !loadingTrading ? (
                        <div className="px-5 py-8 text-sm text-[#93A0AD]">No connected accounts yet. Click Add Account to connect your broker.</div>
                      ) : null}

                      {connectedAccounts.map((account) => {
                        const isDeltaRow = account.broker_name.toLowerCase() === "delta";
                        const rowBalance = isDeltaRow ? totalBalanceLabel : "--";
                        const rowPositions = isDeltaRow ? openPositionsCount : 0;

                        return (
                          <div key={account.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#27303A] bg-[#111822] text-sm font-semibold text-[#9BFF00]">
                                {account.broker_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xl font-semibold text-[#EEF4FA]">{formatBrokerName(account.broker_name)}</p>
                                <p className="mt-0.5 text-sm text-[#8B95A1]">Client ID: {account.display_client_id || "XXXXXX"}</p>
                                <p className="mt-0.5 text-xs text-[#6F7A87]">{rowPositions} open positions</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <p className="text-2xl font-semibold text-[#F3F7FB]">{rowBalance}</p>
                              <button
                                onClick={() => void removeAccount(account)}
                                disabled={removingAccountId === account.id}
                                className="rounded-full border border-[#2A313A] p-2 text-[#AAB4C0] hover:bg-[#10151D] disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label="Remove account"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M8 10v8" />
                                  <path d="M12 10v8" />
                                  <path d="M16 10v8" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {deltaConnected ? (
                      <p className="mt-4 text-xs text-[#7E8A97]">{brokerText}</p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {activeTab === "password" ? (
              <div>
                <h2 className="text-xl font-semibold text-[#F3F7FB]">Password Reset</h2>
                <p className="mt-2 text-sm text-[#8B95A1]">Change your password securely.</p>

                {passwordError ? (
                  <div className="mt-4 rounded-xl border border-[#4F2A2A] bg-[#2A1414] px-4 py-3 text-sm text-[#FFB4B4]">{passwordError}</div>
                ) : null}

                {passwordMessage ? (
                  <div className="mt-4 rounded-xl border border-[#31503A] bg-[#142419] px-4 py-3 text-sm text-[#AEE7B8]">{passwordMessage}</div>
                ) : null}

                <div className="mt-6 space-y-4">
                  <label className="block text-sm text-[#9AA5B1]">
                    Current Password
                    <input
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => updatePasswordField("current_password", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]"
                    />
                  </label>
                  <label className="block text-sm text-[#9AA5B1]">
                    New Password
                    <input
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) => updatePasswordField("new_password", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]"
                    />
                  </label>
                  <label className="block text-sm text-[#9AA5B1]">
                    Confirm Password
                    <input
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => updatePasswordField("confirm_password", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]"
                    />
                  </label>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={resetPasswordForm}
                    className="rounded-lg border border-[#2A313A] bg-[#0B0F14] px-4 py-2 text-sm text-[#C1CBD8] hover:bg-[#10151D]"
                  >
                    Reset
                  </button>
                  <button
                    onClick={savePassword}
                    disabled={updatingPassword}
                    className="rounded-lg bg-[#9BFF00] px-5 py-2 font-semibold text-[#11140D] hover:bg-[#B7FF45] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
