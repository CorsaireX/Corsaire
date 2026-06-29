import { NextResponse } from 'next/server';
import { getSession } from '@corsaire/auth/session';
import { supabaseAdmin } from '@/lib/supabase';

const GITHUB_API = 'https://api.github.com/repos';

const UPSTREAM_REPOS = [
  { id: 'youtube_ios', owner: 'YTLitePlus', repo: 'YTLitePlus', platform: 'ios', displayName: 'YTLitePlus (iOS)' },
  { id: 'youtube_android', owner: 'ReVanced', repo: 'revanced-patches', platform: 'android', displayName: 'ReVanced Patches (Android)' }
];

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify Founder Role
    const { data: user } = await supabaseAdmin
      .from('Users')
      .select('Role')
      .eq('ID', session.userId)
      .single();

    if (!user || user.Role !== 'Founder') {
      return NextResponse.json({ error: 'Forbidden. Founder access required.' }, { status: 403 });
    }

    const results = await Promise.all(UPSTREAM_REPOS.map(async (repoInfo) => {
      // 1. Fetch from GitHub
      let upstreamVersion = 'Unknown';
      let upstreamUrl = '';
      let publishedAt = '';
      let fetchError = null;

      try {
        const res = await fetch(`${GITHUB_API}/${repoInfo.owner}/${repoInfo.repo}/releases/latest`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            // 'Authorization': `token ${process.env.GITHUB_TOKEN}` // Optional, to increase rate limit
          },
          next: { revalidate: 3600 } // Cache for 1 hour to prevent rate limiting
        });

        if (res.ok) {
          const data = await res.json();
          upstreamVersion = data.tag_name || data.name;
          upstreamUrl = data.html_url;
          publishedAt = data.published_at;
        } else {
          fetchError = `GitHub API Error: ${res.status}`;
        }
      } catch {
        fetchError = 'Failed to fetch from GitHub';
      }

      // 2. Fetch latest active version from Corsaire DB
      const { data: localVer } = await supabaseAdmin
        .from('AppVersions')
        .select('Version, ReleasedAt')
        .eq('AppName', repoInfo.id)
        .eq('IsActive', true)
        .order('ReleasedAt', { ascending: false })
        .limit(1)
        .single();

      const localVersion = localVer ? localVer.Version : 'None';
      
      // Clean 'v' prefix for comparison if present
      const cleanUpstream = upstreamVersion.replace(/^v/, '');
      const cleanLocal = localVersion.replace(/^v/, '');
      
      const needsPatching = cleanLocal !== 'None' && cleanUpstream !== 'Unknown' && cleanUpstream !== cleanLocal;

      return {
        ...repoInfo,
        upstreamVersion,
        upstreamUrl,
        publishedAt,
        localVersion,
        needsPatching,
        error: fetchError
      };
    }));

    return NextResponse.json({ success: true, data: results }, { status: 200 });

  } catch (error) {
    console.error('Upstream Radar Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'edge';
