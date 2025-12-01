import type { APIRoute } from 'astro';
import { deletePlayer } from '../../data/playerStore.js';

export const POST: APIRoute = async ({ request }) => {
  let guid = '';
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const data = await request.json();
      guid = data?.guid || '';
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }
  } else if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData();
    const value = formData.get('guid');
    guid = typeof value === 'string' ? value : '';
  }
  if (guid) {
    await deletePlayer(guid);
    return new Response(null, {
      status: 302,
      headers: { Location: '/players' },
    });
  }
  return new Response('Player guid required', { status: 400 });
};
