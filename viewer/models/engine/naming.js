export const NAME_MAP = {
  'Object_2':  'Engine Block',
  'Object_3':  'Cylinder Head',
  'Object_4':  'Front Engine Cover',
  'Object_5':  'Crankcase Housing',
  'Object_6':  'Side Engine Bracket',

  'Object_10': 'Turbocharger',
  'Object_11': 'Turbo Outlet Pipe',
  'Object_12': 'Intercooler Feed Pipe',
  'Object_13': 'Intake Manifold',
  'Object_14': 'Air Inlet Pipe',

  'Object_15': 'Exhaust Manifold',
  'Object_16': 'Downpipe',
  'Object_17': 'EGR Pipe',
  'Object_18': 'Heat Shield',

  'Object_19':   'Fuel Rail',
  'Object_20':   'Oil Filter Housing',
  'Object_21':   'Fuel Pump',
  'Object_22':   'Oil Pan Cover',
  'Object_23':   'Oil Return Pipe',
  'Object_2001': 'Bolt Assembly',

  'Object_24': 'Water Pump',
  'Object_25': 'Coolant Pipe',
  'Object_26': 'Thermostat Housing',

  'Object_27':   'Crankshaft Pulley',
  'Object_28':   'Timing Belt Pulley',
  'Object_29':   'Tensioner Pulley',
  'Object_30':   'Accessory Bracket',
  'Object_6001': 'Pulley Component',

  'Object_22001': 'Small Pipe Section',
  'Object_22002': 'Small Pipe Section',
  'Object_23001': 'Pipe Connector',
  'Object_23002': 'Pipe Connector',

  default: 'Engine Component',
};

export const PART_INFO = {
  'Engine Block':
    'Main structural body of the engine that houses the cylinders and coolant channels.',
  'Cylinder Head':
    'Upper part of the engine containing valves, injectors and combustion chambers.',
  'Front Engine Cover':
    'Protective cover for timing components and front accessories.',
  'Crankcase Housing':
    'Lower engine housing that supports the crankshaft and lubrication system.',
  'Side Engine Bracket':
    'Structural bracket used for mounting the engine and accessories.',

  'Turbocharger':
    'Forced-induction device that increases power by compressing intake air.',
  'Turbo Outlet Pipe':
    'Carries compressed air from the turbocharger to the intake system.',
  'Intercooler Feed Pipe':
    'Delivers compressed air to the intercooler to reduce temperature.',
  'Intake Manifold':
    'Distributes intake air evenly to all cylinders.',
  'Air Inlet Pipe':
    'Channels filtered air to the turbocharger.',

  'Exhaust Manifold':
    'Collects exhaust gases from cylinders and routes them towards the turbo.',
  'Downpipe':
    'Leads exhaust gases from the turbo to the exhaust system.',
  'EGR Pipe':
    'Recirculates a portion of exhaust gases to reduce emissions.',
  'Heat Shield':
    'Protects surrounding components from high exhaust temperatures.',

  'Fuel Rail':
    'High-pressure rail that feeds fuel injectors.',
  'Fuel Pump':
    'Pumps fuel from the tank and supplies it to the high-pressure system.',
  'Oil Filter Housing':
    'Mounts the oil filter and directs engine oil flow through it.',
  'Oil Pan Cover':
    'Lower cover that seals and protects the engine oil reservoir.',
  'Oil Return Pipe':
    'Returns oil from components such as the turbo back to the sump.',
  'Bolt Assembly':
    'Structural bolt group used to fasten engine components.',

  'Water Pump':
    'Circulates coolant through the engine and radiator.',
  'Coolant Pipe':
    'Carries coolant between the engine, radiator and auxiliary systems.',
  'Thermostat Housing':
    'Holds the thermostat and controls coolant flow based on temperature.',

  'Crankshaft Pulley':
    'Drives the belt system connected to engine accessories.',
  'Timing Belt Pulley':
    'Synchronises crankshaft and camshaft movement.',
  'Tensioner Pulley':
    'Maintains correct belt tension for reliable operation.',
  'Accessory Bracket':
    'Mounting bracket for alternator, pumps and other accessories.',
  'Pulley Component':
    'Individual element of the pulley or belt drive system.',

  'Small Pipe Section':
    'Short connector pipe within the fuel, oil or coolant system.',
  'Pipe Connector':
    'Connects two pipe segments or hoses together.',

  'Engine Component':
    'Mechanical component of the AlphaWave engine assembly.',
};

function aiGuessName(mesh) {
  const n = mesh.name?.toLowerCase?.() || '';
  if (n.includes('filter'))  return 'Filter';
  if (n.includes('pump'))    return 'Pump';
  if (n.includes('pipe'))    return 'Pipe';
  if (n.includes('gear'))    return 'Gear';
  if (n.includes('cover'))   return 'Cover';
  return 'Engine Component';
}

export function getNiceName(mesh) {
  if (NAME_MAP[mesh.name]) return NAME_MAP[mesh.name];

  const guess = aiGuessName(mesh);
  if (guess) return guess;

  return NAME_MAP.default || 'Engine Component';
}
