/**
 * Comprehensive list of wine regions and appellations for autocomplete functionality
 */
export const WINE_REGIONS = [
  // France
  'Bordeaux',
  'Burgundy',
  'Champagne',
  'Loire Valley',
  'Rhône Valley',
  'Alsace',
  'Languedoc',
  'Provence',
  'Beaujolais',
  'Côtes du Rhône',
  'Châteauneuf-du-Pape',
  'Sancerre',
  'Pouilly-Fumé',
  'Chablis',
  'Côte de Nuits',
  'Côte de Beaune',
  'Médoc',
  'Saint-Émilion',
  'Pomerol',
  'Margaux',
  'Saint-Julien',
  'Pauillac',
  'Saint-Estèphe',

  // Italy
  'Tuscany',
  'Piedmont',
  'Veneto',
  'Sicily',
  'Lombardy',
  'Marche',
  'Umbria',
  'Abruzzo',
  'Campania',
  'Puglia',
  'Chianti',
  'Chianti Classico',
  'Brunello di Montalcino',
  'Barolo',
  'Barbaresco',
  'Amarone della Valpolicella',
  'Prosecco',
  'Soave',
  "Montepulciano d'Abruzzo",

  // Spain
  'Rioja',
  'Ribera del Duero',
  'Priorat',
  'Rías Baixas',
  'Penedès',
  'Jerez',
  'La Mancha',
  'Valencia',
  'Catalonia',
  'Galicia',
  'Andalusia',
  'Castilla-La Mancha',
  'Castilla y León',

  // Portugal
  'Douro Valley',
  'Dão',
  'Bairrada',
  'Vinho Verde',
  'Alentejo',
  'Lisbon',
  'Tejo',

  // Germany
  'Mosel',
  'Rheingau',
  'Pfalz',
  'Baden',
  'Württemberg',
  'Nahe',
  'Rheinhessen',
  'Ahr',
  'Mittelrhein',
  'Saale-Unstrut',
  'Sachsen',

  // United States - California
  'Napa Valley',
  'Sonoma County',
  'Paso Robles',
  'Santa Barbara County',
  'Monterey County',
  'San Luis Obispo',
  'Mendocino County',
  'Lake County',
  'Livermore Valley',
  'Santa Cruz Mountains',
  'Russian River Valley',
  'Alexander Valley',
  'Dry Creek Valley',
  'Knights Valley',
  'Carneros',
  'Stags Leap District',
  'Oakville',
  'Rutherford',
  'St. Helena',
  'Calistoga',
  'Diamond Mountain District',
  'Howell Mountain',
  'Mount Veeder',
  'Spring Mountain District',
  'Los Carneros',
  'Chalk Hill',
  'Bennett Valley',
  'Rockpile',
  'Pine Mountain-Cloverdale Peak',

  // United States - Oregon
  'Willamette Valley',
  'Columbia Gorge',
  'Rogue Valley',
  'Umpqua Valley',
  'Walla Walla Valley',
  'McMinnville',
  'Yamhill-Carlton',
  'Dundee Hills',
  'Ribbon Ridge',
  'Chehalem Mountains',
  'Eola-Amity Hills',

  // United States - Washington
  'Columbia Valley',
  'Yakima Valley',
  'Walla Walla Valley',
  'Red Mountain',
  'Horse Heaven Hills',
  'Wahluke Slope',
  'Rattlesnake Hills',
  'Snipes Mountain',
  'Lake Chelan',
  'Naches Heights',

  // United States - New York
  'Finger Lakes',
  'Long Island',
  'Hudson River Region',
  'Champlain Valley',
  'Niagara Escarpment',

  // Australia
  'Barossa Valley',
  'Hunter Valley',
  'McLaren Vale',
  'Coonawarra',
  'Margaret River',
  'Yarra Valley',
  'Clare Valley',
  'Adelaide Hills',
  'Mornington Peninsula',
  'Grampians',
  'Heathcote',
  'Eden Valley',
  'Langhorne Creek',
  'Limestone Coast',
  'Great Southern',
  'Swan Valley',
  'Geographe',
  'Blackwood Valley',
  'Pemberton',

  // New Zealand
  'Marlborough',
  'Central Otago',
  "Hawke's Bay",
  'Martinborough',
  'Gisborne',
  'Nelson',
  'Canterbury',
  'Waipara Valley',
  'Auckland',
  'Northland',

  // South Africa
  'Stellenbosch',
  'Paarl',
  'Franschhoek',
  'Walker Bay',
  'Constantia',
  'Swartland',
  'Elgin',
  'Robertson',
  'Worcester',
  'Tulbagh',

  // Chile
  'Maipo Valley',
  'Casablanca Valley',
  'Colchagua Valley',
  'Aconcagua Valley',
  'San Antonio Valley',
  'Leyda Valley',
  'Limari Valley',
  'Elqui Valley',
  'Choapa Valley',
  'Cachapoal Valley',
  'Curicó Valley',
  'Maule Valley',
  'Itata Valley',
  'Bío Bío Valley',
  'Malleco Valley',

  // Argentina
  'Mendoza',
  'Salta',
  'San Juan',
  'La Rioja',
  'Catamarca',
  'Neuquén',
  'Río Negro',
  'Tupungato',
  'Luján de Cuyo',
  'Maipú',
  'Uco Valley',
  'Cafayate',

  // Canada
  'Okanagan Valley',
  'Niagara Peninsula',
  'Prince Edward County',
  'Fraser Valley',
  'Similkameen Valley',
  'Vancouver Island',
  'Gulf Islands',

  // Austria
  'Wachau',
  'Kremstal',
  'Kamptal',
  'Weinviertel',
  'Burgenland',
  'Steiermark',
  'Wien',

  // Greece
  'Santorini',
  'Nemea',
  'Naoussa',
  'Mantinia',
  'Patras',
  'Cephalonia',
  'Rhodes',
  'Crete',

  // Other Notable Regions
  'Tokaj', // Hungary
  'Eger', // Hungary
  'Villány', // Hungary
  'Valtellina', // Italy (Lombardy)
  'Etna', // Italy (Sicily)
  'Bolgheri', // Italy (Tuscany)
  'Franciacorta', // Italy (Lombardy)
  'Alto Adige', // Italy
  'Friuli-Venezia Giulia', // Italy
  'Aglianico del Vulture', // Italy (Basilicata)
  'Taurasi', // Italy (Campania)
  'Fiano di Avellino', // Italy (Campania)
  'Greco di Tufo', // Italy (Campania)
  'Condrieu', // France (Rhône)
  'Hermitage', // France (Rhône)
  'Côte-Rôtie', // France (Rhône)
  'Gigondas', // France (Rhône)
  'Vacqueyras', // France (Rhône)
  'Muscadet', // France (Loire)
  'Vouvray', // France (Loire)
  'Chinon', // France (Loire)
  'Bourgueil', // France (Loire)
  'Saumur', // France (Loire)
  'Anjou', // France (Loire)
  'Quincy', // France (Loire)
  'Reuilly', // France (Loire)
  'Menetou-Salon', // France (Loire)
] as const;

export type WineRegion = (typeof WINE_REGIONS)[number];
