import { Handler } from '@netlify/functions';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Track } from '../../src/types';

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

async function createSpotifyPlaylist(tracks: Track[], token: string) {
  try {
    const spotify = SpotifyApi.withAccessToken(process.env.SPOTIFY_CLIENT_ID!, token);
    
    const me = await spotify.currentUser.profile();
    console.log('Creating playlist for user:', me.id);
    
    const playlist = await spotify.playlists.createPlaylist(me.id, {
      name: 'Imported YouTube Playlist',
      description: 'Converted from YouTube using PlaylistPort',
      public: false
    });

    console.log('Created playlist:', playlist.id);
    const trackUris: string[] = [];
    
    for (const track of tracks) {
      console.log('Searching for track:', track.title, track.artist);
      const searchResult = await spotify.search.search(
        `${track.title} ${track.artist}`,
        ['track'],
        undefined,
        1
      );
      
      if (searchResult.tracks.items.length > 0) {
        trackUris.push(searchResult.tracks.items[0].uri);
        console.log('Found track:', searchResult.tracks.items[0].name);
      } else {
        console.log('No match found for:', track.title);
      }
    }

    console.log('Adding', trackUris.length, 'tracks to playlist');
    for (let i = 0; i < trackUris.length; i += 100) {
      const batch = trackUris.slice(i, i + 100);
      await spotify.playlists.addItems(playlist.id, batch);
    }

    return {
      success: true,
      spotifyPlaylistUrl: playlist.external_urls.spotify
    };
  } catch (error) {
    console.error('Spotify API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Spotify playlist'
    };
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
    const { playlistId } = JSON.parse(event.body || '{}');
    const authHeader = event.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Spotify token required' })
      };
    }

    console.log('Extracting tracks from playlist:', playlistId);
    const tracks = await extractTracksFromPlaylist(playlistId);
    console.log('Found tracks:', tracks.length);

    if (tracks.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No tracks found in playlist' })
      };
    }

    const result = await createSpotifyPlaylist(tracks, token);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Conversion error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to convert playlist' 
      })
    };
  }
};