const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',       // Replace with your PostgreSQL username
  host: 'localhost',
  database: 'cam_admin',
  password: '123', // Replace with your password
  port: 5432,
});

const points = [
  { name: 'Société Nationale des Hydrocarbures (SNH)', lat: 3.902850583117103, lon: 11.51791780906231 },
  { name: 'Secrétariat Général des Services du Premier Ministre (SGPM)', lat: 3.865703489091801, lon: 11.51456575139042 },
  { name: 'Ministère de l’Administration Territoriale (MINAT)', lat: 3.860995767905557, lon: 11.514764222554476 },
  { name: 'Bureau National de l’Etat Civil (BUNEC)', lat: 3.887109820679129, lon: 11.507954463297992 },
  { name: 'Elections Cameroon (ELECAM)', lat: 3.863725985164394, lon: 11.513089805359568 },
  { name: 'Conseil Régional de l’Adamaoua', lat: 7.333267991073225, lon: 13.574414947710089 },
  { name: 'Conseil Régional du Centre', lat: 3.875796447695875, lon: 11.515729396392425 },
  { name: 'Conseil Régional de l’Est', lat: 4.580540370527119, lon: 13.675502551393185 },
  { name: 'Conseil Régional de l’Extrême-Nord', lat: 10.588234733963784, lon: 14.297231995566296 },
  { name: 'Conseil Régional du Littoral', lat: 4.041683845516269, lon: 9.685235663031929 },
  { name: 'Conseil Régional du Nord', lat: 9.323363397981124, lon: 13.393431346953387 },
  { name: 'Conseil Régional de l’Ouest', lat: 5.680639672534965, lon: 11.28484076883229 },
  { name: 'Conseil Régional du Sud', lat: 2.9208445248465082, lon: 11.146502437895943 },
  { name: 'Ministère des Affaires Sociales (MINAS)', lat: 3.861085896161144, lon: 11.51549917939658 },
  { name: 'Centre National de Réhabilitation des Personnes Handicapées Cardinal Paul Emile LEGER (CNRPH)', lat: 3.8646168018720797, lon: 11.490817324437796 },
  { name: 'Ministère de l’Agriculture et du Développement Rural (MINADER)', lat: 3.8615847901872264, lon: 11.514729107210854 },
  { name: 'Cameroon Development Corporation (CDC)', lat: 4.511137562048416, lon: 9.011689068385408 },
  { name: 'Centre National d\'Etudes et d\'Expérimentation du Machinisme Agricole (CENEEMA)', lat: 3.876369677662358, lon: 11.455099551390454 },
  { name: 'Fonds de Développement des Filières Cacao Et Café (FODECC)', lat: 3.897290396766304, lon: 11.50206583789817 },
  { name: 'Office Céréalier du Cameroun', lat: 9.308280442087888, lon: 13.394033549584403 },
  { name: 'Société d\'Expansion et de Modernisation de la Riziculture de Yagoua (SEMRY)', lat: 10.348963547345129, lon: 15.243714937958433 },
  { name: 'Société de Développement du Cacao (SODECAO)', lat: 3.8358893969949976, lon: 11.516392109062124 },
  { name: 'Unité de Traitements Agricoles par Voie Aérienne (UTAVA)', lat: 4.0875097885989, lon: 9.356627056778416 }
];

async function insertPoints() {
  for (const point of points) {
    const query = {
      text: 'INSERT INTO admin_points (name, geom) VALUES ($1, ST_GeomFromText($2, 4326))',
      values: [point.name, `POINT(${point.lon} ${point.lat})`]  // Note: PostGIS expects lon lat order
    };
    try {
      await pool.query(query);
      console.log(`Inserted: ${point.name}`);
    } catch (error) {
      console.error(`Error inserting ${point.name}:`, error);
    }
  }
  pool.end();
}

insertPoints();