/**
 * Lightweight LinkedIn profile data fetcher.
 * Extracts Open Graph meta tags from public LinkedIn profiles.
 * Fails silently — never blocks lead creation.
 */

interface LinkedInData {
  title?: string;
  description?: string;
  imageUrl?: string;
  url: string;
}

export async function fetchLinkedInProfile(linkedinUrl: string): Promise<LinkedInData | null> {
  try {
    // Validate URL looks like a LinkedIn profile
    const url = new URL(linkedinUrl);
    if (!url.hostname.includes("linkedin.com")) {
      console.log(`[LinkedIn] Not a LinkedIn URL: ${linkedinUrl}`);
      return null;
    }

    const response = await fetch(linkedinUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GrowthOS/1.0)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });

    if (!response.ok) {
      console.log(`[LinkedIn] HTTP ${response.status} for ${linkedinUrl}`);
      return null;
    }

    const html = await response.text();

    // Extract Open Graph meta tags
    const title = extractMetaContent(html, "og:title");
    const description = extractMetaContent(html, "og:description");
    const imageUrl = extractMetaContent(html, "og:image");

    if (!title && !description) {
      console.log(`[LinkedIn] No OG data found for ${linkedinUrl}`);
      return null;
    }

    console.log(`[LinkedIn] Fetched profile data: ${title}`);
    return { title, description, imageUrl, url: linkedinUrl };
  } catch (err) {
    console.log(`[LinkedIn] Fetch failed for ${linkedinUrl}:`, err instanceof Error ? err.message : "Unknown error");
    return null;
  }
}

function extractMetaContent(html: string, property: string): string | undefined {
  // Match both property="og:title" and name="og:title" patterns
  const regex = new RegExp(
    `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']` +
    `|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
    "i"
  );
  const match = html.match(regex);
  return match?.[1] || match?.[2] || undefined;
}
