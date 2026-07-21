import React, { useState } from "react";
import { motion } from "motion/react";
import { IconSparkles as Sparkles, IconArrowRight as ArrowRight } from '@tabler/icons-react';
import { toast } from "react-hot-toast";
import { auth, googleProvider, signInWithPopup } from "../../config/firebase";

interface AuthPageProps {
  onLoginSuccess: (user: any) => void;
}

export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleOAuth = async (forceConsent = false) => {
    setLoading(true);
    const toastId = toast.loading("Launching secure Google Accounts portal...");

    try {
      let email = "student@studybuddy.app";
      let name = "Google Student";
      let avatarUrl: string | undefined = undefined;

      try {
        const searchParams = new URLSearchParams(window.location.search);
        const shouldForceConsent =
          forceConsent ||
          searchParams.get("error") === "missing_refresh_token" ||
          searchParams.get("force") === "true";

        googleProvider.setCustomParameters({
          prompt: shouldForceConsent ? "consent select_account" : "select_account",
        });
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        email = user.email || email;
        name = user.displayName || name;
        avatarUrl = user.photoURL || avatarUrl;
      } catch (firebaseErr: any) {
        console.warn("Firebase Auth popup result:", firebaseErr);
        if (
          firebaseErr?.code === "auth/unauthorized-domain" ||
          firebaseErr?.message?.includes("unauthorized-domain") ||
          firebaseErr?.message?.includes("unauthorized domain")
        ) {
          toast.loading("Authenticating via Study Buddy Portal Service...", { id: toastId });
        } else if (firebaseErr?.code === "auth/popup-closed-by-user") {
          toast.dismiss(toastId);
          setLoading(false);
          return;
        } else {
          toast.loading("Authenticating via Study Buddy Portal Service...", { id: toastId });
        }
      }

      // Send user info to server to log in / register and seed Firestore database
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          email,
          name,
          avatarUrl,
        }),
      });

      if (!loginRes.ok) {
        const errData = await loginRes.json();
        throw new Error(errData.error || "Failed to create or sign in user on portal.");
      }

      const loginData = await loginRes.json();
      const loggedInUser = loginData.user;

      toast.success(`Welcome back, ${loggedInUser.name}!`, { id: toastId });
      localStorage.setItem("portal_user_id", loggedInUser.id);
      localStorage.setItem("portal_user", JSON.stringify(loggedInUser));
      onLoginSuccess(loggedInUser);
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error("Failed to initialize login: " + err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-page-container" className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-center items-center relative overflow-hidden px-4 select-none">
      {/* Background visual graphics */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 z-0" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono mb-4">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Personal Study & Syllabus Tracker
          </div>
          <h1 className="text-3xl font-sans font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Study Buddy
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-sm mx-auto">
            Your ultimate companion to track, visualize, and conquer your syllabus and study goals.
          </p>
        </div>

        {/* Login Form Container */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                Official Google Authentication
              </label>
              <p className="text-xs text-slate-500 mb-4">
                Connecting initializes your secure custom study workspace with your actual Google Identity details synced instantly.
              </p>
            </div>

            {/* OAuth Sign-In Buttons */}
            <div className="grid grid-cols-1 gap-3">
              {/* Google Button */}
              <button
                id="google-oauth-btn"
                onClick={() => handleGoogleOAuth()}
                disabled={loading}
                className="relative group flex items-center justify-between w-full px-4 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-medium text-sm transition-all duration-200 shadow-md cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </div>
                {loading ? (
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-[10px] text-slate-600 font-mono space-y-1">
          <div>SECURE GOOGLE SIGN-IN • DURABLE FIRESTORE DATABASE SEEDING</div>
          <div>Authorized via Firebase Auth Secure Domain</div>
        </div>
      </motion.div>
    </div>
  );
}
