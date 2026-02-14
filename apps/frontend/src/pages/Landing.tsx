import { Link } from "react-router-dom";
import { config } from "../lib/config";

const TAGLINES: Record<string, string> = {
  "saas-booker": "AI-powered meeting booking automation",
  "saas-leadqualifier": "AI-powered lead qualification automation",
  "saas-followup": "AI-powered follow-up automation",
};

export function Landing() {
  const tagline = TAGLINES[config.slug] || "AI-powered business automation";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          {config.productName}
        </h1>
        <p className="text-lg text-gray-500 mb-8">{tagline}</p>

        <div className="flex gap-4 justify-center">
          <Link
            to="/signup"
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="px-6 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
