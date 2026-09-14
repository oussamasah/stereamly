'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../../components/auth-provider';
import { Locale } from '../../i18n';
import { labels } from './labels';
import { available, encodeIptvUrl, IPTV_CATEGORIES, IptvChannel, iptvCategory, tmdb, Title, usePlatform, useResource, watchPath } from './data';
import { removeTitle, saveTitle, useLibrary, useLibraryStatus } from './library';

export type View = 'home' | 'movie' | 'tv' | 'channels' | 'sports' | 'search' | 'library';

const TMDB_AREAS = [
    { id: 'ALL', fr: 'Tout', en: 'All', ar: 'الكل', countries: [] },
    { id: 'EUROPE', fr: 'Europe', en: 'Europe', ar: 'أوروبا', countries: [['FR','France'],['DE','Allemagne'],['ES','Espagne'],['IT','Italie'],['GB','Royaume-Uni'],['BE','Belgique'],['CH','Suisse'],['NL','Pays-Bas'],['PT','Portugal'],['SE','Suède'],['NO','Norvège'],['DK','Danemark'],['PL','Pologne'],['GR','Grèce'],['TR','Turquie']] },
    { id: 'AFRICA', fr: 'Afrique', en: 'Africa', ar: 'أفريقيا', countries: [['TN','Tunisie'],['EG','Égypte'],['MA','Maroc'],['DZ','Algérie'],['ZA','Afrique du Sud'],['NG','Nigeria'],['SN','Sénégal'],['CI','Côte d’Ivoire'],['CM','Cameroun'],['KE','Kenya'],['ET','Éthiopie'],['GH','Ghana']] },
    { id: 'AMERICAS', fr: 'États-Unis / Amériques', en: 'United States / Americas', ar: 'أمريكا', countries: [['US','États-Unis'],['CA','Canada'],['MX','Mexique'],['BR','Brésil'],['AR','Argentine'],['CO','Colombie'],['CL','Chili']] },
    { id: 'ASIA', fr: 'Asie', en: 'Asia', ar: 'آسيا', countries: [['IN','Inde'],['JP','Japon'],['KR','Corée du Sud'],['CN','Chine'],['HK','Hong Kong'],['TH','Thaïlande'],['ID','Indonésie'],['MY','Malaisie'],['PH','Philippines'],['SA','Arabie saoudite'],['AE','Émirats arabes unis'],['LB','Liban']] },
] as const;
type TmdbGenre = { id: number; name: string };

export function TitleCard({ item, kind, locale }: { item: Title; kind: 'movie' | 'tv'; locale: Locale }) {
    return <Link className="view-card" href={`/${locale}/${kind === 'movie' ? 'movies' : 'series'}/${item.id}`}>
        <div className="view-poster">{item.poster_path ? <img src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} alt="" loading="lazy" /> : <span>▶</span>}</div>
        <strong>{item.title || item.name}</strong>
        <small>{(item.release_date || item.first_air_date || '').slice(0, 4)} {item.vote_average > 0 ? ` · ★ ${item.vote_average.toFixed(1)}` : ''}</small>
    </Link>;
}

export function Browse({ locale, view }: { locale: Locale; view: View }) {
    const t = labels[locale];
    const { user } = useAuth();
    const libraryStatus = useLibraryStatus();
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [tmdbArea, setTmdbArea] = useState('ALL');
    const [tmdbCountry, setTmdbCountry] = useState('');
    const [tmdbGenre, setTmdbGenre] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [sport, setSport] = useState('');
    const [iptvKind, setIptvKind] = useState<typeof IPTV_CATEGORIES[number]>('sports');
    const snapshot = usePlatform();
    const publicChannels = useResource<IptvChannel[]>(view === 'channels' || view === 'home' || view === 'search' ? iptvCategory(iptvKind) : null);
    const library = useLibrary();
    const kind = view === 'tv' ? 'tv' : 'movie';
    const needsTitles = ['home', 'movie', 'tv', 'search'].includes(view);
    const area = TMDB_AREAS.find(item => item.id === tmdbArea) ?? TMDB_AREAS[0];
    const filtered = Boolean(tmdbCountry || tmdbGenre) && view !== 'search';
    const genres = useResource<{ genres: TmdbGenre[] }>((view === 'movie' || view === 'tv') ? tmdb(`genre/${kind}/list`, locale) : null);
    const activeFilterCount = Number(tmdbArea !== 'ALL') + Number(Boolean(tmdbCountry)) + Number(Boolean(tmdbGenre));
    const countryName = area.countries.find(([code]) => code === tmdbCountry)?.[1];
    const genreName = genres.data?.genres.find(genre => String(genre.id) === tmdbGenre)?.name;
    const base = tmdb(view === 'search' ? 'search/multi' : filtered ? `discover/${kind}` : `${kind}/popular`, locale, search, filtered ? { with_origin_country: tmdbCountry, with_genres: tmdbGenre, sort_by: 'popularity.desc', ...(kind === 'movie' && tmdbCountry ? { region: tmdbCountry } : {}) } : {});
    const resource = useResource<{ results: Title[]; total_pages: number }>(needsTitles && base && (view !== 'search' || search) ? `${base}&page=${page}` : null);
    const items = (resource.data?.results || []).filter(item => item.media_type !== 'person');
    const heading = view === 'home' ? t.home : view === 'movie' ? t.movie : view === 'tv' ? t.tv : t[view];

    return <div className="view-shell">
        {view === 'home' ? <section className="view-hero"><span className="view-eyebrow">STREAMLY · FREE TO EXPLORE</span><h1>{t.headline}</h1><p>{t.intro}</p><div className="view-actions"><Link className="button" href={`/${locale}/movies`}>{t.browse}</Link><Link className="button secondary" href={`/${locale}/sports`}>{t.sports} →</Link></div></section> : <h1>{heading}</h1>}
        {view === 'search' && <form className="view-search" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); setPage(1); }}><input aria-label={t.search} value={query} onChange={event => setQuery(event.target.value)} placeholder={t.search} maxLength={100} /><button className="button">{t.search}</button></form>}
        {(view === 'movie' || view === 'tv') && <section className={`tmdb-filter-shell ${filtersOpen ? 'open' : ''}`} aria-label={locale === 'fr' ? 'Filtres du catalogue' : locale === 'ar' ? 'فلاتر الكتالوج' : 'Catalogue filters'}><div className="tmdb-filter-bar"><button className="tmdb-filter-toggle" aria-expanded={filtersOpen} aria-controls="tmdb-filter-options" onClick={() => setFiltersOpen(value => !value)}><span className="filter-icon" aria-hidden="true">☷</span><span>{locale === 'fr' ? 'Filtres' : locale === 'ar' ? 'الفلاتر' : 'Filters'}</span>{activeFilterCount > 0 && <b>{activeFilterCount}</b>}<i aria-hidden="true">{filtersOpen ? '−' : '+'}</i></button>{!filtersOpen && activeFilterCount > 0 && <div className="tmdb-active-filters">{tmdbArea !== 'ALL' && <span>{area[locale]}</span>}{countryName && <span>{countryName}</span>}{genreName && <span>{genreName}</span>}<button aria-label={locale === 'fr' ? 'Effacer les filtres' : 'Clear filters'} onClick={() => { setTmdbArea('ALL'); setTmdbCountry(''); setTmdbGenre(''); setPage(1); }}>×</button></div>}</div>{filtersOpen && <div className="tmdb-filter-panel" id="tmdb-filter-options"><div><span className="tmdb-filter-label">{locale === 'fr' ? 'Zone' : locale === 'ar' ? 'المنطقة' : 'Area'}</span><div className="tmdb-region-filter" role="group">{TMDB_AREAS.map(item => <button key={item.id} aria-pressed={tmdbArea === item.id} onClick={() => { setTmdbArea(item.id); setTmdbCountry(item.countries[0]?.[0] ?? ''); setPage(1); }}>{item[locale]}</button>)}</div></div><div className="tmdb-subfilters"><label>{locale === 'fr' ? 'Pays' : locale === 'ar' ? 'البلد' : 'Country'}<select value={tmdbCountry} disabled={!area.countries.length} onChange={event => { setTmdbCountry(event.target.value); setPage(1); }}><option value="">{locale === 'fr' ? 'Tous les pays' : locale === 'ar' ? 'كل البلدان' : 'All countries'}</option>{area.countries.map(([code,name]) => <option value={code} key={code}>{name}</option>)}</select></label><label>{locale === 'fr' ? 'Genre' : locale === 'ar' ? 'النوع' : 'Genre'}<select value={tmdbGenre} onChange={event => { setTmdbGenre(event.target.value); setPage(1); }}><option value="">{locale === 'fr' ? 'Tous les genres' : locale === 'ar' ? 'كل الأنواع' : 'All genres'}</option>{genres.data?.genres.map(genre => <option value={genre.id} key={genre.id}>{genre.name}</option>)}</select></label><div className="tmdb-filter-actions">{activeFilterCount > 0 && <button className="button secondary" onClick={() => { setTmdbArea('ALL'); setTmdbCountry(''); setTmdbGenre(''); setPage(1); }}>{locale === 'fr' ? 'Réinitialiser' : locale === 'ar' ? 'إعادة ضبط' : 'Reset'}</button>}<button className="button" onClick={() => setFiltersOpen(false)}>{locale === 'fr' ? 'Voir les résultats' : locale === 'ar' ? 'عرض النتائج' : 'View results'}</button></div></div></div>}</section>}

        {needsTitles && <section><h2>{view === 'home' ? t.movie : ''}</h2>{!base ? <p className="view-empty">{t.metadata}</p> : resource.error ? <div role="alert"><p>{t.error}</p><button onClick={resource.retry}>{t.retry}</button></div> : !resource.data && (view !== 'search' || search) ? <p role="status">{t.loading}</p> : <><div className="view-grid">{items.map(item => <TitleCard key={`${item.media_type || kind}-${item.id}`} item={item} kind={item.media_type === 'tv' ? 'tv' : kind} locale={locale} />)}</div>{items.length === 0 && search && <p className="view-empty">{t.empty}</p>}{view !== 'home' && items.length > 0 && <div className="view-actions"><button disabled={page === 1} onClick={() => setPage(value => value - 1)} aria-label="Previous page">←</button><span>{page}</span><button disabled={page >= (resource.data?.total_pages || 1) || page >= 500} onClick={() => setPage(value => value + 1)} aria-label="Next page">→</button></div>}</>}</section>}

        {['home', 'channels', 'search'].includes(view) && <ChannelsSection locale={locale} search={search} snapshot={snapshot} publicChannels={publicChannels} iptvKind={iptvKind} setIptvKind={setIptvKind} />}
        {['home', 'sports', 'search'].includes(view) && <SportsSection locale={locale} search={search} sport={sport} setSport={setSport} snapshot={snapshot} />}

        {view === 'library' && <><p>{!user ? t.local : libraryStatus === 'synced' ? (locale === 'ar' ? 'تمت مزامنة قائمتك مع حسابك.' : locale === 'fr' ? 'Votre liste est synchronisée avec votre compte.' : 'Your list is synced to your account.') : (locale === 'ar' ? 'محفوظة على هذا الجهاز. المزامنة معلقة.' : locale === 'fr' ? 'Enregistrée sur cet appareil. Synchronisation en attente.' : 'Saved on this device. Sync is pending.')}</p><div className="view-grid view-grid-wide">{library.map(item => <article className="view-tile" key={item.target}><Link href={watchPath(locale, item.target)}><h2>{item.name || <SavedItemName target={item.target} locale={locale} />}</h2>{item.position ? `${Math.floor(item.position / 60)} min` : t.details}</Link><button onClick={() => removeTitle(item.target)}>{t.remove}</button></article>)}</div>{library.length === 0 && <p className="view-empty">{t.empty}</p>}</>}

        {view === 'home' && snapshot.data?.collections.map(collection => <section key={collection.id}><h2>{collection.names[locale] || collection.names.en}</h2><div className="view-actions">{collection.targets.map(target => <CollectionItem key={target} target={target} locale={locale} />)}</div></section>)}
    </div>;
}

function ChannelsSection({ locale, search, snapshot, publicChannels, iptvKind, setIptvKind }: {
    locale: Locale;
    search: string;
    snapshot: ReturnType<typeof usePlatform>;
    publicChannels: ReturnType<typeof useResource<IptvChannel[]>>;
    iptvKind: typeof IPTV_CATEGORIES[number];
    setIptvKind: (value: typeof IPTV_CATEGORIES[number]) => void;
}) {
    const t = labels[locale];
    const normalized = search.toLowerCase();
    const curated = snapshot.data?.channels.filter(channel => !search || Object.values(channel.names).some(name => name.toLowerCase().includes(normalized))) || [];
    const publicItems = (publicChannels.data || [])
        .filter(channel => channel.url && (!search || `${channel.name || ''} ${channel.countries?.join(' ') || ''} ${channel.languages?.join(' ') || ''}`.toLowerCase().includes(normalized)))
        .slice(0, 96);

    return <section>
        <h2>{t.channels}</h2>
        <div className="view-actions">{IPTV_CATEGORIES.map(category => <button key={category} aria-pressed={iptvKind === category} onClick={() => setIptvKind(category)}>{category}</button>)}</div>
        {snapshot.error && publicChannels.error ? <div role="alert"><p>{t.error}</p><button onClick={() => { snapshot.retry(); publicChannels.retry(); }}>{t.retry}</button></div> : !snapshot.data && !publicChannels.data ? <p role="status">{t.loading}</p> : <div className="view-grid view-grid-wide">
            {curated.map(channel => <Link className="view-tile" key={channel.id} href={watchPath(locale, `channel:${channel.id}`)}><span className="view-eyebrow">{channel.countryCode} · {channel.languageCode}</span><h3>{channel.names[locale] || channel.names.en || channel.slug}</h3><span>{t.details} →</span></Link>)}
            {publicItems.map(channel => <PublicChannelCard key={`${channel.url}-${channel.name}`} channel={channel} locale={locale} />)}
        </div>}
        {curated.length === 0 && publicItems.length === 0 && <p className="view-empty">{t.empty}</p>}
    </section>;
}

function PublicChannelCard({ channel, locale }: { channel: IptvChannel; locale: Locale }) {
    const target = `iptv:${encodeIptvUrl(channel.url || '')}`;
    const label = [channel.countries?.[0], channel.languages?.[0]].filter(Boolean).join(' · ') || 'IPTV-org';
    return <Link className="view-tile" href={watchPath(locale, target)}>
        <span className="view-eyebrow">{label}</span>
        {channel.logo && <img className="view-channel-logo" src={channel.logo} alt="" loading="lazy" />}
        <h3>{channel.name || channel.id || 'Live channel'}</h3>
        <span>{labels[locale].play} →</span>
    </Link>;
}

function SportsSection({ locale, search, sport, setSport, snapshot }: {
    locale: Locale;
    search: string;
    sport: string;
    setSport: (value: string) => void;
    snapshot: ReturnType<typeof usePlatform>;
}) {
    const t = labels[locale];
    return <section>
        <h2>{t.sports}</h2>
        <p className="view-help">{locale === 'fr' ? 'Les événements sportifs affichent les sources publiées dans votre plateforme. Ajoutez uniquement des diffusions autorisées dans l’administration.' : locale === 'ar' ? 'تعرض الأحداث الرياضية المصادر المنشورة في منصتك. أضف فقط البث المصرح به من لوحة الإدارة.' : 'Sports events show sources published in your platform. Add only authorized streams in admin.'}</p>
        <div className="view-actions"><button aria-pressed={!sport} onClick={() => setSport('')}>{t.sports}</button>{[...new Set(snapshot.data?.events.map(event => event.sport))].map(item => <button key={item} aria-pressed={sport === item} onClick={() => setSport(item)}>{item}</button>)}</div>
        {snapshot.error ? <div role="alert"><p>{t.error}</p><button onClick={snapshot.retry}>{t.retry}</button></div> : !snapshot.data ? <p role="status">{t.loading}</p> : <div className="view-grid view-grid-wide">{snapshot.data.events.filter(event => (!sport || event.sport === sport) && (!search || `${event.title} ${event.competition}`.toLowerCase().includes(search.toLowerCase()))).map(event => <Link key={event.id} className="view-tile" href={watchPath(locale, `event:${event.id}`)}><span className="view-eyebrow">{event.sport} · {event.status}</span><h3>{event.title}</h3><p>{event.competition}</p><time dateTime={event.startsAt}>{new Date(event.startsAt).toLocaleString(locale)}</time><span>{t.details} →</span></Link>)}</div>}
        {snapshot.data?.events.length === 0 && <p className="view-empty">{t.empty}</p>}
    </section>;
}

function CollectionItem({ target, locale }: { target: string; locale: Locale }) {
    const parts = target.split(':');
    const resource = useResource<Title>(parts[0] === 'tmdb' ? tmdb(`${parts[1]}/${parts[2]}`, locale) : null);
    const platform = usePlatform();
    const name = resource.data?.title || resource.data?.name || platform.data?.channels.find(channel => target === `channel:${channel.id}`)?.names[locale] || platform.data?.events.find(event => target === `event:${event.id}`)?.title;
    return name ? <Link className="view-tile" href={watchPath(locale, target)}>{name} →</Link> : null;
}

export function TitleDetail({ locale, kind, id }: { locale: Locale; kind: 'movie' | 'tv'; id: string }) {
    const t = labels[locale];
    const url = tmdbDetail(kind, id, locale);
    const resource = useResource<TmdbDetail>(url);
    const snapshot = usePlatform();
    const [season, setSeason] = useState(1);
    const [episode, setEpisode] = useState(1);
    const [tab, setTab] = useState<DetailTab>(kind === 'tv' ? 'episodes' : 'overview');
    const [storageError, setStorageError] = useState(false);
    const saved = useLibrary();
    const title = resource.data;
    const seasonUrl = kind === 'tv' ? tmdbSeason(id, season, locale) : null;
    const seasonDetail = useResource<TmdbSeason>(seasonUrl);
    const [heroIndex, setHeroIndex] = useState(0);
    const target = `tmdb:${kind}:${id}${kind === 'tv' ? `:s:${season}:e:${episode}` : ''}`;
    const isAvailable = available(snapshot.data, target).length > 0;
    const fallbackBackdrop = title?.backdrop_path ? `https://image.tmdb.org/t/p/original${title.backdrop_path}` : '';
    const episodeBackdrops = kind === 'tv' ? (seasonDetail.data?.episodes || []).map(item => item.still_path ? `https://image.tmdb.org/t/p/original${item.still_path}` : '').filter(Boolean) : [];
    const similarBackdrops = title?.similar?.results.map(item => item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : '').filter(Boolean) || [];
    const heroImages = [fallbackBackdrop, ...similarBackdrops, ...episodeBackdrops].filter(Boolean).slice(0, 6);
    const activeBackdrop = heroImages[heroIndex % Math.max(heroImages.length, 1)] || fallbackBackdrop;
    useEffect(() => {
        if (heroImages.length < 2) return;
        const timer = window.setInterval(() => setHeroIndex(value => (value + 1) % heroImages.length), 5500);
        return () => window.clearInterval(timer);
    }, [heroImages.length]);
    if (!url) return <p className="view-empty">{t.metadata}</p>;
    if (resource.error) return <p className="view-empty" role="alert">{t.error}</p>;
    if (!title) return <p className="view-empty" role="status">{t.loading}</p>;
    const name = title.title || title.name || id;
    const trailer = title.videos?.results.find(video => video.site === 'YouTube' && ['Trailer', 'Teaser'].includes(video.type));
    const tabs: DetailTab[] = kind === 'tv' ? ['episodes', 'overview', 'casts', 'reviews', 'related'] : ['overview', 'casts', 'reviews', 'related'];
    const savedCurrent = saved.some(item => item.target === target);
    const release = title.release_date || title.first_air_date;
    const companies = title.production_companies?.slice(0, 4).map(company => company.name).join(', ');
    const languages = title.spoken_languages?.map(language => language.english_name || language.name).filter(Boolean).join(', ');
    const countries = title.production_countries?.map(country => country.name).filter(Boolean).join(', ');
    const backHref = `/${locale}/${kind === 'movie' ? 'movies' : 'series'}`;
    const share = () => {
        try {
            const url = window.location.href;
            if (navigator.share) void navigator.share({ title: name, url });
            else void navigator.clipboard?.writeText(url);
            setStorageError(false);
        } catch { setStorageError(true); }
    };
    return <article className="vod-detail">
        {activeBackdrop && <img key={activeBackdrop} className="vod-backdrop" src={activeBackdrop} alt="" />}
        <div className="vod-vignette vod-vignette-bottom" /><div className="vod-vignette vod-vignette-side" />
        <Link className="vod-return" href={backHref} aria-label="Back"><span aria-hidden="true">&#8592;</span></Link>
        <div className="vod-grid">
            <section className="vod-identity">
                <div className="vod-dock">
                    <div className="vod-poster-card">{title.poster_path ? <img src={`https://image.tmdb.org/t/p/w500${title.poster_path}`} alt="" /> : <span>{name}</span>}<b>{title.vote_average ? title.vote_average.toFixed(1) : 'NR'}</b></div>
                    <div className="vod-title-card">
                        <span className="view-eyebrow">{kind === 'movie' ? t.movie : t.tv}</span>
                        <h1>{name}</h1>
                        <p className="vod-meta-line">{[release?.slice(0, 4), title.status, title.genres?.slice(0, 3).map(genre => genre.name).join(' / ')].filter(Boolean).join(' - ')}</p>
                        <div className="vod-actions"><Link className="vod-icon-action vod-watch" href={watchPath(locale, target)} aria-label="Watch"><span>▶</span><b>Watch</b></Link>{trailer && <a className="vod-icon-action" href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noreferrer" aria-label="Trailer"><span>▰</span><b>Trailer</b></a>}<button className="vod-icon-action square" aria-label={savedCurrent ? 'Remove from list' : 'Add to list'} onClick={() => { try { if (savedCurrent) removeTitle(target); else saveTitle({ target, name, poster: title.poster_path }); } catch { setStorageError(true); } }}>{savedCurrent ? '✓' : '+'}</button><button className="vod-icon-action square" aria-label="Share" onClick={share}>↗</button></div>
                        {storageError && <p role="alert" className="error">{t.error}</p>}{!isAvailable && <p className="muted">{t.unavailable}</p>}
                    </div>
                </div>
            </section>
            <aside className="vod-sidebar">
                <nav className="vod-tabs" aria-label="Title details">{tabs.map(item => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item === 'casts' ? 'Casts' : item[0].toUpperCase() + item.slice(1)}</button>)}</nav>
                {tab === 'overview' && <div className="vod-panel"><p>{title.overview || t.empty}</p><dl className="vod-specs"><div><dt>Release</dt><dd>{formatDate(release, locale)}</dd></div><div><dt>{kind === 'movie' ? 'Runtime' : 'Show Details'}</dt><dd>{kind === 'movie' ? formatRuntime(title.runtime) : `Status: ${title.status || '-'}\nTotal Seasons: ${title.number_of_seasons || 0}\nTotal Episodes: ${title.number_of_episodes || 0}`}</dd></div><div><dt>Genre</dt><dd>{title.genres?.map(genre => genre.name).join(', ') || '-'}</dd></div><div><dt>Spoken Languages</dt><dd>{languages || '-'}</dd></div><div><dt>Production Countries</dt><dd>{countries || '-'}</dd></div><div><dt>Production Companies</dt><dd>{companies || '-'}</dd></div></dl></div>}
                {tab === 'episodes' && kind === 'tv' && <div className="vod-panel"><label>{t.season}<select value={season} onChange={event => { setSeason(Number(event.target.value)); setEpisode(1); }}>{title.seasons?.filter(item => item.season_number > 0).map(item => <option key={item.season_number} value={item.season_number}>{item.name}</option>)}</select></label><div className="vod-vertical-list">{seasonDetail.data?.episodes?.map(item => <article className={`vod-row ${episode === item.episode_number ? 'active' : ''}`} key={item.id}><Link href={watchPath(locale, `tmdb:tv:${id}:s:${season}:e:${item.episode_number}`)}><span>{item.still_path ? <img src={`https://image.tmdb.org/t/p/w300${item.still_path}`} alt="" loading="lazy" /> : `EP ${item.episode_number}`}</span><div><h3>EP {item.episode_number}: {item.name}</h3><small>{item.vote_average ? item.vote_average.toFixed(1) : 'NR'} - {formatRuntime(item.runtime)}</small><b>▶ Watch</b></div></Link><p>{item.overview || t.empty}</p><i /></article>) || <p className="muted">{t.loading}</p>}</div></div>}
                {tab === 'casts' && <div className="vod-panel vod-vertical-list">{title.credits?.cast.slice(0, 14).map(person => <div className="vod-row compact" key={person.id}><span>{person.profile_path ? <img src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} alt="" loading="lazy" /> : person.name.slice(0, 1)}</span><div><h3>{person.name}</h3><small>{person.character}</small></div></div>) || <p>{t.empty}</p>}</div>}
                {tab === 'reviews' && <div className="vod-panel">{title.reviews?.results.slice(0, 3).map(review => <blockquote key={review.id}><strong>{review.author}</strong><p>{review.content.slice(0, 420)}{review.content.length > 420 ? '...' : ''}</p></blockquote>) || <p className="muted">{t.empty}</p>}</div>}
                {tab === 'related' && <div className="vod-panel vod-vertical-list">{title.similar?.results.slice(0, 14).map(item => <Link className="vod-row compact" key={item.id} href={`/${locale}/${kind === 'movie' ? 'movies' : 'series'}/${item.id}`}><span>{item.poster_path ? <img src={`https://image.tmdb.org/t/p/w185${item.poster_path}`} alt="" loading="lazy" /> : item.title || item.name}</span><div><h3>{item.title || item.name}</h3><small>{(item.release_date || item.first_air_date || '').slice(0, 4)} - {item.vote_average ? item.vote_average.toFixed(1) : 'NR'}</small></div></Link>) || <p className="muted">{t.empty}</p>}</div>}
            </aside>
        </div>
    </article>;
}

type TmdbDetail = Title & {
    runtime?: number;
    status?: string;
    number_of_episodes?: number;
    genres?: { id: number; name: string }[];
    spoken_languages?: { english_name?: string; name: string }[];
    production_companies?: { id: number; name: string }[];
    production_countries?: { iso_3166_1: string; name: string }[];
    credits?: { cast: { id: number; name: string; character?: string; profile_path?: string | null }[] };
    videos?: { results: { key: string; site: string; type: string }[] };
    similar?: { results: Title[] };
    reviews?: { results: { id: string; author: string; content: string }[] };
};

type TmdbSeason = { episodes: { id: number; episode_number: number; name: string; still_path: string | null; overview?: string; runtime?: number; vote_average?: number }[] };
type DetailTab = 'overview' | 'episodes' | 'casts' | 'reviews' | 'related';

function tmdbDetail(kind: 'movie' | 'tv', id: string, locale: string) {
    const url = new URL(`/api/tmdb/${kind}/${id}`, 'http://streamly.local');
    url.searchParams.set('language', locale);
    url.searchParams.set('append_to_response', 'credits,videos,similar,reviews');
    return `${url.pathname}${url.search}`;
}

function tmdbSeason(id: string, season: number, locale: string) {
    const url = new URL(`/api/tmdb/tv/${id}/season/${season}`, 'http://streamly.local');
    url.searchParams.set('language', locale);
    return `${url.pathname}${url.search}`;
}

function formatRuntime(minutes?: number) {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60), rest = minutes % 60;
    return hours ? `${hours}hr ${rest}min` : `${rest}min`;
}

function formatDate(value: string | undefined, locale: string) {
    if (!value) return '-';
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

function SavedItemName({ target, locale }: { target: string; locale: Locale }) {
    const parts = target.split(':');
    const title = useResource<Title>(parts[0] === 'tmdb' ? tmdb(`${parts[1]}/${parts[2]}`, locale) : null);
    const platform = usePlatform();
    const name = title.data?.title || title.data?.name || platform.data?.channels.find(channel => target === `channel:${channel.id}`)?.names[locale] || platform.data?.events.find(event => target === `event:${event.id}`)?.title;
    return <>{name || (parts[0] === 'tmdb' ? `${parts[1] === 'tv' ? labels[locale].tv : labels[locale].movie} #${parts[2]}` : parts[0] === 'channel' || parts[0] === 'iptv' ? labels[locale].channels : labels[locale].sports)}</>;
}
