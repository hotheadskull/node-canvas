export function getDemoData(_pId?: string) {
  const n = (i: number) => `demo-node-${i}`;
  const e = (i: number) => `demo-edge-${i}`;

  const nodes = [
    // --- MASTER & Compile ---
    { id: n(0), type: 'master', label: 'The Chronos Paradox', x: 0, y: -1200, logline: 'A disgraced physicist must race across multiple timelines to stop his future self from erasing their past.', theme: 'Regret and Destiny', audience: 'Sci-Fi Thriller', content: 'Core concept mapping for the novel.' },
    { id: n(1), type: 'print', label: 'Export Manuscript', x: 500, y: -1200, slotCount: 3 },

    // --- GROUPS ---
    { id: n(2), type: 'group', label: 'Characters', x: -1800, y: -800, width: 1000, height: 600 },
    { id: n(3), type: 'group', label: 'Worldbuilding', x: -1800, y: 0, width: 1000, height: 600 },
    { id: n(4), type: 'group', label: 'Act 1: The Accident', x: 0, y: -400, width: 1200, height: 800 },
    { id: n(5), type: 'group', label: 'Act 2: The Wasteland', x: 0, y: 500, width: 1200, height: 800 },

    // --- CHARACTERS ---
    { id: n(6), type: 'character', label: 'Elias Thorne', aliases: 'The Drifter', x: -1750, y: -750, parentId: n(2), content: '<p>A brilliant but broken man haunted by the accident.</p>', arcLie: 'He believes he can fix the past without consequences.', arcTruth: 'He must accept his mistakes to save the future.' },
    { id: n(7), type: 'character', label: 'Dr. Aris (Future Elias)', aliases: 'The Architect', x: -1350, y: -750, parentId: n(2), content: '<p>Cold, calculating. Willing to sacrifice billions for a second chance.</p>', arcLie: 'The ends justify the means.', arcTruth: 'Time cannot be controlled.' },
    { id: n(8), type: 'character', label: 'Lyra', aliases: 'Scavenger 9', x: -1750, y: -450, parentId: n(2), content: '<p>A hardened survivor in 2042 who knows the terrain.</p>', arcLie: 'Trust gets you killed.', arcTruth: 'You need others to survive.' },
    { id: n(9), type: 'character', label: 'Commander Vance', aliases: 'Time Cop', x: -1350, y: -450, parentId: n(2), content: '<p>A zealot dedicated to preserving the timeline at any cost.</p>', arcLie: 'The timeline is sacred and flawless.', arcTruth: 'The timeline is already broken.' },

    // --- WORLDBUILDING (Locations, Lore, Items) ---
    { id: n(10), type: 'location', label: 'Point Zero Facility', x: -1750, y: 50, parentId: n(3), content: '<p>A massive underground particle accelerator in the Swiss Alps where it all started.</p>' },
    { id: n(11), type: 'location', label: 'The Wasteland (2042)', x: -1350, y: 50, parentId: n(3), content: '<p>A scorched earth resulting from the Temporal Shear. Dust, ruins, anomalies.</p>' },
    { id: n(12), type: 'lore', label: 'The Temporal Shear', x: -1750, y: 250, parentId: n(3), content: '<p>A side effect of time travel that causes memories to bleed across timelines, driving unprotected travelers mad.</p>' },
    { id: n(13), type: 'lore', label: 'The Grandfather Clause', x: -1350, y: 250, parentId: n(3), content: '<p>Universal law: If a paradox is forced, the universe quarantines the timeline, destroying it.</p>' },
    { id: n(14), type: 'item', label: 'The Chronometer', x: -1750, y: 450, parentId: n(3), content: '<p>A wrist-mounted device that anchors a person to their original timeline, protecting against the Shear.</p>' },
    { id: n(15), type: 'item', label: 'Paradox Battery', x: -1350, y: 450, parentId: n(3), content: '<p>Highly unstable fuel source needed for a jump.</p>' },

    // --- LOGIC & CRUCIBLES (Mechanics) ---
    { id: n(16), type: 'logic', label: 'Paradox Rules', x: -1800, y: 700, premises: ['If Elias dies before 2042, Aris never exists.', 'If Aris never exists, he cannot go back to kill Elias.'], conclusion: 'The universe will violently reset if Aris kills Elias directly.' },
    { id: n(17), type: 'crucible', label: 'The Final Paradox', x: -1400, y: 700, slotCount: 2, participantData: {'slot-1': 'Elias: Wants to destroy the machine at all costs.', 'slot-2': 'Aris: Needs the machine to save his family.'}, resolution: 'Elias breaks the battery, trapping them both but saving the timeline.' },
    { id: n(18), type: 'crucible', label: 'The Alley Ambush', x: -950, y: 700, slotCount: 2, participantData: {'slot-1': 'Lyra: Wants to rob Elias for his tech.', 'slot-2': 'Vance: Wants to execute Lyra for timeline interference.'}, resolution: 'Elias uses the Chronometer to freeze Vance temporarily, and Lyra helps him escape.' },

    // --- ACT 1: THE ACCIDENT ---
    { id: n(19), type: 'hub', label: 'Act 1 Nexus', x: 50, y: -350, parentId: n(4) },
    { id: n(20), type: 'document', label: 'Chapter 1: Ground Zero', x: 50, y: -150, parentId: n(4), content: '<p>The day the world broke.</p>' },
    { id: n(21), type: 'scene', label: 'Scene 1.1: The Calibration', x: -350, y: 150, parentId: n(4), content: '<p>Elias is prepping the machine. Warnings go off.</p>' },
    { id: n(22), type: 'scene', label: 'Scene 1.2: The Overload', x: 50, y: 150, parentId: n(4), content: '<p>Aris appears from a portal and sabotages the reactor.</p>' },
    { id: n(23), type: 'scene', label: 'Scene 1.3: The Jump', x: 450, y: 150, parentId: n(4), content: '<p>Elias grabs the prototype Chronometer and jumps blindly just as the facility explodes.</p>', manuscript: "The shockwave hit the glass. Elias didn't think, he just slammed his fist on the chronometer's activator. The world didn't go black, it went painfully, blindingly white." },

    // --- ACT 2: THE WASTELAND ---
    { id: n(24), type: 'hub', label: 'Act 2 Nexus', x: 50, y: 550, parentId: n(5) },
    { id: n(25), type: 'document', label: 'Chapter 2: The Ash', x: 50, y: 750, parentId: n(5), content: '<p>Elias navigates the future he caused.</p>' },
    { id: n(26), type: 'scene', label: 'Scene 2.1: Arrival', x: -350, y: 1050, parentId: n(5), content: '<p>Elias wakes up in a ruined Switzerland. He is ambushed by scavengers.</p>' },
    { id: n(27), type: 'scene', label: 'Scene 2.2: Lyra', x: 50, y: 1050, parentId: n(5), content: '<p>Lyra saves Elias from the scavengers, demanding the chronometer as payment.</p>' },
    { id: n(28), type: 'scene', label: 'Scene 2.3: The Time Cop', x: 450, y: 1050, parentId: n(5), content: '<p>Vance arrives to arrest Elias. Crucible results inserted here.</p>' },

    // --- SEQUENCES, TASKS, DECKS ---
    { id: n(29), type: 'sequence', label: 'Act 1 Beats', x: 1400, y: -400, beats: [{id: 'b1', title: 'Hook', subtitle: 'Calibration'}, {id: 'b2', title: 'Inciting Incident', subtitle: 'Aris arrives'}, {id: 'b3', title: 'Plot Point 1', subtitle: 'The Jump'}] },
    { id: n(30), type: 'sequence', label: 'Act 2 Beats', x: 1400, y: 500, beats: [{id: 'b4', title: 'Reaction', subtitle: 'Arrival in 2042'}, {id: 'b5', title: 'Ally', subtitle: 'Meet Lyra'}, {id: 'b6', title: 'Midpoint', subtitle: 'The Vault Heist'}] },
    { id: n(31), type: 'task', label: 'Writing To-Do', x: 1400, y: -800, tasks: [{label: 'Flesh out Lyra backstory', completed: false}, {label: 'Draft Chapter 1.3', completed: true}, {label: 'Fix pacing in Scene 2.1', completed: false}, {label: 'Check paradox logic', completed: false}] },
    { id: n(32), type: 'deck', label: 'Brainstorming', x: 1800, y: -800, cards: [{label: 'Is Vance a cyborg?', content: 'Maybe just augmented eyes to see time anomalies.'}, {label: 'Ending twist', content: 'What if Lyra is Elias from another timeline? No, too messy.'}] },
    { id: n(33), type: 'quote', label: 'Quote: The Circle', x: 1400, y: 0, content: '<p>"Time is not a line, it is a circle. And we are all trapped on the rim."</p>' },
    { id: n(34), type: 'quote', label: 'Quote: Regret', x: 1400, y: 900, content: '<p>"The only thing heavier than the past is the future you ruined."</p>' },
    { id: n(35), type: 'alias', label: 'Alias: Scavenger 9', targetId: n(8), x: -2100, y: -450 },
    { id: n(36), type: 'alias', label: 'Alias: Time Cop', targetId: n(9), x: -2100, y: -300 },
  ];

  const edges = [
    // Compile connections
    { id: e(1), source: n(20), target: n(1), sourceHandle: 'right', targetHandle: 'in-1', type: 'smoothstep' },
    { id: e(2), source: n(25), target: n(1), sourceHandle: 'right', targetHandle: 'in-2', type: 'smoothstep' },

    // Hub connections Act 1
    { id: e(3), source: n(19), target: n(20), type: 'smoothstep' },
    { id: e(4), source: n(20), target: n(21), type: 'smoothstep' },
    { id: e(5), source: n(20), target: n(22), type: 'smoothstep' },
    { id: e(6), source: n(20), target: n(23), type: 'smoothstep' },

    // Hub connections Act 2
    { id: e(7), source: n(24), target: n(25), type: 'smoothstep' },
    { id: e(8), source: n(25), target: n(26), type: 'smoothstep' },
    { id: e(9), source: n(25), target: n(27), type: 'smoothstep' },
    { id: e(10), source: n(25), target: n(28), type: 'smoothstep' },

    // Character to Scene connections (References / Appearances)
    { id: e(11), source: n(6), target: n(21), label: 'Stars in', type: 'smoothstep' },
    { id: e(12), source: n(7), target: n(22), label: 'Attacks', type: 'smoothstep', style: { stroke: '#f87171' } },
    { id: e(13), source: n(8), target: n(27), label: 'Introduced', type: 'smoothstep' },
    { id: e(14), source: n(9), target: n(28), label: 'Arrests', type: 'smoothstep', style: { stroke: '#f87171' } },

    // Worldbuilding to Scene connections
    { id: e(15), source: n(10), target: n(21), label: 'Setting', type: 'smoothstep' },
    { id: e(16), source: n(11), target: n(26), label: 'Setting', type: 'smoothstep' },
    { id: e(17), source: n(14), target: n(23), label: 'Used to jump', type: 'smoothstep' },
    { id: e(18), source: n(12), target: n(26), label: 'Affects Elias', type: 'smoothstep' },

    // Crucible to Scene
    { id: e(19), source: n(17), target: n(22), sourceHandle: 'out', label: 'Generates Scene 1.2 conflict', type: 'smoothstep', style: { stroke: '#fbbf24', strokeWidth: 2 } },
    { id: e(20), source: n(18), target: n(28), sourceHandle: 'out', label: 'Generates Scene 2.3 conflict', type: 'smoothstep', style: { stroke: '#fbbf24', strokeWidth: 2 } },

    // Logic connections
    { id: e(21), source: n(16), target: n(7), label: 'Constrains', type: 'smoothstep', style: { stroke: '#a78bfa' } },
    { id: e(22), source: n(16), target: n(13), label: 'Based on', type: 'smoothstep', style: { stroke: '#a78bfa' } },
    
    // Master to Hubs
    { id: e(23), source: n(0), target: n(19), type: 'smoothstep', style: { stroke: '#34d399' } },
    { id: e(24), source: n(0), target: n(24), type: 'smoothstep', style: { stroke: '#34d399' } },
  ];

  return { nodes, edges };
}
