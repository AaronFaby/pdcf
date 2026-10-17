import { ROSTER, CPU_DIFFICULTIES, createMatch } from '../../engine.mjs';

export const ARCADE_KEY = 'pdcf-arcade-v1';
export const ENDINGS = {
  mickey: {
    title: 'All aboard the encore',
    story: [
      'With the harbor crown perched on his cap, Mickey finally has enough prize money to get the old tugboat moving. He polishes the whistle, patches the boiler, and paints six names on the crew list.',
      'At sunrise, every rival is aboard. Minnie conducts the band, Popeye takes the wheel, and Mickey discovers that a full boat makes a much bigger splash than a trophy. The first voyage is on the house.'
    ],
    closing: 'A little mouse. A whole harbor of possibilities.'
  },
  minnie: {
    title: 'The star takes her bow',
    story: [
      'Minnie trades the championship purse for a battered waterfront theater. One broom, two buckets of paint, and a very determined Charleston later, the marquee shines again.',
      'Opening night sells out before the orchestra can tune. Her former opponents line up as the chorus, but the final spotlight belongs to Minnie. She tips her flowered hat and takes the bow she earned.'
    ],
    closing: 'Her name goes above the title.'
  },
  oswald: {
    title: 'Make your own luck',
    story: [
      'Everyone calls Oswald the luckiest rabbit on the pier. Then the projector breaks just before his victory cartoon, and the whole town turns to look at those famous ears.',
      'Oswald rolls up his sleeves, joins the torn film, and gives the crank a mighty turn. The picture flickers back to life. Lucky? Perhaps. But this time, the applause is for a rabbit who made it happen.'
    ],
    closing: 'The lucky one writes his own next reel.'
  },
  felix: {
    title: 'The last laugh',
    story: [
      'Felix sets his trophy on the pier and accidentally knocks it into an inkwell. Out comes a door. Behind the door is another pier, another moon, and an audience waiting for the punch line.',
      'He draws a ticket booth on thin air and charges exactly one grin for admission. By midnight, the entire harbor is laughing on the other side of the moon. Felix pockets the door before anyone asks how.'
    ],
    closing: 'Every ending needs one more trick.'
  },
  betty: {
    title: 'The harbor wants an encore',
    story: [
      'Betty spends her winnings on a bandstand big enough for the whole waterfront. The dockworkers bring drums, the tugboats supply whistles, and the fish market closes early for rehearsal.',
      'When Betty steps up to the microphone, the harbor finds a rhythm all its own. Even her rivals join the chorus. The crown can wait on the piano; tonight, the champion has a show to put on.'
    ],
    closing: 'One knockout performance deserves another.'
  },
  popeye: {
    title: 'Strong enough to share',
    story: [
      'Popeye could buy a shiny new boat with the prize money. Instead, he buys lumber for the broken pier, a stove for the dockside kitchen, and enough spinach to feed a very hungry neighborhood.',
      'By supper, the pier is standing and every chair is taken. His old rivals raise their bowls to the harbor champion. Popeye grins around his pipe: a good right hook is useful, but a helping hand lasts longer.'
    ],
    closing: 'Strong to the finish. Plenty to go around.'
  }
};

export function createArcade(fighter, difficulty = 'normal', random = Math.random) {
  if (!ROSTER.some(f => f.id === fighter)) throw new Error('Unknown arcade fighter');
  if (!Object.hasOwn(CPU_DIFFICULTIES, difficulty)) throw new Error('Unknown arcade difficulty');
  const ladder = ROSTER.filter(f => f.id !== fighter).map(f => f.id);
  for (let i = ladder.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ladder[i], ladder[j]] = [ladder[j], ladder[i]];
  }
  ladder.push(fighter);
  return { version: 1, fighter, difficulty, ladder, index: 0, losses: 0, attempts: 0, status: 'ready' };
}

export function arcadeMatch(run) {
  if (!['ready', 'lost'].includes(run.status) || run.index >= 6) return null;
  run.status = 'fighting'; run.attempts++;
  const match = createMatch(run.fighter, run.ladder[run.index], 'arcade', run.difficulty);
  match.arcadeStage = run.index; match.arcadeAttempt = run.attempts;
  return match;
}

export function finishArcade(run, match) {
  if (run.status !== 'fighting' || match.phase !== 'matchover' || match.mode !== 'arcade' || match.arcadeAttempt !== run.attempts || match.arcadeStage !== run.index || match.fighters[0].id !== run.fighter || match.fighters[1].id !== run.ladder[run.index] || ![0, 1].includes(match.winner)) return false;
  if (match.winner === 0) { run.index++; run.status = run.index === 6 ? 'complete' : 'ready'; }
  else { run.losses++; run.status = 'lost'; }
  return true;
}

export function restoreArcade(value) {
  if (!value || value.version !== 1 || !ROSTER.some(f => f.id === value.fighter) || !Object.hasOwn(CPU_DIFFICULTIES, value.difficulty)) return null;
  const { fighter, difficulty, ladder, index, losses, attempts, status } = value;
  if (!Array.isArray(ladder) || ladder.length !== 6 || new Set(ladder).size !== 6 || !ROSTER.every(f => ladder.includes(f.id)) || ladder[5] !== fighter) return null;
  if (![index, losses, attempts].every(Number.isSafeInteger) || index < 0 || index > 6 || losses < 0 || losses > 1000000 || attempts < index + losses || attempts > 1000000) return null;
  if (!['ready', 'fighting', 'lost', 'complete'].includes(status) || (status === 'complete') !== (index === 6) || (status === 'lost' && losses === 0)) return null;
  return { version: 1, fighter, difficulty, ladder: [...ladder], index, losses, attempts, status: status === 'fighting' ? 'ready' : status };
}
