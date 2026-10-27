import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const PRIVATE = ['/admin', '/client', '/auth', '/account', '/checkout'];

/**
 * The AI answer engines are named explicitly rather than left to the `*` rule. They are already
 * allowed by the wildcard, but several of them (OpenAI's and Anthropic's in particular) document
 * that an explicit group for their own user-agent is what they honour, and being named makes the
 * intent obvious to anyone auditing the file later. The private areas stay closed to all of them.
 */
const AI_AGENTS = [
  'GPTBot', // OpenAI — training/ChatGPT browsing
  'OAI-SearchBot', // OpenAI — ChatGPT search results
  'ChatGPT-User', // OpenAI — fetches a page a user asked about
  'ClaudeBot', // Anthropic
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended', // Gemini / AI Overviews grounding
  'Applebot-Extended',
  'CCBot', // Common Crawl, which feeds many models
  'meta-externalagent',
  'Bingbot',
  'DuckDuckBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: '/', disallow: PRIVATE })),
    ],
    sitemap: 'https://dc.broadheader.com/sitemap.xml',
    host: 'https://dc.broadheader.com',
  };
}
