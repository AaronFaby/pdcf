import { ROSTER, moveFor, SPECIAL_COST } from '../../engine.mjs';
import { keyName, buttonName } from './bindings.mjs';

const SPECIALS = {
  mickey: 'Steam projectile. Jump over it or guard; travel time depends on distance.',
  minnie: 'Close-range rushing strike. Spend ink after a connected punch to cancel into it.',
  oswald: 'Extended melee uppercut. Spend ink after a connected punch to cancel into it.',
  felix: 'Ink projectile. Jump over it or guard; travel time depends on distance.',
  betty: 'Sound projectile. Jump over it or guard; travel time depends on distance.',
  popeye: 'Restores up to 8 health and boosts melee damage by 50% for 6 seconds. No direct hit.'
};

export function fighterMoves(id, profile) {
  const fighter = ROSTER.find(f => f.id === id);
  if (!fighter) throw new Error('Unknown fighter');
  return ['punch', 'kick', 'throw', 'special'].map(kind => {
    const move = moveFor(fighter, kind), projectile = kind === 'special' && ['mickey', 'felix', 'betty'].includes(id);
    const recoveryStart = kind === 'special' && (projectile || id === 'popeye') ? move.active : move.until;
    const damage = kind === 'special' && id === 'popeye' ? 0 : (projectile ? 17 : move.damage) * fighter.power;
    return {
      kind, name: kind === 'special' ? fighter.special : kind[0].toUpperCase() + kind.slice(1),
      keyboard: keyName(profile.keyboard[kind]), controller: buttonName(profile.buttons[kind]),
      damage: Number(damage.toFixed(2)), startup: Math.ceil(move.active * 60), recovery: Math.ceil((move.duration - recoveryStart + .08) * 60),
      note: kind === 'special' ? `${SPECIAL_COST} ink. ${SPECIALS[id]}` : kind === 'throw' ? 'Close-range grab, lift and toss into a knockdown. Beats guard; misses airborne or stunned opponents.' : kind === 'punch' ? 'Ground or air. A connected punch can cancel into kick or special.' : 'Ground or air. Reaches farther than a punch.'
    };
  });
}
