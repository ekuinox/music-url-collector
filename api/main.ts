import { z } from 'zod';
import createFetch from '@vercel/fetch';
import type { VercelRequest, VercelResponse } from '@vercel/node';
const fetch = createFetch();

const requestSchema = z.object({
  content: z.string(),
  services: z.record(
    z.literal('spotify'),
    z.object({
      targetUrl: z.string(),
      playlistName: z.string(),
    }),
  ),
});

const isNotNull = <T>(v: T | null): v is T => v != null;

const safeParseJson = (json: string) => {
  try {
    return JSON.parse(json);
  } catch (e: unknown) {
    return null;
  }
};

export const findUrls = (
  content: string
): Array<string> => {
  const matches = [
    ...content.matchAll(
      /(https?:\/\/[\w!?/+\-_~;.,*&@#$%()'[\]]+)/g
    )
  ];
  return matches
    .map((matched) => {
      if (matched.length < 2) {
        return null;
      }
      return matched[1];
    })
    .filter(isNotNull);
};

const resolveShortUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url, { redirect: 'follow' });
    return response.url;
  } catch (e: unknown) {
    return null;
  }
};

interface IftttTriggerActionBody {
  readonly value1?: string;
  readonly value2?: string;
  readonly value3?: string;
}

interface SpotifyTrack {
  trackId: string;
}

type ExtendServiceName<S extends string, T> = T & { service: S };

type Track = ExtendServiceName<'spotify', SpotifyTrack>;

const getSpotifyTrack = (url: string): SpotifyTrack | null => {
  const matched = url.match(/open.spotify.com\/track\/(.+)\?/);
  if (matched == null || matched.length < 2) {
    return null;
  }
  const trackId = matched[1];
  return {
    trackId,
  };
};

const getTrack = async (url: string): Promise<Track | null> => {
  const spotifyMatched = getSpotifyTrack(url);
  if (spotifyMatched != null) {
    return {
      service: 'spotify',
      ...spotifyMatched,
    };
  }
  return null;
};

const getTracks = async (content: string): Promise<Array<Track>> => {
  const urls = await Promise.all(
    findUrls(content)
      .map(resolveShortUrl)
    );
  const tracks = await Promise.all(urls.filter(isNotNull).map(getTrack));
  return tracks.filter(isNotNull);
};

const trackAsIftttRequest = (
  serices: z.TypeOf<typeof requestSchema>['services'],
  track: Track
): IftttTriggerActionBody & { url: string } => {
  switch (track.service) {
    case 'spotify':
      return {
        value1: serices['spotify'].playlistName,
        value2: track.trackId,
        url: serices['spotify'].targetUrl,
      };
  }
};

const main = async (
  { content, services }: z.TypeOf<typeof requestSchema>
): Promise<[number, string]> => {
  try {
    const tracks = await getTracks(content);
    for (const { url, ...request } of tracks.map(trackAsIftttRequest.bind(null, services))) {
      const body = JSON.stringify(request);
      const r = await fetch(url, {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
        },
      });
      const text = await r.text();
    }
    const response = JSON.stringify({ services, tracks });
    return [200, response];
  } catch (e: unknown) {
    return [500, 'Internal Error'];
  }
};

const handler = (
  request: VercelRequest,
  response: VercelResponse
) => {
  const { method, body } = request;
  if (
    method == null ||
    method.toLowerCase() !== 'post'
  ) {
    response.status(400).send('Bad Request');
    return;
  }

  const parsed = requestSchema.safeParse(
    body === 'string' && safeParseJson(body) || body
  );
  if (!parsed.success) {
    response.status(400).send('Bad Request');
    return;
  }

  main(parsed.data).then(([code, responseBody]) => {
    response.status(code).send(responseBody);
  });
};

export default handler;
