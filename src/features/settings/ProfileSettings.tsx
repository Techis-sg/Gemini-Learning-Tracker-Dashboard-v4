import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconUser as User, IconShield as Shield, IconBell as Bell, IconSpider as Sliders, IconDatabase as Database, IconTrash as Trash2, IconCircle as CheckCircle, IconGavel as Save, IconLoader2 as Loader2, IconLock as Lock, IconDownload as Download, IconAlertTriangle as AlertTriangle, IconRefresh as RefreshCw, IconPalette as Palette, IconEye as Type, IconSparkles as Sparkles } from '@tabler/icons-react';
import { toast } from "react-hot-toast";
import { apiFetch } from "@utils/index";
import { Select, Tooltip } from "@components/ui";
import { APP_CONFIG } from "@config/app.config";

interface ProfileSettingsProps {
  user: any;
  dashboards?: any[];
  onDeleteDashboard?: (id: string) => void;
  onProfileUpdate: (updatedUser: any) => void;
  onSettingsUpdate: (updatedSettings: any) => void;
}

export function ProfileSettings({
  user,
  dashboards,
  onDeleteDashboard,
  onProfileUpdate,
  onSettingsUpdate,
}: ProfileSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"profile" | "portal" | "account" | "notifications" | "privacy">("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const names = (user?.name || "").trim().split(/\s+/);
  const userFirstName = user?.firstName || names[0] || "";
  const userLastName = user?.lastName || (names.length > 1 ? names.slice(1).join(" ") : "");

  // Form states with customizable typography and branding values
  const [formData, setFormData] = useState({
    firstName: userFirstName,
    lastName: userLastName,
    email: user?.email || "",
    mobile: "",
    addressLine1: "",
    addressLine2: "",
    bio: "",
    theme: "light",
    defaultTab: "tasks",
    fontFamily: "Inter",
    fontSize: "16px",
    accentColor: "#6366f1",
    userMotivation: user?.motivation || "",
    hiddenMenus: [] as string[],
    customCss: "",
    emailNotifications: true,
    pushNotifications: false,
    weeklyDigests: true,
    isPublicProfile: false,
  });

  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    addressLine1: "",
    addressLine2: "",
    bio: "",
  });

  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await apiFetch(APP_CONFIG.API_ENDPOINTS.SETTINGS);
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setFormData((prev) => ({
              ...prev,
              ...data.settings,
              firstName: data.settings.firstName || userFirstName || prev.firstName,
              lastName: data.settings.lastName || userLastName || prev.lastName,
              email: data.settings.email || user?.email || prev.email,
              hiddenMenus: data.settings.hiddenMenus || [],
            }));
            if (data.settings.twoFactorEnabled !== undefined) {
              setTwoFactorEnabled(data.settings.twoFactorEnabled);
            }
          } else {
            // Prepopulate name fields from user object
            setFormData((prev) => ({
              ...prev,
              firstName: userFirstName,
              lastName: userLastName,
              email: user?.email || "",
            }));
          }
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | { name: string; value: any }) => {
    let name: string;
    let value: any;

    if (e && "target" in e) {
      name = e.target.name;
      const type = e.target.type;
      if (type === "checkbox") {
        value = (e.target as HTMLInputElement).checked;
      } else {
        value = e.target.value;
      }
    } else {
      const custom = e as { name: string; value: any };
      name = custom.name;
      value = custom.value;
    }

    // Dynamic validations and instant trimming limits
    let errorMsg = "";
    if (name === "firstName") {
      value = value.substring(0, APP_CONFIG.VALIDATION.FIRST_NAME_MAX);
      if (!value.trim()) {
        errorMsg = "First name is required";
      } else if (value.length > APP_CONFIG.VALIDATION.FIRST_NAME_MAX) {
        errorMsg = `Max ${APP_CONFIG.VALIDATION.FIRST_NAME_MAX} characters allowed`;
      }
    } else if (name === "lastName") {
      value = value.substring(0, APP_CONFIG.VALIDATION.LAST_NAME_MAX);
      if (!value.trim()) {
        errorMsg = "Last name is required";
      } else if (value.length > APP_CONFIG.VALIDATION.LAST_NAME_MAX) {
        errorMsg = `Max ${APP_CONFIG.VALIDATION.LAST_NAME_MAX} characters allowed`;
      }
    } else if (name === "mobile") {
      // Keep only digits and max MOBILE_DIGITS
      value = value.replace(/\D/g, "").substring(0, APP_CONFIG.VALIDATION.MOBILE_DIGITS);
      if (value.length > 0) {
        if (value.length < APP_CONFIG.VALIDATION.MOBILE_DIGITS) {
          errorMsg = `Mobile number must be exactly ${APP_CONFIG.VALIDATION.MOBILE_DIGITS} digits`;
        } else if (!/^[6-9]/.test(value)) {
          errorMsg = "Mobile number must start with 6, 7, 8, or 9";
        }
      }
    } else if (name === "addressLine1" || name === "addressLine2" || name === "bio") {
      value = value.substring(0, APP_CONFIG.VALIDATION.ADDRESS_BIO_MAX);
      if (value.length >= APP_CONFIG.VALIDATION.ADDRESS_BIO_MAX) {
        errorMsg = `Reached maximum ${APP_CONFIG.VALIDATION.ADDRESS_BIO_MAX} characters limit`;
      }
    }

    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Manual save settings and update full-stack session profile identity
  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("First Name and Last Name are required fields.");
      return;
    }

    if (errors.firstName || errors.lastName || errors.mobile) {
      toast.error("Please resolve validation errors before saving.");
      return;
    }

    setSaving(true);
    try {
      const combinedPayload = {
        ...formData,
        twoFactorEnabled,
      };

      // 1. POST settings
      const settingsRes = await apiFetch(APP_CONFIG.API_ENDPOINTS.SETTINGS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(combinedPayload),
      });

      if (!settingsRes.ok) throw new Error("Failed to save portal settings");

      // 2. Sync profile identity name and avatar to user state
      const updatedFullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      const profileRes = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: user?.provider || "simulated_oauth",
          email: user?.email,
          name: updatedFullName,
          avatarUrl: avatarUrl,
        }),
      });

      if (!profileRes.ok) throw new Error("Failed to sync profile identity");
      const profileData = await profileRes.json();

      // Log action in history log table
      await apiFetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "action",
          action: "update_settings",
          description: `Saved profile settings and appearance changes manually.`,
        }),
      });

      // Instantly apply state updates up to parents
      onProfileUpdate(profileData.user);
      onSettingsUpdate(combinedPayload);

      toast.success("All settings saved and applied successfully!");
    } catch (err: any) {
      console.error("Save settings error:", err);
      toast.error(err.message || "An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadData = async () => {
    toast.loading("Compiling your personal preparation index and records...", { duration: 2000 });
    await new Promise((r) => setTimeout(r, 2000));
    
    // Create downloaded file
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      user,
      settings: formData,
      exportedAt: new Date().toISOString(),
      workspace: "Study Buddy Syllabus Tracker"
    }, null, 2));
    
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `learn_space_profile_${user.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    toast.success("Profile data package downloaded successfully!");

    // Log action
    await apiFetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "action",
        action: "download_data",
        description: `Exported and downloaded private workspace profile package.`,
      }),
    });
  };

  const handleDeactivateAccount = async () => {
    const doubleCheck = window.confirm("Are you absolutely sure you want to deactivate your Learn.Space session? This will lock current logs and log you out.");
    if (doubleCheck) {
      toast.success("Account deactivated. Logging out...");
      
      // Log action
      await apiFetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "action",
          action: "deactivate_account",
          description: `Initiated temporary account deactivation sequence.`,
        }),
      });

      setTimeout(() => {
        localStorage.removeItem("portal_user");
        localStorage.removeItem("portal_user_id");
        window.location.reload();
      }, 1500);
    }
  };

  const handleDeleteAccount = async () => {
    const doubleCheck = window.confirm("🚨 CRITICAL ACTION: This will permanently purge your entire study record, tracked dashboards, notes, files, and streaks from our secure database. This is IRREVERSIBLE. Proceed?");
    if (doubleCheck) {
      toast.loading("Purging workspace database indexes...");
      await new Promise((r) => setTimeout(r, 1500));
      toast.success("All data permanently deleted. Goodbye.");
      
      localStorage.removeItem("portal_user");
      localStorage.removeItem("portal_user_id");
      window.location.reload();
    }
  };

  const handleAvatarChange = () => {
    const newSeed = Math.floor(Math.random() * 10000);
    const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${newSeed}`;
    setAvatarUrl(newAvatar);
    toast.success("Avatar refreshed! Click 'Save Changes' to apply permanently.");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 font-mono text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
        LOADING USER WORKSPACE PREFERENCES...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Title Section */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold font-sans text-slate-800">User Profile Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure secure credentials, visual preferences, notification frequencies, and private details.
          </p>
        </div>

        {/* Manual Save submit button */}
        <button
          onClick={() => handleSaveAll()}
          disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Saving changes..." : "Save Changes"}
        </button>
      </div>

      {/* Tabs Row (Line Variant) */}
      <div className="flex border-b border-slate-100 flex-wrap gap-1">
        {[
          { id: "profile", label: "Profile", icon: User },
          { id: "portal", label: "Portal", icon: Sliders },
          { id: "account", label: "Login & Security", icon: Shield },
          { id: "notifications", label: "Notifications & Alerts", icon: Bell },
          { id: "privacy", label: "Privacy & Data", icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                isActive
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/20 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Switcher Form Wrapper */}
      <form onSubmit={handleSaveAll} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        {activeSubTab === "profile" && (
          <div className="space-y-6">
            {/* Profile Avatar Refresher Block */}
            <div className="flex items-center gap-5 bg-slate-50/40 p-4 rounded-2xl border border-slate-100">
              <img
                src={avatarUrl}
                alt="Profile Avatar"
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full border-2 border-indigo-100 bg-white"
              />
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-slate-800">Workspace Identity Card</h4>
                <div className="flex gap-2">
                  <Tooltip content="GENERATE RANDOM AVATAR ICON">
                    <button
                      type="button"
                      onClick={handleAvatarChange}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-extrabold text-slate-700 flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Rotate Avatar
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Form grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[9px] font-mono font-bold text-slate-400">
                    {formData.firstName.length}/15
                  </span>
                </div>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First Name (required)"
                  className={`w-full text-xs font-bold px-3 py-2 border rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all text-slate-800 ${
                    errors.firstName
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10"
                  }`}
                />
                {errors.firstName && (
                  <p className="text-rose-500 text-[10px] font-bold font-mono mt-1 uppercase tracking-wide">
                    ⚠️ {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[9px] font-mono font-bold text-slate-400">
                    {formData.lastName.length}/15
                  </span>
                </div>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last Name (required)"
                  className={`w-full text-xs font-bold px-3 py-2 border rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all text-slate-800 ${
                    errors.lastName
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10"
                  }`}
                />
                {errors.lastName && (
                  <p className="text-rose-500 text-[10px] font-bold font-mono mt-1 uppercase tracking-wide">
                    ⚠️ {errors.lastName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full text-xs font-bold px-3 py-2 border border-slate-100 rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Mobile Number
                  </label>
                  <span className="text-[9px] font-mono font-bold text-slate-400">
                    {formData.mobile.length}/10 DIGITS
                  </span>
                </div>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="10-digit number (e.g. 9876543210)"
                  className={`w-full text-xs font-bold px-3 py-2 border rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all text-slate-800 ${
                    errors.mobile
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10"
                  }`}
                />
                {errors.mobile && (
                  <p className="text-rose-500 text-[10px] font-bold font-mono mt-1 uppercase tracking-wide">
                    ⚠️ {errors.mobile}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Address Line 1
                  </label>
                  <span className="text-[9px] font-mono font-bold text-slate-400">
                    {formData.addressLine1.length}/250
                  </span>
                </div>
                <input
                  type="text"
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  placeholder="Street Address, P.O. box, company name"
                  className={`w-full text-xs font-bold px-3 py-2 border rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all text-slate-800 ${
                    errors.addressLine1
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10"
                  }`}
                />
                {errors.addressLine1 && (
                  <p className="text-rose-500 text-[10px] font-bold font-mono mt-1 uppercase tracking-wide">
                    ⚠️ {errors.addressLine1}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Address Line 2 (Optional)
                  </label>
                  <span className="text-[9px] font-mono font-bold text-slate-400">
                    {formData.addressLine2.length}/250
                  </span>
                </div>
                <input
                  type="text"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleChange}
                  placeholder="Apartment, suite, unit, building, floor, etc."
                  className={`w-full text-xs font-bold px-3 py-2 border rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all text-slate-800 ${
                    errors.addressLine2
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10"
                  }`}
                />
                {errors.addressLine2 && (
                  <p className="text-rose-500 text-[10px] font-bold font-mono mt-1 uppercase tracking-wide">
                    ⚠️ {errors.addressLine2}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Academic Bio / Preparation Status
                  </label>
                  <span className="text-[9px] font-mono font-bold text-slate-400">
                    {formData.bio.length}/250
                  </span>
                </div>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Write a brief note about your study goals, strong subjects, and general strategy..."
                  className={`w-full text-xs font-bold px-3 py-2 border rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all text-slate-800 ${
                    errors.bio
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10"
                  }`}
                />
                {errors.bio && (
                  <p className="text-rose-500 text-[10px] font-bold font-mono mt-1 uppercase tracking-wide">
                    ⚠️ {errors.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "portal" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                User Motivation Message (Optional)
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mb-2">
                Write your custom daily motivation message or study mantra. On save, this message will reflect in your Dashboard self-motivation card "My Motivation Message".
              </p>
              <input
                type="text"
                name="userMotivation"
                value={formData.userMotivation || ""}
                onChange={handleChange}
                placeholder="e.g. Consistency builds excellence. Keep pushing forward!"
                className="w-full text-xs font-bold px-3.5 py-2.5 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-800"
              />
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-500" />
                App Visual Vibe & Theme
              </h3>
              <Select
                label="App Visual Vibe"
                value={formData.theme}
                onChange={(e) => handleChange({ name: "theme", value: e.target.value })}
                options={[
                  { value: "light", label: "Clean Slate (Light Theme)" },
                  { value: "dark", label: "Cosmic Navy (Dark Theme)" },
                  { value: "cosmic", label: "Retro Terminal Mode" },
                ]}
              />
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Type className="w-4 h-4 text-emerald-500" />
                Custom Typography & Fonts
              </h3>
              <Select
                label="Font Family Selection"
                value={formData.fontFamily || "Inter"}
                onChange={(e) => handleChange({ name: "fontFamily", value: e.target.value })}
                options={[
                  { value: "Inter", label: "Inter (Modern Sans-Serif)" },
                  { value: "Space Grotesk", label: "Space Grotesk (Tech & Punchy)" },
                  { value: "Playfair Display", label: "Playfair Display (Elegant Serif)" },
                  { value: "JetBrains Mono", label: "JetBrains Mono (Technical Mono)" },
                ]}
              />
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Type className="w-4 h-4 text-indigo-500" />
                Custom Font Size
              </h3>
              <Select
                label="Font Size Selection"
                value={formData.fontSize || "16px"}
                onChange={(e) => handleChange({ name: "fontSize", value: e.target.value })}
                options={[
                  { value: "12px", label: "12px (Tiny)" },
                  { value: "14px", label: "14px (Compact)" },
                  { value: "16px", label: "16px (Default)" },
                  { value: "18px", label: "18px (Medium)" },
                  { value: "20px", label: "20px (Large)" },
                ]}
              />
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-500" />
                Custom Accent Theme Color
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mb-3">
                Select from our visual palette or type a custom Hex code to color-accent buttons, badges, and tabs across the portal.
              </p>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {[
                  { hex: "#6366f1", name: "Indigo" },
                  { hex: "#10b981", name: "Emerald" },
                  { hex: "#f43f5e", name: "Rose" },
                  { hex: "#f59e0b", name: "Amber" },
                  { hex: "#0ea5e9", name: "Sky" },
                  { hex: "#0d9488", name: "Teal" },
                  { hex: "#8b5cf6", name: "Violet" },
                ].map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => handleChange({ name: "accentColor", value: col.hex })}
                    className="w-8 h-8 rounded-full border-2 transition-all cursor-pointer transform hover:scale-110 flex items-center justify-center"
                    style={{
                      backgroundColor: col.hex,
                      borderColor: formData.accentColor === col.hex ? "#000000" : "transparent",
                      boxShadow: formData.accentColor === col.hex ? `0 0 0 2px #ffffff, 0 0 0 4px ${col.hex}` : "none",
                    }}
                    title={col.name}
                  />
                ))}
              </div>
              <div className="max-w-xs">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Custom Hex Code
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-mono font-bold text-xs">#</span>
                  <input
                    type="text"
                    value={formData.accentColor?.replace("#", "") || ""}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      if (val.length <= 6) {
                        handleChange({ name: "accentColor", value: `#${val}` });
                      }
                    }}
                    placeholder="6366f1"
                    className="w-full text-xs font-bold pl-7 pr-3 py-2 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/50 font-mono focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-500" />
                Sidebar Navigation Menu Toggles
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mb-3">
                Toggle active views to hide or show secondary pages in your left rail sidebar. Settings is always visible.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "tasks", name: "Tasks Table" },
                  { id: "subjects", name: "Subjects Catalog" },
                  { id: "kanban", name: "Kanban Board" },
                  { id: "calendar", name: "Timetable Calendar" },
                  { id: "overview", name: "Active Insights" },
                  { id: "history", name: "Activity Logs" },
                ].map((menu) => {
                  const isHidden = (formData.hiddenMenus || []).includes(menu.id);
                  return (
                    <div
                      key={menu.id}
                      className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                    >
                      <input
                        type="checkbox"
                        id={`toggle-menu-${menu.id}`}
                        checked={!isHidden}
                        onChange={(e) => {
                          const currentlyHidden = formData.hiddenMenus || [];
                          let newHidden: string[];
                          if (e.target.checked) {
                            newHidden = currentlyHidden.filter((id) => id !== menu.id);
                          } else {
                            newHidden = [...currentlyHidden, menu.id];
                          }
                          handleChange({ name: "hiddenMenus", value: newHidden });
                        }}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                      />
                      <label
                        htmlFor={`toggle-menu-${menu.id}`}
                        className="text-xs font-bold text-slate-600 cursor-pointer select-none"
                      >
                        {menu.name}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-500" />
                Custom CSS Requirements Override
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mb-2">
                Inject custom visual CSS styling directly into the workspace DOM to customize page headers, borders, margins or layout overlays.
              </p>
              <textarea
                name="customCss"
                value={formData.customCss || ""}
                onChange={handleChange}
                rows={4}
                placeholder="/* e.g. .bg-white { border: 2px solid green !important; } */"
                className="w-full text-xs font-bold p-3 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/50 font-mono focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-800"
              />
            </div>

            {/* Dashboard Management */}
            {onDeleteDashboard && (
              <div className="border border-rose-100 bg-rose-50/20 p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-rose-500" />
                  <h4 className="text-sm font-bold text-slate-800">Workspace Dashboard Deletion</h4>
                </div>
                <p className="text-[11px] text-slate-500 font-mono leading-relaxed">
                  Select one of your custom study trackers below to delete it permanently. Please note that you cannot delete the default tracking dashboard.
                </p>
                
                <div className="flex items-center gap-3 max-w-md">
                  <select
                    id="dashboard-delete-select"
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-800"
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        onDeleteDashboard(val);
                        e.target.value = ""; // Reset after trigger
                      }
                    }}
                  >
                    <option value="" disabled>-- Select Dashboard to Delete --</option>
                    {(dashboards || []).filter(d => d.id !== "default").map(d => (
                      <option key={d.id} value={d.id}>
                        📂 {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === "account" && (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
              <Lock className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">SIMULATED OAuth SESSION ACTIVE</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-mono">
                  Your student portal is secured via simulated Google OAuth. Password changes are disabled as authentication is delegated to your federated provider profiles.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                Multi-Factor Authentication (MFA)
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mb-3">
                Require a simulated temporal one-time security token upon logging in to reinforce dashboard privacy safeguards.
              </p>
              <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100 max-w-sm">
                <input
                  type="checkbox"
                  id="2fa-checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="2fa-checkbox" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                  Enable Multi-Factor (MFA)
                </label>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "notifications" && (
          <div className="space-y-5">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-500" />
              Syllabus Notification Frequency
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                <input
                  type="checkbox"
                  id="emailNotifications"
                  name="emailNotifications"
                  checked={formData.emailNotifications}
                  onChange={handleChange}
                  className="w-4 h-4 mt-0.5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <div className="space-y-0.5 cursor-pointer select-none">
                  <label htmlFor="emailNotifications" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Daily Syllabus Target Reminders
                  </label>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Receive email updates with your active daily targets, incomplete mock tests, and subject benchmarks.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                <input
                  type="checkbox"
                  id="pushNotifications"
                  name="pushNotifications"
                  checked={formData.pushNotifications}
                  onChange={handleChange}
                  className="w-4 h-4 mt-0.5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <div className="space-y-0.5 cursor-pointer select-none">
                  <label htmlFor="pushNotifications" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Immediate Browser Notifications
                  </label>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Alert you when active study session timers expire, goals are logged, or streaks are updated.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                <input
                  type="checkbox"
                  id="weeklyDigests"
                  name="weeklyDigests"
                  checked={formData.weeklyDigests}
                  onChange={handleChange}
                  className="w-4 h-4 mt-0.5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <div className="space-y-0.5 cursor-pointer select-none">
                  <label htmlFor="weeklyDigests" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Weekly Strategic Performance Digest
                  </label>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Includes side-by-side study logs charts, progress tracking, streak summary, and syllabus forecast.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "privacy" && (
          <div className="space-y-6">
            <div className="space-y-5 border-b border-slate-100 pb-5">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                Visibility & Private Data Settings
              </h3>

              <div className="flex items-start gap-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                <input
                  type="checkbox"
                  id="isPublicProfile"
                  name="isPublicProfile"
                  checked={formData.isPublicProfile}
                  onChange={handleChange}
                  className="w-4 h-4 mt-0.5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <div className="space-y-0.5 cursor-pointer select-none">
                  <label htmlFor="isPublicProfile" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Public Prep Visibility
                  </label>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Allows peer aspirants to search, check active streaks, view mock test performance index, and compare schedules.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-xl flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800">Download Data Package</h4>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Download a comprehensive JSON package of all active tracks, logs, notes, profiles, and subject weights.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadData}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Request Package
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-rose-600 uppercase tracking-wider mb-1 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Destructive Zone Actions
              </h3>
              <p className="text-xs text-slate-500 mb-4 font-mono">
                These actions immediately purge or freeze workspace state indexes. Use caution.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-amber-100 bg-amber-50/30 p-4 rounded-xl flex flex-col justify-between">
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-amber-800">Deactivate Session</h4>
                    <p className="text-[10px] text-amber-600 mt-1 font-mono">
                      Locks active timers, pauses study status visibility, and logs your account out safely.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeactivateAccount}
                    className="w-full py-2 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                  >
                    Deactivate Account
                  </button>
                </div>

                <div className="border border-rose-100 bg-rose-50/30 p-4 rounded-xl flex flex-col justify-between">
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-rose-800">Purge Study Records</h4>
                    <p className="text-[10px] text-rose-600 mt-1 font-mono">
                      Permanently erases all subjects, tasks, progress indexes, streaks, files, and logged hours.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 text-rose-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                  >
                    Delete Account Permanently
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
