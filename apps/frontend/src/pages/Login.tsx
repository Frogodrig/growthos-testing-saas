import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";
import { productCopy } from "../lib/product";

export function Login() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api<{ token: string; user: { id: string; email: string; name: string; role: string; tenantId: string }; tenant: { id: string; name: string; domain: string; plan: string; subscriptionStatus: string; saasProduct: string | null } }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email }) }
      );
      login(data.token, data.user, data.tenant);
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">
          {productCopy.loginHeading}
        </h1>
        <p className="text-center text-gray-500 mb-8">Log in to your account</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
