import {config,json} from '@/lib/cardlane/server';
export async function GET(){return json(config());}
