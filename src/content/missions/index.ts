import type { Mission } from '../../missions/types';
import { CHAPTER_0 } from './c00';
import { CHAPTER_1 } from './c01';
import { CHAPTER_2 } from './c02';
import { CHAPTER_3 } from './c03';
import { CHAPTER_4 } from './c04';
import { CHAPTER_5 } from './c05';
import { CHAPTER_6 } from './c06';
import { CHAPTER_7 } from './c07';

/** All playable missions in play order. Add a chapter by importing its file here. */
export const MISSIONS: Mission[] = [...CHAPTER_0, ...CHAPTER_1, ...CHAPTER_2, ...CHAPTER_3, ...CHAPTER_4, ...CHAPTER_5, ...CHAPTER_6, ...CHAPTER_7];

export const missionById = (id: string) => MISSIONS.find((m) => m.id === id);

export const missionsOfChapter = (chapter: number) => MISSIONS.filter((m) => m.chapter === chapter);
