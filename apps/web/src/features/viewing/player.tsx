'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

import { Locale } from '../../i18n';

import {
  available,
  Binding,
  decodeIptvUrl,
  tmdb,
  Title,
  useNow,
  usePlatform,
  useResource,
} from './data';

import { labels } from './labels';
import { saveTitle, useLibrary } from './library';

type StreamProvider = {
  id: string;
  name: string;
  slug: string;
  category: string;

  movieTemplate?: string | null;
  tvTemplate?: string | null;
  streamUrl?: string | null;

  rank: number;
};

type PlayerBinding = Binding;

type MediaType = 'movie' | 'tv';

type SubtitleTrack = {
  url: string;
  label: string;
  language: string;
};

type ProviderContext = {
  mediaType: MediaType;

  tmdbId: string;

  season: string;
  episode: string;

  preferredLanguages: string[];

  subtitle?: SubtitleTrack;
};

type ProviderAdapter = (
  url: URL,
  context: ProviderContext,
) => void;

/**
 * Global subtitle priority.
 *
 * Change this order depending on your audience.
 */
const PREFERRED_SUBTITLE_LANGUAGES = [
  'en',
  'fr',
  'ar',
];

/**
 * Provider-specific configuration.
 *
 * This is the only place where provider-specific
 * query parameters should live.
 */
const providerAdapters: Record<
  string,
  ProviderAdapter
> = {
  /**
   * VidSrc
   *
   * Supports automatic subtitle language selection.
   */
  vidsrc: (url, context) => {
    url.searchParams.set(
      'ds_lang',
      context.preferredLanguages.join(','),
    );

    /**
     * If Stereamly later has its own subtitle file,
     * VidSrc can also receive it.
     */
    if (context.subtitle) {
      url.searchParams.set(
        'sub_url',
        context.subtitle.url,
      );

      url.searchParams.set(
        'sub_label',
        context.subtitle.label,
      );

      url.searchParams.set(
        'sub_lang',
        context.subtitle.language,
      );
    }
  },

  /**
   * VidLink Pro
   *
   * Supports adding an external VTT file.
   */
  'vidlink-pro': (url, context) => {
    if (!context.subtitle) {
      return;
    }

    url.searchParams.set(
      'sub_file',
      context.subtitle.url,
    );

    url.searchParams.set(
      'sub_label',
      context.subtitle.label,
    );
  },

  /**
   * 2Embed
   *
   * Let its own player handle subtitles.
   * Do not invent unsupported parameters.
   */
  '2embed': () => {},

  /**
   * MultiEmbed
   *
   * Let its own player handle subtitles.
   */
  multiembed: () => {},
};

export function Player({
  locale,
  target,
}: {
  locale: Locale;
  target: string;
}) {
  const t = labels[locale];

  const now = useNow();

  const platform = usePlatform();

  const api =
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000/api/v1';

  const parts = target.split(':');

  const metadata = useResource<Title>(
    parts[0] === 'tmdb'
      ? tmdb(
          `${parts[1]}/${parts[2]}`,
          locale,
        )
      : null,
  );

  const providers =
    useResource<StreamProvider[]>(
      parts[0] === 'tmdb'
        ? `${api}/providers?category=vod`
        : null,
    );

  const [country, setCountry] =
    useState('ALL');

  const [selected, setSelected] =
    useState('');

  const [attempt, setAttempt] =
    useState(0);

  const [quickOpen, setQuickOpen] =
    useState(false);

  const direct =
    publicDirectBindings(target);

  const providerBindings =
    providerTemplateBindings(
      target,
      providers.data,
    );

  const bindings: PlayerBinding[] = [
    ...available(
      platform.data,
      target,
      country,
      now,
    ),

    ...providerBindings,

    ...direct,
  ];

  const binding =
    bindings.find(
      (source) =>
        source.id === selected,
    ) || bindings[0];

  const bindingIndex =
    binding
      ? bindings.findIndex((source) => source.id === binding.id)
      : -1;

  const event =
    platform.data?.events.find(
      (item) =>
        target ===
        `event:${item.id}`,
    );

  const channel =
    platform.data?.channels.find(
      (item) =>
        target ===
        `channel:${item.id}`,
    );

  const name =
    event?.title ||
    channel?.names[locale] ||
    metadata.data?.title ||
    metadata.data?.name ||
    t.play;

  const countries = [
    ...new Set(
      platform.data?.bindings
        .filter(
          (source) =>
            source.target === target,
        )
        .flatMap(
          (source) =>
            source.countries,
        ),
    ),
  ]
    .filter(
      (item) =>
        item !== 'ALL',
    )
    .sort();

  const inWindow =
    !event ||
    (
      event.status === 'LIVE' &&
      Date.parse(event.startsAt) <=
        now &&
      Date.parse(event.endsAt) >
        now
    );

  const needsPlatform =
    ![
      'tmdb',
      'iptv',
    ].includes(parts[0]);

  const mediaType =
    parts[0] === 'tmdb'
      ? parts[1]
      : parts[0];

  const tmdbId =
    parts[2];

  const currentSeason =
    Number(parts[4] || 1);

  const currentEpisode =
    Number(parts[6] || 1);

  const isSeries =
    parts[0] === 'tmdb' &&
    parts[1] === 'tv';

  const detailHref =
    parts[0] === 'tmdb'
      ? `/${locale}/${parts[1] === 'tv' ? 'series' : 'movies'}/${tmdbId}`
      : `/${locale}`;

  const previousEpisodeHref =
    isSeries &&
    currentEpisode > 1
      ? `/${locale}/watch/tv/${tmdbId}?season=${currentSeason}&episode=${currentEpisode - 1}`
      : '';

  const nextEpisodeHref =
    isSeries
      ? `/${locale}/watch/tv/${tmdbId}?season=${currentSeason}&episode=${currentEpisode + 1}`
      : '';

  useEffect(() => {
    try {
      const preferred =
        window.localStorage.getItem(
          preferenceKey(target),
        );

      if (preferred) {
        setSelected(preferred);
      }
    } catch {
      // Ignore localStorage failures.
    }
  }, [target]);

  const choose = (
    value: string,
  ) => {
    setSelected(value);

    try {
      window.localStorage.setItem(
        preferenceKey(target),
        value,
      );
    } catch {
      // Ignore localStorage failures.
    }
  };

  const playNextSource = useCallback(() => {
    if (
      bindings.length < 2 ||
      bindingIndex < 0
    ) {
      setAttempt((value) => value + 1);
      return;
    }

    const next =
      bindings[
        (bindingIndex + 1) %
          bindings.length
      ];

    choose(next.id);
    setAttempt((value) => value + 1);
  }, [bindingIndex, bindings]);

  const playNextEpisode = useCallback(() => {
    if (!nextEpisodeHref) {
      return;
    }

    window.setTimeout(() => {
      window.location.href =
        nextEpisodeHref;
    }, 2500);
  }, [nextEpisodeHref]);

  return (
    <section className="watch-screen">
      <div className="watch-topbar">
        <button
          type="button"
          className="watch-back"
          aria-label={t.back}
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else window.location.href = detailHref;
          }}
        >
          ←
        </button>

        <div className="watch-title">
          <strong>{name}</strong>
          <span>{isSeries ? `S${currentSeason} E${currentEpisode}` : mediaType === 'movie' ? t.movie : event?.competition || channel?.names[locale] || ''}</span>
        </div>

      {event && (
        <p>
          {event.competition}
          {' · '}
          {event.status}
          {' · '}
          {new Date(
            event.startsAt,
          ).toLocaleString(locale)}
        </p>
      )}

      <div className="watch-source-bar">
        {countries.length > 0 && (
          <label>
            {t.region}

            <select
              value={country}
              onChange={(event) =>
                setCountry(
                  event.currentTarget
                    .value,
                )
              }
            >
              <option value="ALL">
                {t.world}
              </option>

              {countries.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>
          </label>
        )}

        {bindings.length > 0 && (
          <label>
            {t.source}

            <select
              value={
                binding?.id || ''
              }
              onChange={(event) =>
                choose(
                  event.currentTarget
                    .value,
                )
              }
            >
              {bindings.map(
                (source) => (
                  <option
                    key={source.id}
                    value={source.id}
                  >
                      {`Server ${bindings.indexOf(source) + 1} (${source.label})`}
                  </option>
                ),
              )}
            </select>
          </label>
        )}
      </div>
      </div>

      <div className="watch-stage">

      {needsPlatform &&
      platform.error ? (
        <div role="alert">
          <p>
            {t.error}
          </p>

          <button
            type="button"
            onClick={
              platform.retry
            }
          >
            {t.retry}
          </button>
        </div>
      ) : needsPlatform &&
        !platform.data &&
        direct.length === 0 ? (
        <p role="status">
          {t.loading}
        </p>
      ) : binding &&
        inWindow ? (
          <Playback
          key={`${binding.id}-${attempt}`}
          retry={() =>
            setAttempt(
              (value) =>
                value + 1,
            )
          }
          onFailure={playNextSource}
          onEnded={isSeries ? playNextEpisode : undefined}
          binding={binding}
          target={target}
          name={name}
          locale={locale}
        />
      ) : (
        <p className="watch-message">
          {t.unavailable}
        </p>
      )}
        <button type="button" className="watch-side-menu-toggle" onClick={() => setQuickOpen(true)} aria-label="Open quick menu">
          Quick Menu
        </button>
        {quickOpen && (
          <aside className="watch-quick-menu" aria-label="Quick Menu">
            <header>
              <h2>Quick Menu</h2>
              <button type="button" onClick={() => setQuickOpen(false)} aria-label="Close quick menu">×</button>
            </header>
            <section>
              <h3>{isSeries ? `Episodes · S${currentSeason} E${currentEpisode}` : 'Playback'}</h3>
              <div className="watch-quick-grid">
                {isSeries && (previousEpisodeHref ? <Link href={previousEpisodeHref}>◀<span>Prev Episode</span></Link> : <button type="button" disabled>◀<span>Prev Episode</span></button>)}
                {isSeries && <Link href={nextEpisodeHref}>▶<span>Next Episode</span></Link>}
                <Link href={detailHref}>▤<span>Details</span></Link>
              </div>
            </section>
            <section>
              <h3>Servers</h3>
              <div className="watch-server-list">
                {bindings.map((source, index) => <button key={source.id} type="button" className={binding?.id === source.id ? 'active' : ''} onClick={() => choose(source.id)}><b>{`Server ${index + 1}`}</b><span>{source.label}</span></button>)}
              </div>
            </section>
            <section>
              <h3>Sleep Timer</h3>
              <div className="watch-timer-grid">
                {['15m', '30m', '45m', '60m', '90m', 'End of Video'].map((item) => <button type="button" key={item}>{item}</button>)}
              </div>
            </section>
          </aside>
        )}
      </div>
    </section>
  );
}

function preferenceKey(
  target: string,
) {
  const [source, type] =
    target.split(':');

  return `streamly:preferred-source:${source}:${type || 'direct'}`;
}

function publicDirectBindings(
  target: string,
): PlayerBinding[] {
  const [type, id] =
    target.split(':');

  if (
    type !== 'iptv'
  ) {
    return [];
  }

  const url =
    decodeIptvUrl(id);

  if (!url) {
    return [];
  }

  return [
    {
      id:
        'iptv-org-direct',

      target,

      label:
        'IPTV-org HLS',

      kind: 'HLS',

      url,

      countries: [
        'ALL',
      ],

      expiresAt:
        '2999-12-31T23:59:59.000Z',
    },
  ];
}

function providerTemplateBindings(
  target: string,

  providers:
    | StreamProvider[]
    | undefined,
): PlayerBinding[] {
  const [
    source,
    type,
    id,
    ,
    season,
    ,
    episode,
  ] = target.split(':');

  if (
    source !== 'tmdb' ||
    ![
      'movie',
      'tv',
    ].includes(type) ||
    !providers
  ) {
    return [];
  }

  const mediaType: MediaType =
    type === 'tv'
      ? 'tv'
      : 'movie';

  const currentSeason =
    season || '1';

  const currentEpisode =
    episode || '1';

  /**
   * Later you can replace this with a call to
   * your own subtitle service.
   *
   * For now it's undefined, so providers use
   * their own built-in subtitle systems.
   */
  const subtitle:
    | SubtitleTrack
    | undefined =
    undefined;

  return [...providers]
    .sort(
      (a, b) =>
        a.rank - b.rank,
    )

    .flatMap(
      (provider) => {
        const template =
          mediaType ===
          'movie'
            ? provider.movieTemplate
            : provider.tvTemplate;

        const rawUrl =
          resolveTemplate(
            template ||
              provider.streamUrl,

            id,

            currentSeason,

            currentEpisode,
          );

        if (!rawUrl) {
          return [];
        }

        const url =
          prepareProviderUrl(
            provider,

            rawUrl,

            {
              mediaType,

              tmdbId: id,

              season:
                currentSeason,

              episode:
                currentEpisode,

              preferredLanguages:
                PREFERRED_SUBTITLE_LANGUAGES,

              subtitle,
            },
          );

        const isHls =
          /\.m3u8($|[?#])/i.test(
            url,
          );

        return [
          {
            id:
              `provider-${provider.slug}`,

            target,

            label:
              provider.name,

            kind: isHls
              ? ('HLS' as const)
              : ('EMBED' as const),

            url,

            countries: [
              'ALL',
            ],

            expiresAt:
              '2999-12-31T23:59:59.000Z',
          },
        ];
      },
    );
}

function resolveTemplate(
  template:
    | string
    | null
    | undefined,

  id: string,

  season: string,

  episode: string,
) {
  if (!template) {
    return null;
  }

  const url = template
    .replaceAll(
      '{id}',
      encodeURIComponent(id),
    )

    .replaceAll(
      '{s}',
      encodeURIComponent(
        season,
      ),
    )

    .replaceAll(
      '{e}',
      encodeURIComponent(
        episode,
      ),
    );

  try {
    const parsed =
      new URL(url);

    if (
      ![
        'http:',
        'https:',
      ].includes(
        parsed.protocol,
      )
    ) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function prepareProviderUrl(
  provider: StreamProvider,

  rawUrl: string,

  context: ProviderContext,
) {
  try {
    const url =
      new URL(rawUrl);

    const slug =
      provider.slug
        .trim()
        .toLowerCase();

    const adapter =
      providerAdapters[
        slug
      ];

    if (adapter) {
      adapter(
        url,
        context,
      );
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

function Playback({
  binding,
  target,
  name,
  locale,
  retry,
  onFailure,
  onEnded,
}: {
  retry: () => void;

  onFailure: () => void;

  onEnded?: () => void;

  binding: PlayerBinding;

  target: string;

  name: string;

  locale: Locale;
}) {
  const video =
    useRef<HTMLVideoElement>(
      null,
    );

  const currentName =
    useRef(name);

  const [
    failed,
    setFailed,
  ] =
    useState(false);

  const library =
    useLibrary();

  const resume =
    useRef(
      library.find(
        (item) =>
          item.target ===
          target,
      )?.position || 0,
    );

  useEffect(() => {
    currentName.current =
      name;
  }, [name]);

  useEffect(() => {
    setFailed(false);
  }, [
    binding.id,
    binding.url,
  ]);

  useEffect(() => {
    if (
      binding.kind !==
        'HLS' ||
      !video.current
    ) {
      return;
    }

    const element =
      video.current;

    let hls:
      | Hls
      | undefined;

    if (
      element.canPlayType(
        'application/vnd.apple.mpegurl',
      )
    ) {
      element.src =
        binding.url;
    } else if (
      Hls.isSupported()
    ) {
      hls =
        new Hls();

      hls.loadSource(
        binding.url,
      );

      hls.attachMedia(
        element,
      );

      hls.on(
        Hls.Events.ERROR,

        (_, data) => {
          if (
            data.fatal
          ) {
            setFailed(true);
            onFailure();
          }
        },
      );
    } else {
      queueMicrotask(
        () => {
          setFailed(true);
          onFailure();
        },
      );
    }

    const metadata =
      () => {
        if (
          Number.isFinite(
            element.duration,
          ) &&
          resume.current <
            element.duration
        ) {
          element.currentTime =
            resume.current;
        }
      };

    element.addEventListener(
      'loadedmetadata',

      metadata,
    );

    let last = 0;

    const progress =
      () => {
        if (
          Date.now() -
            last <
            10_000 ||
          !Number.isFinite(
            element.duration,
          )
        ) {
          return;
        }

        last =
          Date.now();

        try {
          saveTitle({
            target,

            name:
              currentName.current,

            position:
              element.currentTime,
          });
        } catch {
          // Ignore storage failures.
        }
      };

    element.addEventListener(
      'timeupdate',

      progress,
    );

    const fail =
      () => {
        setFailed(true);
        onFailure();
      };

    const ended =
      () => {
        onEnded?.();
      };

    element.addEventListener(
      'error',
      fail,
    );

    element.addEventListener(
      'ended',
      ended,
    );

    return () => {
      element.removeEventListener(
        'loadedmetadata',

        metadata,
      );

      element.removeEventListener(
        'timeupdate',

        progress,
      );

      element.removeEventListener(
        'error',
        fail,
      );

      element.removeEventListener(
        'ended',
        ended,
      );

      hls?.destroy();

      element.removeAttribute(
        'src',
      );

      element.load();
    };
  }, [
    binding.kind,
    binding.url,
    onEnded,
    onFailure,
    target,
  ]);

  return (
    <>
      <div className="watch-player">
        {binding.kind ===
        'HLS' ? (
          <video
            ref={video}
            controls
            playsInline
            preload="metadata"
            onError={() => {
              setFailed(true);
              onFailure();
            }}
          />
        ) : (
          <ProviderEmbed
            url={
              binding.url
            }
            name={name}
            onFailure={onFailure}
          />
        )}
      </div>

      {failed && (
        <div role="alert">
          <p>
            {
              labels[
                locale
              ].failed
            }
          </p>

          <button
            type="button"
            onClick={
              retry
            }
          >
            {
              labels[
                locale
              ].retry
            }
          </button>
        </div>
      )}
    </>
  );
}

function ProviderEmbed({
  url,
  name,
  onFailure,
}: {
  url: string;

  name: string;

  onFailure: () => void;
}) {
  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    setLoaded(false);
    const timer = window.setTimeout(() => {
      if (!loaded) {
        onFailure();
      }
    }, 12000);

    return () => window.clearTimeout(timer);
  }, [loaded, onFailure, url]);

  return (
    <div className="watch-embed">
      <iframe
        src={url}
        title={name}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        referrerPolicy="no-referrer"
        tabIndex={0}
        onLoad={() => setLoaded(true)}
        onError={onFailure}
        style={{
          position:
            'absolute',

          inset: 0,

          display:
            'block',

          width:
            '100%',

          height:
            '100%',

          border: 0,

          background:
            '#000',

          pointerEvents:
            'auto',
        }}
      />
    </div>
  );
}
