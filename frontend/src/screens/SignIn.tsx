import { useState, type FormEvent } from "react";
import { client } from "../api/client";

export interface SignInProps {
  onSignedIn?: (token: string) => void;
}

export function SignIn({ onSignedIn }: SignInProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: apiError } = await client.POST("/auth/login", {
      body: { email, password },
    });

    setLoading(false);

    if (apiError || !data) {
      setError("Invalid email or password.");
      return;
    }

    onSignedIn?.(data.token);
  }

  return (
    <div className="signin-screen">
      <h1>Sign in</h1>
      <form onSubmit={handleSubmit} data-testid="signin-form">
        <label htmlFor="signin-email">Email</label>
        <input
          id="signin-email"
          data-testid="signin-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="signin-password">Password</label>
        <input
          id="signin-password"
          data-testid="signin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error && (
          <p role="alert" data-testid="signin-error">
            {error}
          </p>
        )}

        <button type="submit" data-testid="signin-submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
