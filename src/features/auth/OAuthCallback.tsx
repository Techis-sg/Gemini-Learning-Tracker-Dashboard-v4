import React, { useEffect, useState } from "react";
import { IconLoader2 as Loader2, IconAlertCircle as AlertCircle } from "@tabler/icons-react";

export function OAuthCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function handleCallback() {
      try {
        // Parse Hash parameters (Google Implicit flow sends token in URL hash)
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");

        if (!accessToken) {
          throw new Error("No access token found in response.");
        }

        // Fetch user info from Google's standard UserInfo API
        const userinfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
        if (!userinfoRes.ok) {
          throw new Error("Failed to fetch user profile from Google.");
        }

        const googleUser = await userinfoRes.json();
        if (!googleUser.email) {
          throw new Error("No email found in Google profile.");
        }

        // Send user info to server to log in / register and seed Firestore database
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "google",
            email: googleUser.email,
            name: googleUser.name || googleUser.given_name || "Google User",
            avatarUrl: googleUser.picture,
          }),
        });

        if (!loginRes.ok) {
          const errData = await loginRes.json();
          throw new Error(errData.error || "Failed to create or sign in user on portal.");
        }

        const loginData = await loginRes.json();

        setStatus("success");

        // Notify parent/opener window and close popup
        if (window.opener) {
          window.opener.postMessage(
            { type: "OAUTH_AUTH_SUCCESS", user: loginData.user },
            window.location.origin
          );
          // Small delay before closing to show success state
          setTimeout(() => {
            window.close();
          }, 800);
        } else {
          // Fallback fallback if opened directly instead of popup
          localStorage.setItem("portal_user_id", loginData.user.id);
          localStorage.setItem("portal_user", JSON.stringify(loginData.user));
          window.location.href = "/";
        }
      } catch (err: any) {
        console.error("Google OAuth Callback Error:", err);
        setStatus("error");
        setErrorMessage(err.message || "An unexpected authentication error occurred.");
      }
    }

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-center items-center font-mono p-4">
      {status === "loading" && (
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
          <p className="text-sm tracking-wide text-slate-400">FINISHING SECURE GOOGLE SIGN-IN...</p>
          <p className="text-xs text-slate-600">Syncing with secure study workspace...</p>
        </div>
      )}

      {status === "success" && (
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            ✓
          </div>
          <p className="text-sm tracking-wide text-emerald-400">AUTHENTICATION SUCCESSFUL!</p>
          <p className="text-xs text-slate-500">This window will close automatically...</p>
        </div>
      )}

      {status === "error" && (
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-sm tracking-wide text-rose-400">AUTHENTICATION FAILED</p>
          <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl text-[11px] text-rose-400 leading-relaxed">
            {errorMessage}
          </div>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>
      )}
    </div>
  );
}

export default OAuthCallback;
