// src/data/silkroad-repo.ts
import data from '@/assets/data/silkroad.json';

export type RegionKey = 'ontustik' | 'zhetysu' | 'syrdarya' | 'shygys' | 'batys';

export type SilkRoadPlace = {
  id: string;
  name: string;
  regionKey: RegionKey;
  kind: 'қала' | 'қамал' | 'керуен-сарай' | 'асу' | 'қоныс' | 'ескерткіш';
  era?: string;            // мыс: "IX–XII ғғ."
  short?: string;          // қысқа сипаттама
  lat: number;
  lng: number;
  isFeatured?: boolean;    // басты бетке шығару
  tags?: string[];
};

export type SilkRoadRoute = {
  id: string;
  title: string;
  regionKey: RegionKey;
  era?: string;
  short?: string;
  isFeatured?: boolean;
  tags?: string[];
  // карта сызығы үшін
  polyline?: Array<{ lat: number; lng: number }>;
  // байланысқан нүктелер (қаласаң)
  placeIds?: string[];
};

export type SilkRoadDataset = {
  routes: SilkRoadRoute[];
  places: SilkRoadPlace[];
};

function assertDataset(x: any): asserts x is SilkRoadDataset {
  if (!x || typeof x !== 'object') throw new Error('silkroad.json: object емес');
  if (!Array.isArray(x.routes) || !Array.isArray(x.places)) {
    throw new Error('silkroad.json: { routes: [], places: [] } болуы керек');
  }
}

export async function loadSilkRoadDataset(): Promise<SilkRoadDataset> {
  // Қазір — локал JSON. Кейін осы функцияны Firestore/API-ға ауыстырасың.
  assertDataset(data);
  return data as SilkRoadDataset;
}