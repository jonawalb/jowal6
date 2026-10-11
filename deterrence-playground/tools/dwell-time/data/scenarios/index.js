// The scenarios, in menu order.
import helpdesk from './helpdesk.js';
import preposition from './preposition.js';
import supply from './supply.js';
import insider from './insider.js';
import cloud from './cloud.js';

export const SCENARIOS = [helpdesk, preposition, supply, insider, cloud];
export const scenarioById = id => SCENARIOS.find(s => s.id === id) || SCENARIOS[0];
