import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// Scrape basic Zillow property info from the address page
// No API needed — just fetch the page and extract meta tags
export async function GET(req: NextRequest) {
  const member = await getSession();
  if (!member) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const address = req.nextUrl.searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  try {
    const slug = address.replace(/[,#]/g, '').replace(/\s+/g, '-');
    const url = `https://www.zillow.com/homes/${encodeURIComponent(slug)}_rb/`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Zillow fetch failed' }, { status: 404 });
    }

    const html = await res.text();

    // Extract from meta tags and LD+JSON
    const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/)?.[1] || '';
    const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/)?.[1] || '';
    const ogDescription = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/)?.[1] || '';

    // Try to extract price from LD+JSON or page content
    let price = '';
    let bedrooms = '';
    let bathrooms = '';
    let sqft = '';
    let zestimate = '';

    // Try LD+JSON
    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1]);
        if (ld['@type'] === 'SingleFamilyResidence' || ld['@type'] === 'RealEstateListing' || ld.floorSize) {
          sqft = ld.floorSize?.value || '';
        }
      } catch { /* ignore */ }
    }

    // Extract from og:description which usually has "beds · baths · sqft" format
    if (ogDescription) {
      const bedsMatch = ogDescription.match(/(\d+)\s*bed/i);
      const bathsMatch = ogDescription.match(/([\d.]+)\s*bath/i);
      const sqftMatch = ogDescription.match(/([\d,]+)\s*sq\s*ft/i);
      const priceMatch = ogDescription.match(/\$([\d,]+)/);
      if (bedsMatch) bedrooms = bedsMatch[1];
      if (bathsMatch) bathrooms = bathsMatch[1];
      if (sqftMatch) sqft = sqftMatch[1];
      if (priceMatch) price = '$' + priceMatch[1];
    }

    // Also try to find Zestimate
    const zestimateMatch = html.match(/Zestimate[^$]*\$([\d,]+)/i);
    if (zestimateMatch) zestimate = '$' + zestimateMatch[1];

    // If no price from description, try other patterns
    if (!price) {
      const priceMatch2 = html.match(/"price":\s*"?([\d,]+)"?/);
      if (priceMatch2) price = '$' + priceMatch2[1];
    }

    return NextResponse.json({
      url,
      image: ogImage,
      title: ogTitle,
      description: ogDescription,
      price: price || zestimate || '',
      zestimate,
      bedrooms,
      bathrooms,
      sqft,
    });
  } catch (e) {
    console.error('Zillow scrape error:', e);
    return NextResponse.json({ error: 'Failed to fetch property info' }, { status: 500 });
  }
}
