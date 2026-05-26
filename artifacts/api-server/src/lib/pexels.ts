const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

interface PexelsPhoto {
  src: {
    medium: string;
    large: string;
  };
}

interface PexelsResponse {
  photos: PexelsPhoto[];
}

export async function fetchPexelsImage(query: string): Promise<string | null> {
  if (!PEXELS_API_KEY) return null;
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=square`;
    const resp = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as PexelsResponse;
    return data.photos?.[0]?.src?.medium ?? null;
  } catch {
    return null;
  }
}
