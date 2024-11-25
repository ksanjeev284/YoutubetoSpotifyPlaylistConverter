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

async function createSpotifyPlaylist(tracks: Track[], token: string) {
  try {
    const spotify = SpotifyApi.withAccessToken(process.env.SPOTIFY_CLIENT_ID!, token);
    
    const me = await spotify.currentUser.profile();
    const playlist = await spotify.playlists.createPlaylist(me.id, {
      name: 'Imported YouTube Playlist',
      description: 'Converted from YouTube using PlaylistPort',
      public: false
    });

    const trackUris: string[] = [];
    for (const track of tracks) {
      const searchResult = await spotify.search.search(
        `${track.title} ${track.artist}`,
        ['track'],
        undefined,
        1
      );
      
      if (searchResult.tracks.items.length > 0) {
        trackUris.push(searchResult.tracks.items[0].uri);
      }
    }

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
      error: 'Failed to create Spotify playlist'
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

    const tracks = await extractTracksFromPlaylist(playlistId);
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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to convert playlist' })
    };
  }
};