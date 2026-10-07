import {env} from 'cloudflare:workers';
export function db(){if(!env.DB)throw new Error('Veritabanına şu an ulaşılamıyor.');return env.DB;}
