import axios from 'axios';
import * as cheerio from 'cheerio';
import { YouTubePlaylist, Track } from '../src/types';

export async function scrapeYouTubePlaylist(url: string): Promise<YouTubePlaylist> {
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

    // Extract initial data from script tag
    const scriptContent = $('script').filter((_, el) => {
      return $(el).html()?.includes('var ytInitialData = ');
    }).html();

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

export async function extractTracksFromPlaylist(playlistId: string): Promise<Track[]> {
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
    
    // Find all video elements
    $('ytd-playlist-video-renderer').each((_, element) => {
      const title = $(element).find('#video-title').text().trim();
      const artist = $(element).find('.ytd-channel-name').text().trim();
      
      if (title && title !== '[Deleted video]' && title !== '[Private video]') {
        tracks.push({
          title,
          artist: artist || 'Unknown Artist',
          duration: 0
        });
      }
    });

    return tracks;
  } catch (error) {
    throw new Error('Failed to extract tracks from playlist');
  }
}