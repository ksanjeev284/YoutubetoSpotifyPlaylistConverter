import { Handler } from '@netlify/functions';

export const handler: Handler = async () => {
  const scopes = ['playlist-modify-public', 'playlist-modify-private'];
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${
    process.env.SPOTIFY_CLIENT_ID
  }&response_type=token&redirect_uri=${
    encodeURIComponent(redirectUri!)
  }&scope=${encodeURIComponent(scopes.join(' '))}`;
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ authUrl })
  };
};