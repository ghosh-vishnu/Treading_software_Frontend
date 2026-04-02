"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { api } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";
import type { UserProfile } from "@/lib/types";

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

const TAB_LABELS: Array<{ key: ActiveTab; label: string }> = [
  { key: "profile", label: "Profile Setting" },
  { key: "trading", label: "Trading Account" },
  { key: "password", label: "Password Reset" },
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
      void api
        .get<BrokerAccountSnapshot>("/broker/account")
        .then((response) => setBrokerSnapshot(response.data))
        .catch(() => setBrokerSnapshot(null));
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

  const brokerText = useMemo(() => {
    if (!brokerSnapshot?.balance) {
      return "No broker connected yet.";
    }

    const currency = brokerSnapshot.balance.currency || "USD";
    const balance = brokerSnapshot.balance.balance ?? "--";
    const broker = brokerSnapshot.balance.broker || "Connected Broker";
    return `${broker} | ${currency} ${balance}`;
  }, [brokerSnapshot]);

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
                <div className="relative overflow-hidden rounded-2xl border border-[#1E2530] bg-[radial-gradient(circle_at_20%_20%,#183525_0%,#111a22_45%,#0D1118_100%)] p-5 sm:p-6">
                  <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#9BFF00]/10 blur-3xl" />
                  <div className="pointer-events-none absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-[#3CD6A8]/10 blur-2xl" />

                  <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#314152] bg-[#0E141B] text-2xl font-semibold text-[#DFF6E6]">
                        {profileForm.full_name?.trim()?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold text-[#F4F8FC]">Profile Studio</h2>
                        <p className="mt-1 text-sm text-[#9CACBC]">Tune your identity, contact and trading persona in one place.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl border border-[#27303B] bg-[#0A1016]/80 px-3 py-2">
                        <p className="text-[#AAB6C4]">Level</p>
                        <p className="mt-1 font-semibold text-[#F3F7FB]">{profileForm.experience_level || "N/A"}</p>
                      </div>
                      <div className="rounded-xl border border-[#27303B] bg-[#0A1016]/80 px-3 py-2">
                        <p className="text-[#AAB6C4]">Risk</p>
                        <p className="mt-1 font-semibold text-[#F3F7FB]">Balanced</p>
                      </div>
                      <div className="rounded-xl border border-[#27303B] bg-[#0A1016]/80 px-3 py-2">
                        <p className="text-[#AAB6C4]">Status</p>
                        <p className="mt-1 font-semibold text-[#95FF45]">{profile?.is_active ? "Verified" : "Pending"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {loadingProfile ? (
                  <div className="rounded-xl border border-[#283240] bg-[#111822] px-4 py-3 text-sm text-[#9CB0C3]">Loading profile data...</div>
                ) : null}

                {profileError ? (
                  <div className="rounded-xl border border-[#4F2A2A] bg-[#2A1414] px-4 py-3 text-sm text-[#FFB4B4]">{profileError}</div>
                ) : null}

                {profileMessage ? (
                  <div className="rounded-xl border border-[#31503A] bg-[#142419] px-4 py-3 text-sm text-[#AEE7B8]">{profileMessage}</div>
                ) : null}

                <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
                  <div className="rounded-2xl border border-[#1E2530] bg-[#0C1117] p-5">
                    <div className="flex items-center justify-between border-b border-[#202A35] pb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#F3F7FB]">Personal Information</h3>
                        <p className="mt-1 text-xs text-[#8B95A1]">This data appears across your dashboard and account reports.</p>
                      </div>
                      <span className="rounded-full border border-[#334252] bg-[#111A23] px-3 py-1 text-xs text-[#A8EFC6]">Live Preview</span>
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

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#1E2530] bg-[#0C1117] p-4">
                      <p className="text-sm font-medium text-[#E7EDF5]">Avatar & Visibility</p>
                      <p className="mt-1 text-xs text-[#8591A0]">Control how your profile appears to followers.</p>

                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#334252] bg-[#131B24] text-lg font-semibold text-[#DFF6E6]">
                          {(profileForm.full_name || "UG")
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part.charAt(0).toUpperCase())
                            .join("") || "UG"}
                        </div>
                        <div className="flex gap-2">
                          <button className="rounded-lg border border-[#344353] bg-[#121A23] px-3 py-1.5 text-xs text-[#C5CFDA] hover:bg-[#16212D]">Upload</button>
                          <button className="rounded-lg border border-[#2E3640] bg-[#0E131A] px-3 py-1.5 text-xs text-[#8F9BA9] hover:bg-[#141B23]">Remove</button>
                        </div>
                      </div>

                      <label className="mt-4 flex items-center justify-between rounded-xl border border-[#27303B] bg-[#10161F] px-3 py-2">
                        <span className="text-xs text-[#AAB6C4]">Public profile visibility</span>
                        <input
                          type="checkbox"
                          checked={profileForm.public_profile}
                          onChange={(e) => updateProfileField("public_profile", e.target.checked)}
                          className="h-4 w-4 accent-[#9BFF00]"
                        />
                      </label>
                    </div>

                    <div className="rounded-2xl border border-[#1E2530] bg-[#0C1117] p-4">
                      <p className="text-sm font-medium text-[#E7EDF5]">Quick Preferences</p>
                      <div className="mt-3 space-y-2 text-xs text-[#9AA5B1]">
                        <label className="flex items-center justify-between rounded-lg border border-[#25303A] bg-[#0F151D] px-3 py-2">
                          Trade alerts on email
                          <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#9BFF00]" />
                        </label>
                        <label className="flex items-center justify-between rounded-lg border border-[#25303A] bg-[#0F151D] px-3 py-2">
                          Weekly account summary
                          <input type="checkbox" className="h-4 w-4 accent-[#9BFF00]" />
                        </label>
                        <label className="flex items-center justify-between rounded-lg border border-[#25303A] bg-[#0F151D] px-3 py-2">
                          Strategy performance digest
                          <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#9BFF00]" />
                        </label>
                      </div>
                    </div>
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
                <h2 className="text-xl font-semibold text-[#F3F7FB]">Connect Your Trading Accounts</h2>
                <p className="mt-2 text-sm text-[#8B95A1]">
                  Manage all your accounts from a single dashboard. You can link up to 6 different accounts.
                </p>

                <div className="mt-4 rounded-xl border border-[#242C35] bg-[#0E141B] px-4 py-3">
                  <p className="text-sm text-[#DDE4EC]">{brokerText}</p>
                  <p className="mt-1 text-xs text-[#7E8A97]">Open Positions: {brokerSnapshot?.positions?.length ?? 0}</p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button className="flex items-center gap-3 rounded-xl border border-[#2D3744] bg-[#101722] px-4 py-3 text-left hover:border-[#3A4A5E]">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#182535] text-xs font-semibold text-[#9BFF00]">D</span>
                    <div>
                      <p className="text-sm font-medium text-[#EEF4FA]">Delta Exchange</p>
                      <p className="text-xs text-[#8B95A1]">Connected</p>
                    </div>
                  </button>

                  <button className="flex items-center gap-3 rounded-xl border border-[#2A313A] bg-[#0B1118] px-4 py-3 text-left hover:border-[#3A4A5E]">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1E2A1F] text-xs font-semibold text-[#67E8A5]">C</span>
                    <div>
                      <p className="text-sm font-medium text-[#EEF4FA]">Coin Switch</p>
                      <p className="text-xs text-[#8B95A1]">Ready to connect</p>
                    </div>
                  </button>

                  <div className="flex items-center gap-3 rounded-xl border border-[#242C35] bg-[#0C1117] px-4 py-3 opacity-70">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1A2029] text-xs font-semibold text-[#64748B]">B</span>
                    <div>
                      <p className="text-sm font-medium text-[#9AA5B1]">Binance</p>
                      <p className="text-xs text-[#667281]">Coming soon</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-[#242C35] bg-[#0C1117] px-4 py-3 opacity-70">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1A2029] text-xs font-semibold text-[#64748B]">C</span>
                    <div>
                      <p className="text-sm font-medium text-[#9AA5B1]">CoinDCX</p>
                      <p className="text-xs text-[#667281]">Coming soon</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-[#242C35] bg-[#0C1117] px-4 py-3 opacity-70">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1A2029] text-xs font-semibold text-[#64748B]">M</span>
                    <div>
                      <p className="text-sm font-medium text-[#9AA5B1]">Mudrex</p>
                      <p className="text-xs text-[#667281]">Coming soon</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-[#242C35] bg-[#0C1117] px-4 py-3 opacity-70">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1A2029] text-xs font-semibold text-[#64748B]">P</span>
                    <div>
                      <p className="text-sm font-medium text-[#9AA5B1]">Pi42</p>
                      <p className="text-xs text-[#667281]">Coming soon</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "password" ? (
              <div>
                <h2 className="text-xl font-semibold text-[#F3F7FB]">Password Reset</h2>
                <p className="mt-2 text-sm text-[#8B95A1]">Change your password securely.</p>

                <div className="mt-6 space-y-4">
                  <label className="block text-sm text-[#9AA5B1]">
                    Current Password
                    <input type="password" className="mt-1 w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]" />
                  </label>
                  <label className="block text-sm text-[#9AA5B1]">
                    New Password
                    <input type="password" className="mt-1 w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]" />
                  </label>
                  <label className="block text-sm text-[#9AA5B1]">
                    Confirm Password
                    <input type="password" className="mt-1 w-full rounded-lg border border-[#242C35] bg-[#0E141B] px-3 py-2 text-[#E8ECEF]" />
                  </label>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button className="rounded-lg border border-[#2A313A] bg-[#0B0F14] px-4 py-2 text-sm text-[#C1CBD8] hover:bg-[#10151D]">Reset</button>
                  <button className="rounded-lg bg-[#9BFF00] px-5 py-2 font-semibold text-[#11140D] hover:bg-[#B7FF45]">Update Password</button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
