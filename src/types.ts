export interface Recording {
  xcId: string;
  audioUrl: string;
  xcUrl: string;
  type: string;
  quality: string;
  locality: string;
  country: string;
  rec: string;
  lic: string;
}

export interface Species {
  id: string;
  scientificName: string;
  nameEs: string;
  nameEn: string;
  family: string;
  recordings: Recording[];
}

export interface Catalog {
  generatedAt: string;
  source: string;
  species: Species[];
}
