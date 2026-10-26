import { load } from 'cheerio';
export const ORIGIN = 'https://www.aucklandknights.co.nz';
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
export function safeLink(value, base = ORIGIN) {
  if (!value) return null;
  try { const u = new URL(value, base); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export function parseListing(html, kind) {
  const $ = load(html); const found = new Map();
  if (kind === 'news') {
    $('main a[href^="/news/"]').each((_, el) => {
      const a = $(el), href = a.attr('href');
      if (!/^\/news\/[^/?#]+$/.test(href)) return;
      const title = clean(a.find('h2').text()); if (!title) return;
      found.set(href, { title, url: safeLink(href), summary: clean(a.find('p').last().text()), image: safeLink(a.find('img').attr('src') || '') });
    });
  } else {
    $('main article').each((_, el) => {
      const a = $(el); const href = a.find('a[href^="/tournaments/"]').map((_, x) => $(x).attr('href')).get().find(x => /^\/tournaments\/[^/?#]+$/.test(x));
      if (!href) return;
      const slug = href.split('/').pop();
      found.set(slug, { slug, title: clean(a.find('h3').text()), url: safeLink(href) });
    });
  }
  return [...found.values()];
}
export function parseDetail(html, slug) {
  const $ = load(html); const main = $('main'); const article = main.find('article').first();
  const title = clean(article.find('h1').first().text());
  if (!title) throw new Error('Tournament not available');
  const base = `/tournaments/${encodeURIComponent(slug)}`;
  const rows = article.find('p').map((_, e) => clean($(e).text())).get();
  const field = name => rows.find(x => x.startsWith(`${name}:`))?.slice(name.length + 1).trim() || '';
  const register = article.find(`a[href="${base}/register"]`).length > 0;
  return { slug, title, description: clean(article.find('h1').parent().find('p').first().text()),
    date: field('Date'), venue: field('Venue'), address: field('Address'), fee: field('Fee'),
    time_control: field('Time control'), rounds: field('Rounds'), rating: field('Rating type'),
    image: safeLink(article.find('img').first().attr('src') || ''),
    url: safeLink(base), registration_url: register ? safeLink(`${base}/register`) : null,
    entries_url: article.find(`a[href="${base}/entries"]`).length ? safeLink(`${base}/entries`) : null,
    absence_url: safeLink(`/absence?tournament=${encodeURIComponent(title)}`),
    club_event: article.text().includes('Club Event - active membership'),
    vega_url: article.find('a').map((_, a) => $(a).attr('href')).get().map(x=>safeLink(x)).find(x => x && new URL(x).hostname === 'www.vegaresults.com') || null };
}
export function parsePlayers(html) {
  const $ = load(html);
  // Only the eight rendered public table cells. No embedded RSC scripts or form state.
  return $('main tbody tr').map((_, el) => {
    const cells = $(el).find('td'); if (cells.length !== 8) return null;
    const values = cells.map((_, c) => clean($(c).text())).get();
    const fide = /^[1-9]\d{0,11}$/.test(values[4]) ? values[4] : '';
    return { title: values[1], name: values[2], gender: values[3], fide_id: fide,
      fide_rating: Number(values[5]) || null, nzcf_rating: Number(values[6]) || null, club: values[7] };
  }).get();
}
export function parseContact(html) {
  const $ = load(html); const main = $('main');
  const emailHref = main.find('a[href^="mailto:"]').first().attr('href');
  const phoneHref = main.find('a[href^="tel:"]').first().attr('href');
  return { email: emailHref?.slice(7).split('?')[0] || 'akcc.nzchess@gmail.com', phone: phoneHref?.slice(4) || '+64221793499', url: `${ORIGIN}/contact` };
}
export async function website(path, fetcher = fetch) {
  // The caller supplies only fixed paths or separately encoded slugs; no user-provided origins.
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid website path');
  const r = await fetcher(`${ORIGIN}${path}`, { signal: AbortSignal.timeout(15000), redirect: 'error', headers: { 'User-Agent': 'AKCC-Mobile-Public-Reader/0.1' } });
  if (!r.ok) throw new Error(`Public page unavailable (${r.status})`);
  return r.text();
}
export function publicService(fetcher = fetch) {
  const page = path => website(path, fetcher);
  let cached; let expires = 0; let pending;
  const detail = async slug => parseDetail(await page(`/tournaments/${encodeURIComponent(slug)}`), slug);
  return {
    detail,
    calendar:async()=>parseCalendar(await page('/calendar')),
    results:async()=>parseResults(await page('/results')),
    news:async slug=>parseNews(await page(`/news/${encodeURIComponent(slug)}`),slug),
    async feed() {
      if (cached && Date.now() < expires) return cached;
      if (pending) return pending;
      pending = (async () => {
        const [t, n, c] = await Promise.all([page('/tournaments'), page('/news'), page('/contact')]);
        const list = parseListing(t, 'tournaments').slice(0, 40);
        // Validate each event against the public detail route, which excludes drafts.
        const events = [];
        for (let i=0; i<list.length; i+=4) {
          const batch = await Promise.allSettled(list.slice(i,i+4).map(x=>detail(x.slug)));
          events.push(...batch.filter(x=>x.status==='fulfilled').map(x=>x.value));
        }
        if (list.length && !events.length) throw new Error('Tournament details unavailable');
        cached = { tournaments: events, news: parseListing(n, 'news'), contact: parseContact(c), fetched_at: new Date().toISOString(), source: ORIGIN };
        expires = Date.now()+60000; return cached;
      })();
      try { return await pending; } finally { pending = undefined; }
    },
    async players(slug) {
      const t = await detail(slug); if (!t.entries_url) throw new Error('Public entries are disabled');
      return parsePlayers(await page(`/tournaments/${encodeURIComponent(slug)}/entries`));
    }
  };
}

export function parseCalendar(html){
  const $=load(html);const items=[];
  $('main div.grid').each((_,element)=>{
    const row=$(element),a=row.find('a[href^="/tournaments/"]').filter((_,x)=>/^\/tournaments\/[^/?#]+$/.test($(x).attr('href')||'')).first();
    if(!a.length||row.find('div.grid').length)return;
    const state=clean(row.find('span.uppercase').first().text());
    if(state==='draft')return;
    const href=a.attr('href');
    items.push({slug:href.split('/').pop(),title:clean(a.text()),date:clean(row.children('div').first().text()),year:clean(row.closest('section').find('h2').first().text()),status:state,details:clean(row.find('div.mt-1').first().text()),description:clean(row.find('p').first().text()),club_event:row.text().includes('Club event — active membership'),url:safeLink(href)});
  });
  return {title:clean($('main h1').first().text())||'Calendar',items};
}
export function parseResults(html){
  const $=load(html);return $('main article').map((_,element)=>{
    const row=$(element),heading=row.find('h3').first(),copy=heading.clone();copy.children('span').remove();
    const title=clean(copy.text());if(!title)return null;
    const text=row.find('p').map((_,x)=>clean($(x).text())).get();
    const place=label=>text.find(x=>x.startsWith(`${label}:`))?.slice(label.length+1).trim()||'';
    return {title,date:clean(heading.find('span').text()),year:clean(row.closest('section').find('h2').first().text()),first:place('1st'),second:place('2nd'),third:place('3rd'),summary:clean(row.find('p.whitespace-pre-line').text()),image:safeLink(row.find('img').attr('src')),links:row.find('a[href]').map((_,x)=>{const url=safeLink($(x).attr('href'));return url?{label:clean($(x).text())||'View results',url}:null;}).get()};
  }).get();
}
export function parseNews(html,slug){
  const $=load(html);const article=$('main article').first();
  const title=clean(article.find('h1').first().text());if(!title)throw new Error('News unavailable');
  article.find('script,style,form,button').remove();
  const blocks=article.find('h2,h3,h4,p,li').map((_,x)=>clean($(x).text())).get().filter(Boolean);
  // Article content only. No executable HTML or embedded Next.js payloads.
  return {title,date:blocks[0]||'',image:safeLink(article.find('img').attr('src')),paragraphs:blocks.slice(1),url:safeLink(`/news/${encodeURIComponent(slug)}`)};
}
