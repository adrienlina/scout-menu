export const IMPACT_COLUMNS = [
  { key: "score_unique_ef", label: "Score unique EF3.1", unit: "mPt/kg", tooltip: "Score agrégé unique selon la méthode Environmental Footprint 3.1. Exprime l'ensemble des impacts environnementaux en un seul indicateur pondéré (milli-points par kg)." },
  { key: "changement_climatique", label: "Changement climatique", unit: "kg CO2 eq/kg", tooltip: "Émissions de gaz à effet de serre contribuant au réchauffement climatique, exprimées en équivalent CO2." },
  { key: "ozone", label: "Appauvrissement couche d'ozone", unit: "kg CFC11 eq/kg", tooltip: "Potentiel de destruction de la couche d'ozone stratosphérique, mesuré en équivalent CFC-11." },
  { key: "rayonnements_ionisants", label: "Rayonnements ionisants", unit: "kBq U-235 eq/kg", tooltip: "Impact des rayonnements ionisants sur la santé humaine, exprimé en équivalent Uranium-235." },
  { key: "formation_ozone", label: "Formation photochimique d'ozone", unit: "kg NMVOC eq/kg", tooltip: "Formation d'ozone troposphérique (smog), nocif pour la santé et la végétation." },
  { key: "particules", label: "Particules", unit: "disease inc./kg", tooltip: "Impact sur la santé lié à l'émission de particules fines dans l'air (incidence de maladies)." },
  { key: "toxicite_non_cancerogene", label: "Toxicité humaine (non-cancérogène)", unit: "CTUh/kg", tooltip: "Effets toxiques non-cancérogènes sur la santé humaine via les pollutions du milieu (air, eau, sol). Ne prend pas en compte l'ingestion directe de résidus." },
  { key: "toxicite_cancerogene", label: "Toxicité humaine (cancérogène)", unit: "CTUh/kg", tooltip: "Effets toxiques cancérogènes sur la santé humaine via les pollutions du milieu. Ne prend pas en compte l'ingestion directe de résidus." },
  { key: "acidification", label: "Acidification", unit: "mol H+ eq/kg", tooltip: "Acidification des sols et des eaux douces due aux émissions de substances acidifiantes (SO2, NOx, NH3)." },
  { key: "eutrophisation_eaux_douces", label: "Eutrophisation eaux douces", unit: "kg P eq/kg", tooltip: "Enrichissement excessif en nutriments (phosphore) des eaux douces, provoquant la prolifération d'algues." },
  { key: "eutrophisation_marine", label: "Eutrophisation marine", unit: "kg N eq/kg", tooltip: "Enrichissement excessif en nutriments (azote) des eaux marines, perturbant les écosystèmes." },
  { key: "eutrophisation_terrestre", label: "Eutrophisation terrestre", unit: "mol N eq/kg", tooltip: "Enrichissement excessif en nutriments des sols terrestres, modifiant la biodiversité végétale." },
  { key: "ecotoxicite_eau_douce", label: "Écotoxicité eau douce", unit: "CTUe/kg", tooltip: "Toxicité pour les écosystèmes aquatiques d'eau douce due aux polluants chimiques." },
  { key: "utilisation_sol", label: "Utilisation du sol", unit: "Pt/kg", tooltip: "Impact lié à la transformation et l'occupation des sols (perte de biodiversité, dégradation)." },
  { key: "epuisement_eau", label: "Épuisement des ressources en eau", unit: "m3 depriv./kg", tooltip: "Volume d'eau consommé pondéré par la rareté locale de la ressource en eau." },
  { key: "epuisement_energie", label: "Épuisement des ressources énergétiques", unit: "MJ/kg", tooltip: "Consommation de ressources énergétiques non-renouvelables (fossiles, nucléaire)." },
  { key: "epuisement_mineraux", label: "Épuisement des ressources minérales", unit: "kg Sb eq/kg", tooltip: "Consommation de ressources minérales et métalliques, exprimée en équivalent antimoine." },
  { key: "cc_biogenique", label: "CC - émissions biogéniques", unit: "kg CO2 eq/kg", tooltip: "Part du changement climatique liée aux émissions biogéniques (cycle naturel du carbone dans la biomasse)." },
  { key: "cc_fossile", label: "CC - émissions fossiles", unit: "kg CO2 eq/kg", tooltip: "Part du changement climatique liée aux émissions fossiles (combustion de pétrole, gaz, charbon)." },
  { key: "cc_affectation_sols", label: "CC - affectation des sols", unit: "kg CO2 eq/kg", tooltip: "Part du changement climatique liée au changement d'affectation des sols (déforestation, etc.)." },
] as const;

export const DEFAULT_VISIBLE_IMPACTS = ["changement_climatique", "score_unique_ef"];

export type ImpactKey = typeof IMPACT_COLUMNS[number]["key"];

// Excel column mapping: columns E through X in order correspond to IMPACT_COLUMNS
export const EXCEL_SHEET_NAME_BIO = "AGB 3.2 agricole biologique";
export const EXCEL_SHEET_NAME_CONV = "AGB 3.2 agricole conventionnel";
