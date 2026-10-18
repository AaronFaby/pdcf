export const STAGES = [
  { id: 'ink-harbor', name: 'Ink Harbor', image: './assets/ink-harbor.png', music: 'Ink Harbor Stomp', tempo: 144, beats: 4, description: 'Tugboats, drifting steam, and waterfront swing.', tagline: 'THE WATERFRONT WILL NEVER BE THE SAME.' },
  { id: 'silverscreen-theater', name: 'Silverscreen Theater', image: './assets/stages/silverscreen-theater.png', music: 'Footlight Foxtrot', tempo: 128, beats: 4, description: 'Swaying curtains, sweeping spotlights, and stride-piano foxtrot.', tagline: 'TONIGHT’S HEADLINERS PULL NO PUNCHES.' },
  { id: 'moonlight-midway', name: 'Moonlight Midway', image: './assets/stages/moonlight-midway.png', music: 'Carousel Capers', tempo: 156, beats: 3, description: 'A turning Ferris wheel, bobbing balloons, and a calliope waltz.', tagline: 'STEP RIGHT UP. PUT ’EM UP.' },
  { id: 'midnight-junction', name: 'Midnight Junction', image: './assets/stages/midnight-junction.png', music: 'Midnight Rail Shuffle', tempo: 168, beats: 4, description: 'A passing night train, curling steam, and driving railway jazz.', tagline: 'NEXT STOP: A KNOCKOUT.' }
];

export function stageFor(id) { return STAGES.find(stage => stage.id === id) || STAGES[0]; }

// Derived from bout index so existing v1 checkpoints keep their progress unchanged.
export function arcadeVenue(index) { return STAGES[[0, 1, 2, 3, 1, 0][index] ?? 0]; }
