import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { Track, ConversionResult } from '../src/types';
import { scrapeYouTubePlaylist, extractTracksFromPlaylist } from './youtube-scraper';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(cors());
app.use(express.json());
app.use(limiter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// YouTube playlist info endpoint
app.post('/api/youtube/playlist', async (req, res) => {
  try {
    const { url } = req.body;
    const playlistData = await scrapeYouTubePlaylist(url);
    res.json(playlistData);
  } catch (error) {
    console.error('YouTube scraping error:', error);
    res.status(500).json({ error: 'Failed to fetch YouTube playlist' });
  }
});

// Spotify auth endpoint
app.get('/api/spotify/auth', (req, res) => {
  const scopes = ['playlist-modify-public', 'playlist-modify-private'];
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${
    process.env.SPOTIFY_CLIENT_ID
  }&response_type=token&redirect_uri=${
    encodeURIComponent(redirectUri!)
  }&scope=${encodeURIComponent(scopes.join(' '))}`;
  
  res.json({ authUrl });
});

// Conversion endpoint
app.post('/api/convert', async (req, res) => {
  try {
    const { playlistId } = req.body;
    const spotifyToken = req.headers.authorization?.split(' ')[1];

    if (!spotifyToken) {
      return res.status(401).json({ error: 'Spotify token required' });
    }

    // Fetch YouTube playlist tracks
    const tracks = await extractTracksFromPlaylist(playlistId);
    
    // Create Spotify playlist and add tracks
    const result = await createSpotifyPlaylist(tracks, spotifyToken);
    
    res.json(result);
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: 'Failed to convert playlist' });
  }
});

async function createSpotifyPlaylist(
  tracks: Track[],
  token: string
): Promise<ConversionResult> {
  try {
    const spotify = SpotifyApi.withAccessToken(process.env.SPOTIFY_CLIENT_ID!, token);
    
    // Get user profile
    const me = await spotify.currentUser.profile();
    
    // Create new playlist
    const playlist = await spotify.playlists.createPlaylist(me.id, {
      name: 'Imported YouTube Playlist',
      description: 'Converted from YouTube using PlaylistPort',
      public: false
    });

    // Search and add tracks
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

    // Add tracks in batches of 100 (Spotify API limit)
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});