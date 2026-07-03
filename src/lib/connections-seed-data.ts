import { geocodeConnection, type CrmConnection } from "@/lib/connections-data";

const SEED_ROWS: Array<Omit<CrmConnection, "id" | "createdAt" | "updatedAt">> = [
  { name: "Dr. Ashley Pursglove", role: "CTO", specialties: "Pilot, engineering, machining, AI", background: "Technical leadership", countryExperience: "UK, KSA, UAE, Portugal", city: "Porto", country: "Portugal", latitude: 41.1579, longitude: -8.6291 },
  { name: "Daniel Houlton", role: "CRO", specialties: "Sales", background: "Revenue growth", countryExperience: "UK, Europe", city: "Oxford", country: "UK", latitude: 51.752, longitude: -1.2577 },
  { name: "Stephen Saffin", role: "COO", specialties: "Landmine de-mining", background: "Operations", countryExperience: "South America, Africa, Middle East", city: "Buenos Aires", country: "Argentina", latitude: -34.6037, longitude: -58.3816 },
  { name: "Francesco Pantealone", role: "CSO", specialties: "3D Printing large scale sales", background: "Strategic sales", countryExperience: "Europe, USA", city: "Austin", country: "USA", latitude: 30.2672, longitude: -97.7431 },
  { name: "Steven Fotheringham", role: "Advisor", specialties: "Telecommunications", background: "Advisory", countryExperience: "UK, Europe, ASIA", city: "Jakarta", country: "Indonesia", latitude: -6.2088, longitude: 106.8456 },
  { name: "Nishad Khashad", role: "Advisor", specialties: "African Business", background: "Advisory", countryExperience: "Africa", city: "Nairobi", country: "Kenya", latitude: -1.2921, longitude: 36.8219 },
  { name: "John Magnay", role: "Advisor", specialties: "Agriculture", background: "Advisory", countryExperience: "Africa", city: "Kampala", country: "Uganda", latitude: 0.3476, longitude: 32.5825 },
  { name: "Luke Irving", role: "Advisor", specialties: "United", background: "Advisory", countryExperience: "Europe, Africa, Middle East", city: "Damascus", country: "Syria", latitude: 33.5138, longitude: 36.2765 },
  { name: "Prof Adam Arabian", role: "Advisor", specialties: "Engineering", background: "Advisory", countryExperience: "Global", city: "Seattle", country: "USA", latitude: 47.6062, longitude: -122.3321 },
  { name: "Harry Turner", role: "Advisor", specialties: "Business Strategic", background: "Advisory", countryExperience: "Global", city: "Melbourne", country: "Australia", latitude: -37.8136, longitude: 144.9631 },
  { name: "Paul Ormandy", role: "Advisor", specialties: "Online Digital Marketing, SEO", background: "Digital", countryExperience: "Global", city: "London", country: "UK", latitude: 51.5074, longitude: -0.1278 },
  { name: "Keir", role: "Advisor", specialties: "Wind farms, renewable energy", background: "Advisory", countryExperience: "Scotland", city: "Edinburgh", country: "UK", latitude: 55.9533, longitude: -3.1883 },
  { name: "Joe Crosby", role: "Advisor", specialties: "All types of mines", background: "Advisory", countryExperience: "Africa", city: "Harare", country: "Zimbabwe", latitude: -17.8252, longitude: 31.0522 },
  { name: "Dr. Robert Keeley", role: "Advisor", specialties: "Explosive Ordnance, UN", background: "Humanitarian", countryExperience: "Global", city: "Lyon", country: "France", latitude: 45.764, longitude: 4.8357 },
  { name: "Alaisdar Graham", role: "Advisor", specialties: "Project Management, Govt contracts, Cybersecurity", background: "Advisory", countryExperience: "North America & Africa", city: "Montreal", country: "Canada", latitude: 45.5017, longitude: -73.5673 },
  { name: "Dr. Arjan Buis", role: "Advisor", specialties: "NGO Projects", background: "University of Strathclyde", countryExperience: "Global", city: "Glasgow", country: "Scotland", latitude: 55.8642, longitude: -4.2518 },
];

export function createInitialConnections(): CrmConnection[] {
  const now = new Date().toISOString();
  return SEED_ROWS.map((row, index) => {
    const [latitude, longitude] = geocodeConnection(row.city, row.country);
    return {
      ...row,
      latitude: row.latitude ?? latitude,
      longitude: row.longitude ?? longitude,
      id: `conn-seed-${index + 1}`,
      createdAt: now,
      updatedAt: now,
    };
  });
}
