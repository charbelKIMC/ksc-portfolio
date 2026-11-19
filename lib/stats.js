// Statistiques de visite et journal des connexions, pour le tableau de bord de l'admin.
// Une visite = une page vue. Rien ne permet d'identifier un visiteur : pas de cookie, pas d'IP enregistrée.
import { createHash } from 'node:crypto';
import { query } from './db.js';
import { clientIp } from './auth.js';

const PAGE = /^\/(tous-les-projets|projets\/[a-z0-9-]+)?$/;
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|monitor|curl|wget|python|node-fetch/i;

export function deviceOf(userAgent) {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(userAgent)) return 'tablet';
  if (/mobi|iphone|android/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

// Domaine du site d'origine, sans le reste de l'adresse ; null pour un accès direct ou depuis le site lui-même
export function referrerOf(referrer, host) {
  try {
    const name = new URL(referrer).hostname.replace(/^www\./, '');
    return name && name !== String(host || '').replace(/^www\./, '').split(':')[0] ? name : null;
  } catch {
    return null;
  }
}

// Empreinte du jour : la même personne compte pour un visiteur dans la journée, et ne peut pas être suivie d'un jour à l'autre
function visitorOf(req) {
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256')
    .update(`${day}|${clientIp(req)}|${req.headers['user-agent'] || ''}|${process.env.JWT_SECRET || ''}`)
    .digest('hex').slice(0, 16);
}

// Enregistre une page vue. Renvoie false si elle est ignorée (robot, page inconnue).
export async function recordView(req, { path, referrer }) {
  const userAgent = String(req.headers['user-agent'] || '');
  if (!userAgent || BOT.test(userAgent)) return false;
  const page = String(path || '').replace(/\/+$/, '') || '/';
  if (page.length > 120 || !PAGE.test(page)) return false;
  const country = String(req.headers['x-vercel-ip-country'] || '').slice(0, 2).toUpperCase() || null;
  await query('insert into page_views (path, referrer, country, device, visitor) values ($1, $2, $3, $4, $5)',
    [page, referrerOf(referrer, req.headers.host), country, deviceOf(userAgent), visitorOf(req)]);
  if (Math.random() < 0.02) await query("delete from page_views where created_at < now() - interval '13 months'");
  return true;
}

const top = (column, days, label) => query(
  `select coalesce(${column}, '${label}') as name, count(*)::int as views from page_views
   where created_at > now() - make_interval(days => $1) group by 1 order by 2 desc, 1 limit 6`, [days]);

export async function getActivity(days = 30) {
  const [[totals], perDay, pages, sources, countries, devices, logins, failures, [failed]] = await Promise.all([
    query(`select count(*)::int as views, count(distinct visitor || to_char(created_at, 'YYYY-MM-DD'))::int as visitors
           from page_views where created_at > now() - make_interval(days => $1)`, [days]),
    query(`select to_char(created_at, 'YYYY-MM-DD') as day, count(*)::int as views,
                  count(distinct visitor)::int as visitors
           from page_views where created_at > now() - make_interval(days => $1) group by 1 order by 1`, [days]),
    top('path', days, '/'),
    top('referrer', days, 'Accès direct'),
    top('country', days, 'Inconnu'),
    query(`select device as name, count(*)::int as views from page_views
           where created_at > now() - make_interval(days => $1) group by 1 order by 2 desc`, [days]),
    query('select created_at, ip, user_agent from login_log where success order by created_at desc limit 8'),
    query('select created_at, ip, user_agent from login_log where not success order by created_at desc limit 8'),
    query(`select count(*)::int as n from login_log where not success and created_at > now() - make_interval(days => $1)`, [days])
  ]);

  // Une entrée par jour, même sans visite, pour le graphique
  const byDay = Object.fromEntries(perDay.map(d => [d.day, d]));
  const series = Array.from({ length: days }, (_, i) => {
    const day = new Date(Date.now() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return { day, views: byDay[day]?.views ?? 0, visitors: byDay[day]?.visitors ?? 0 };
  });

  const when = rows => rows.map(r => ({ at: new Date(r.created_at).toISOString(), ip: r.ip, userAgent: r.user_agent }));
  return {
    days,
    visits: { ...totals, series, pages, sources, countries, devices },
    logins: when(logins),
    failures: { count: failed.n, recent: when(failures) }
  };
}
