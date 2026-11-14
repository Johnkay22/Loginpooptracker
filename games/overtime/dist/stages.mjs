// Survive the waves, then defeat one pursuing executive boss. Perks persist between runs.
export const STAGES = [
  {id: 1, name: 'Office Floor', subtitle: 'Give management a bad day.',
   briefing: 'Corporate is planning to cut paid bathroom breaks. Survive the office swarm for 3 minutes, then defeat the executive boss to stop the plan advancing.',
   survival: 180, bossName: 'THE FLOOR MANAGER', bossHP: 14000, bossSpeed: 85, slamRadius: 100, slamCooldown: 4,
   clear: 'Executive defeated. The office is clear. Take the fight to the corporate lobby.'},
  {id: 2, name: 'Corporate Lobby', subtitle: 'Take on upper management.',
   briefing: 'The lobby director is backing the proposed bathroom policy. Survive the swarm for 3 minutes, then defeat the director to clear the lobby.',
   survival: 180, bossName: 'THE LOBBY DIRECTOR', bossHP: 18000, bossSpeed: 95, slamRadius: 125, slamCooldown: 3.4,
   clear: 'Lobby director defeated. Both playable stages are clear. The executive floor is planned for a future update.'}
];
// Build 19: survival mode. Endless run on the Office Floor map; time survived is the score. It is not in STAGES
// because it has no finish line. MODES is what the menu lists.
export const SURVIVAL_ID = 10;
export const SURVIVAL_STAGE = {id: SURVIVAL_ID, endless: true, map: 1, name: 'Survival of the Shittest', subtitle: 'How long can you last?',
   briefing: 'Corporate cancelled the end of your shift. There is no finish line: the office gets tougher every 3 minutes and a boss clocks in each time. Knock out executives for briefcases, and last as long as you can.',
   survival: 180, bossName: 'THE FLOOR MANAGER', bossHP: 8000, bossSpeed: 85, slamRadius: 100, slamCooldown: 4, clear: ''};
export const MODES = [...STAGES, SURVIVAL_STAGE];
export function stageFor(id) { return MODES.find(s => s.id === id) || STAGES[0]; }
export function canPlayStage(profile, id) { return id === 1 || id === SURVIVAL_ID || id === 2 && (profile.clearedStages || []).includes(1); }
export function resultTitle(game) { return game.state === 'won' ? 'Boss defeated. Stage clear.' : 'Herman was overwhelmed.'; }
