import { Handler } from '@netlify/functions';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { YouTubePlaylist, Track } from '../../src/types';

async function scrapeYouTubePlaylist(url: string): Promise<YouTubePlaylist> {
  try {
    const playlistId = url.match(/list=([^&]+)/)?.[1];
    if (!playlistId) {
      throw new Error('Invalid YouTube playlist URL');
    }

    const response = await axios.get(
      `https://www.youtube.com/playlist?list=${playlistId}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    );

    const $ = cheerio.load(response.data);
    const title = $('meta[property="og:title"]').attr('content') || 'Unknown Playlist';
    const description = $('meta[property="og:description"]').attr('content') || '';
    const thumbnailUrl = $('meta[property="og:image"]').attr('content') || '';
    const tracks = await extractTracksFromPlaylist(playlistId);

    return {
      id: playlistId,
      title,
      description,
      thumbnailUrl,
      trackCount: tracks.length
    };
  } catch (error) {
    throw new Error('Failed to fetch playlist information');
  }
}

async function extractTracksFromPlaylist(playlistId: string): Promise<Track[]> {
  const tracks: Track[] = [];
  
  try {
    const response = await axios.get(
      `https://www.youtube.com/playlist?list=${playlistId}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    );

    const $ = cheerio.load(response.data);
    
    // Extract data from script tag
    const scripts = $('script').filter((_, el) => $(el).html()?.includes('var ytInitialData = '));
    const scriptContent = scripts.first().html() || '';
    
    const match = scriptContent.match(/var ytInitialData = (.+?);<\/script>/);
    if (match) {
      const data = JSON.parse(match[1]);
      const items = data?.contents?.twoColumnBrowseResultsRenderer
        ?.tabs[0]?.tabRenderer?.content?.sectionListRenderer
        ?.contents[0]?.itemSectionRenderer?.contents[0]
        ?.playlistVideoListRenderer?.contents || [];

      items.forEach((item: any) => {
        const videoData = item.playlistVideoRenderer;
        if (videoData && videoData.title.runs) {
          const title = videoData.title.runs[0].text;
          const artist = videoData.shortBylineText?.runs[0]?.text || 'Unknown Artist';
          
          if (title && !title.includes('[Deleted video]') && !title.includes('[Private video]')) {
            tracks.push({
              title,
              artist,
              duration: 0
            });
          }
        }
      });
    }

    return tracks;
  } catch (error) {
    console.error('Track extraction error:', error);
    throw new Error('Failed to extract tracks from playlist');
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { url } = JSON.parse(event.body || '{}');
    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    const playlist = await scrapeYouTubePlaylist(url);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(playlist)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch playlist' })
    };
  }
};