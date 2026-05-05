// Israel gushim (regions/districts) list
export const ISRAEL_GUSHIM = [
  "abugosh",
  "abusnan",
  "afula",
  "ako",
  "albatuf",
  "alkasum",
  "alona",
  "arabe",
  "arad",
  "arara",
  "ararabanegev",
  "ariel",
  "ashdod",
  "ashkelon",
  "azor",
  "baana",
  "bakaalrarbiya",
  "basma",
  "basmattivon",
  "batyam",
  "beersheva",
  "beertuvya",
  "beeryaakov",
  "beitdagan",
  "beitjan",
  "beitshean",
  "beitshemesh",
  "binyaminagivatada",
  "biralmaksur",
  "bneiayish",
  "bneiberak",
  "bneishimon",
  "brener",
  "bueynenujidat",
  "bukata",
  "bustanalmarj",
  "daburiya",
  "daliatalcarmel",
  "deirhana",
  "dhafir",
  "dimona",
  "diralasad",
  "dromhasharon",
  "eilat",
  "elad",
  "elyahin",
  "emekhamaayanot",
  "emekhayarden",
  "emekhefer",
  "emeklod",
  "emekyizrael",
  "eshkol",
  "evenyehuda",
  "eynkinya",
  "eynmahel",
  "fasuta",
  "furaydis",
  "galiltahton",
  "ganeitikva",
  "ganrave",
  "ganyavne",
  "gderot",
  "gedera",
  "gezer",
  "givataiim",
  "givatshemuel",
  "golan",
  "haaravahatihona",
  "hadera",
  "hagalilhaelyon",
  "hagilboa",
  "haifa",
  "harish",
  "hatsorhaglilit",
  "herzliya",
  "heveleielot",
  "hevelmodiin",
  "hevelyavne",
  "hodhasharon",
  "hofashkelon",
  "hofhacarmel",
  "hofhasharon",
  "holon",
  "hura",
  "hurfeish",
  "ieblin",
  "iksal",
  "ilabun",
  "ilut",
  "jaljulya",
  "jat",
  "jdeydemaker",
  "jerusalem",
  "jiserazarka",
  "jish",
  "julis",
  "kaabiyatabashhajajre",
  "kabul",
  "kadimatsoran",
  "kalanswa",
  "karmiel",
  "katserin",
  "kawkababualhija",
  "kefarbara",
  "kefarkama",
  "kefarkana",
  "kefarkara",
  "kefarkasem",
  "kefarmanda",
  "kefarsaba",
  "kefarshmaryahu",
  "kefartavor",
  "kefarveradim",
  "kefaryasif",
  "kefaryona",
  "kiryatarba",
  "kiryatata",
  "kiryatbiyalik",
  "kiryatekron",
  "kiryatgat",
  "kiryatmalahi",
  "kiryatmotskin",
  "kiryatono",
  "kiryatshmona",
  "kiryattivon",
  "kiryatyam",
  "kiryatyearim",
  "kisrahsmia",
  "kohavyair",
  "kseyfe",
  "lahish",
  "lakiye",
  "lehavim",
  "levhasharon",
  "lod",
  "maaleiron",
  "maaleyosef",
  "maalottarshiha",
  "majdalkerum",
  "majdelshams",
  "masade",
  "mateasher",
  "mateyehuda",
  "mazkeretbatya",
  "mazraa",
  "megido",
  "meitar",
  "menashe",
  "merar",
  "merhavim",
  "meromhagalil",
  "metula",
  "mevaserettsiyon",
  "mevoothahermon",
  "migdal",
  "migdalhaemek",
  "migdaltefen",
  "miilya",
  "misgav",
  "mishad",
  "mitsperamon",
  "modiin",
  "nahalsorek",
  "nahariya",
  "nahef",
  "natsrat",
  "natsratilit",
  "neothovav",
  "nesher",
  "nestsiyona",
  "netanya",
  "netivot",
  "nevemidbar",
  "ofakim",
  "omer",
  "orakiva",
  "oryehuda",
  "osfiya",
  "pardeshanakarkur",
  "pardesiya",
  "petahtikva",
  "pkiin",
  "raanana",
  "rahat",
  "ramatgan",
  "ramathasharon",
  "ramatnegev",
  "ramatyishay",
  "rame",
  "ramla",
  "rehasim",
  "rehovot",
  "reyne",
  "rishon",
  "roshhaayin",
  "roshpina",
  "sahnin",
  "sajur",
  "savyon",
  "sderot",
  "sdotnegev",
  "segevshalom",
  "shaab",
  "shaarhanegev",
  "shelomi",
  "shfaram",
  "shibliumalranem",
  "shoham",
  "tamar",
  "tamra",
  "taybe",
  "telavivyafo",
  "telmond",
  "telsheva",
  "tira",
  "tiratkarmel",
  "tsefat",
  "tubazangariya",
  "turan",
  "tveria",
  "umalfahem",
  "yafia",
  "yanuhjat",
  "yavne",
  "yavneel",
  "yehudmonoson",
  "yeruham",
  "yesudhamaala",
  "yirka",
  "yoav",
  "yokneamilit",
  "zarzir",
  "zemer",
  "zevulun",
  "zihronyaakov",
];

export interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: any[];
  };
  properties?: Record<string, any>;
}

export interface GeoJSONFeatureCollection {
  type: string;
  features: GeoJSONFeature[];
}

// Load Israel gushim GeoJSON file
export const loadIsraelGushimGeoJSON = async (
  gushName: string
): Promise<GeoJSONFeatureCollection | null> => {
  try {
    const fileName = `${gushName.toLowerCase()}.geojson`;
    const url = `/israel_gushim-master/${encodeURIComponent(fileName)}`;

    console.log(`Loading Israel gushim GeoJSON from: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `Failed to load ${fileName}: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();

    // Handle both Feature and FeatureCollection formats
    let featureCollection: GeoJSONFeatureCollection;

    if (data.type === "Feature") {
      // Convert single Feature to FeatureCollection
      featureCollection = {
        type: "FeatureCollection",
        features: [data],
      };
    } else if (data.type === "FeatureCollection") {
      featureCollection = data;
    } else {
      console.error(`Invalid GeoJSON format for ${fileName}:`, data);
      return null;
    }

    console.log(`Successfully loaded ${fileName}:`, featureCollection);
    return featureCollection;
  } catch (error) {
    console.error(`Error loading GeoJSON for ${gushName}:`, error);
    return null;
  }
};

// Format gushim name for display (capitalize first letter and add spaces)
export const formatGushimName = (name: string): string => {
  // Insert space before uppercase letters
  const spaced = name.replace(/([A-Z])/g, " $1");
  // Capitalize first letter of each word
  return spaced
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};
