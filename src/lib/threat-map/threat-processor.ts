import { getMCPApi } from '@/lib/api/mcp-api';

export interface ThreatEvent {
  id: string;
  sourceIp: string;
  targetIp: string;
  sourceCountry: string;
  targetCountry: string;
  sourceCoords: [number, number]; // [longitude, latitude]
  targetCoords: [number, number];
  severity: 'low' | 'medium' | 'high' | 'critical';
  attackType: string;
  timestamp: Date;
  active: boolean;
}

export interface ProcessedThreatData {
  threats: ThreatEvent[];
  totalCount: number;
  countries: string[];
  attackTypes: string[];
}

// IP to country mapping (simplified - in production use a proper GeoIP service)
const IP_TO_COUNTRY: Record<string, { country: string; coords: [number, number] }> = {
  // US IP ranges
  '192.168.1.1': { country: 'US', coords: [-95.7129, 37.0902] },
  '10.0.0.1': { country: 'US', coords: [-95.7129, 37.0902] },
  '172.16.0.1': { country: 'US', coords: [-95.7129, 37.0902] },
  '68.178.232.100': { country: 'US', coords: [-98.5795, 39.8283] }, // Example US IP
  '207.46.197.32': { country: 'US', coords: [-77.0369, 38.9072] }, // Example US IP
  
  // China
  '114.114.114.114': { country: 'CN', coords: [104.1954, 35.8617] },
  '8.8.8.8': { country: 'CN', coords: [104.1954, 35.8617] },
  '223.5.5.5': { country: 'CN', coords: [116.4074, 39.9042] }, // Example China IP
  
  // Russia
  '77.88.8.8': { country: 'RU', coords: [105.3188, 61.5240] },
  '95.108.133.1': { country: 'RU', coords: [37.6173, 55.7558] }, // Example Russia IP
  
  // Germany
  '89.146.224.1': { country: 'DE', coords: [10.4515, 51.1657] },
  '217.237.150.1': { country: 'DE', coords: [13.4050, 52.5200] }, // Example Germany IP
  
  // UK
  '8.26.56.26': { country: 'GB', coords: [-3.4360, 55.3781] },
  '185.11.124.1': { country: 'GB', coords: [-0.1278, 51.5074] }, // Example UK IP
  
  // Japan
  '202.12.27.33': { country: 'JP', coords: [138.2529, 36.2048] },
  '133.242.0.3': { country: 'JP', coords: [139.6917, 35.6895] }, // Example Japan IP
  
  // India
  '49.44.85.1': { country: 'IN', coords: [78.9629, 20.5937] },
  '103.21.124.1': { country: 'IN', coords: [77.2090, 28.6139] }, // Example India IP
  
  // Brazil
  '200.160.2.3': { country: 'BR', coords: [-51.9253, -14.2351] },
  '177.10.192.1': { country: 'BR', coords: [-47.8825, -15.7942] }, // Example Brazil IP
  
  // Australia
  '203.50.2.71': { country: 'AU', coords: [133.7751, -25.2744] },
  '1.1.1.1': { country: 'AU', coords: [151.2093, -33.8688] }, // Example Australia IP
  
  // Canada
  '192.197.87.1': { country: 'CA', coords: [-106.3468, 56.1304] },
  '24.244.0.1': { country: 'CA', coords: [-79.3832, 43.6532] }, // Example Canada IP

  // France
  '194.158.122.1': { country: 'FR', coords: [2.2137, 46.2276] },
  // Germany (additional)
  '185.20.100.1': { country: 'DE', coords: [10.4515, 51.1657] },
  // Italy
  '93.56.1.1': { country: 'IT', coords: [12.5674, 41.8719] },
  // Spain
  '81.46.0.1': { country: 'ES', coords: [-3.7038, 40.4168] },
  // Netherlands
  '195.241.100.1': { country: 'NL', coords: [4.8952, 52.3702] },
  // Sweden
  '193.10.10.1': { country: 'SE', coords: [18.6435, 60.1282] },
  // Norway
  '193.213.0.1': { country: 'NO', coords: [8.4689, 60.4720] },
  // Finland
  '193.166.0.1': { country: 'FI', coords: [25.7482, 61.9241] },
  // Poland
  '194.204.159.1': { country: 'PL', coords: [19.1451, 51.9194] },
  // Ukraine
  '195.78.224.1': { country: 'UA', coords: [31.1656, 48.3794] },
  // Turkey
  '195.175.39.1': { country: 'TR', coords: [35.2433, 38.9637] },
  // Saudi Arabia
  '188.130.128.1': { country: 'SA', coords: [45.0792, 23.8859] },
  // South Africa
  '196.25.1.1': { country: 'ZA', coords: [22.9375, -30.5595] },
  // Egypt
  '196.204.160.1': { country: 'EG', coords: [30.8025, 26.8206] },
  // Nigeria
  '197.210.0.1': { country: 'NG', coords: [8.6753, 9.0820] },
  // Argentina
  '190.2.0.1': { country: 'AR', coords: [-63.6167, -34.6037] },
  // Mexico
  '187.188.0.1': { country: 'MX', coords: [-102.5528, 23.6345] },
  // South Korea
  '210.112.0.1': { country: 'KR', coords: [127.7669, 35.9078] },
  // Indonesia
  '103.23.20.1': { country: 'ID', coords: [113.9213, -0.7893] },
  // Pakistan
  '103.22.200.1': { country: 'PK', coords: [69.3451, 30.3753] },
  // Bangladesh
  '103.20.200.1': { country: 'BD', coords: [90.3563, 23.6850] },
  // Vietnam
  '103.25.100.1': { country: 'VN', coords: [108.2772, 14.0583] },
  // Thailand
  '103.26.100.1': { country: 'TH', coords: [100.9925, 15.8700] },
  // Malaysia
  '103.27.100.1': { country: 'MY', coords: [101.9758, 4.2105] },
  // Philippines
  '103.28.100.1': { country: 'PH', coords: [121.7740, 12.8797] },
  // Singapore
  '103.29.100.1': { country: 'SG', coords: [103.8198, 1.3521] },
  // New Zealand
  '103.30.100.1': { country: 'NZ', coords: [174.8860, -40.9006] },
  // Chile
  '190.161.0.1': { country: 'CL', coords: [-71.5430, -35.6751] },
  // Colombia
  '190.242.0.1': { country: 'CO', coords: [-74.2973, 4.5709] },
  // Peru
  '190.40.0.1': { country: 'PE', coords: [-75.0152, -9.1900] },
  // Venezuela
  '190.200.0.1': { country: 'VE', coords: [-66.5897, 6.4238] },
  // Argentina (additional)
  '181.118.0.1': { country: 'AR', coords: [-63.6167, -34.6037] },
  // South Korea (additional)
  '203.255.0.1': { country: 'KR', coords: [127.7669, 35.9078] },
  // Taiwan
  '210.61.0.1': { country: 'TW', coords: [120.9605, 23.6978] },
  // Hong Kong
  '203.198.0.1': { country: 'HK', coords: [114.1095, 22.3964] },
  // United Arab Emirates
  '185.100.0.1': { country: 'AE', coords: [53.8478, 23.4241] },
  // Israel
  '192.118.0.1': { country: 'IL', coords: [34.8516, 31.0461] },
  // Iran
  '185.143.232.1': { country: 'IR', coords: [53.6880, 32.4279] },
  // Iraq
  '185.144.0.1': { country: 'IQ', coords: [43.6793, 33.2232] },
  // Syria
  '185.145.0.1': { country: 'SY', coords: [36.2783, 34.8072] },
  // Lebanon
  '185.146.0.1': { country: 'LB', coords: [35.8623, 33.8547] },
  // Jordan
  '185.147.0.1': { country: 'JO', coords: [36.2384, 30.5852] },
  // Kuwait
  '185.148.0.1': { country: 'KW', coords: [47.4818, 29.3117] },
  // Qatar
  '185.149.0.1': { country: 'QA', coords: [51.1839, 25.3548] },
  // Bahrain
  '185.150.0.1': { country: 'BH', coords: [50.6066, 25.9304] },
  // Oman
  '185.151.0.1': { country: 'OM', coords: [55.9232, 21.5125] },
  // Yemen
  '185.152.0.1': { country: 'YE', coords: [48.5164, 15.5527] },
  // Afghanistan
  '185.153.0.1': { country: 'AF', coords: [67.709953, 33.93911] },
  // Kazakhstan
  '185.154.0.1': { country: 'KZ', coords: [66.9237, 48.0196] },
  // Uzbekistan
  '185.155.0.1': { country: 'UZ', coords: [64.5853, 41.3775] },
  // Turkmenistan
  '185.156.0.1': { country: 'TM', coords: [59.5563, 38.9697] },
  // Kyrgyzstan
  '185.157.0.1': { country: 'KG', coords: [74.7661, 41.2044] },
  // Tajikistan
  '185.158.0.1': { country: 'TJ', coords: [71.2761, 38.8610] },
  // Azerbaijan
  '185.159.0.1': { country: 'AZ', coords: [47.5769, 40.1431] },
  // Georgia
  '185.160.0.1': { country: 'GE', coords: [43.3569, 42.3154] },
  // Armenia
  '185.161.0.1': { country: 'AM', coords: [45.0382, 40.0691] },
  // Cyprus
  '185.162.0.1': { country: 'CY', coords: [33.4299, 35.1264] },
  // Malta
  '185.163.0.1': { country: 'MT', coords: [14.3754, 35.9375] },
  // Iceland
  '185.164.0.1': { country: 'IS', coords: [-19.0208, 64.9631] },
  // Ireland
  '185.165.0.1': { country: 'IE', coords: [-8.2439, 53.4129] },
  // Portugal
  '185.166.0.1': { country: 'PT', coords: [-8.2245, 39.3999] },
  // Greece
  '185.167.0.1': { country: 'GR', coords: [21.8243, 39.0742] },
  // Albania
  '185.168.0.1': { country: 'AL', coords: [20.1683, 41.1533] },
  // Serbia
  '185.169.0.1': { country: 'RS', coords: [20.4573, 44.0165] },
  // Croatia
  '185.170.0.1': { country: 'HR', coords: [15.2000, 45.1000] },
  // Bosnia and Herzegovina
  '185.171.0.1': { country: 'BA', coords: [17.6791, 43.9159] },
  // Montenegro
  '185.172.0.1': { country: 'ME', coords: [19.3744, 42.7087] },
  // Kosovo
  '185.173.0.1': { country: 'XK', coords: [20.9029, 42.6026] },
  // North Macedonia
  '185.174.0.1': { country: 'MK', coords: [21.7453, 41.6086] },
  // Bulgaria
  '185.175.0.1': { country: 'BG', coords: [25.4858, 42.7339] },
  // Romania
  '185.176.0.1': { country: 'RO', coords: [24.9668, 45.9432] },
  // Moldova
  '185.177.0.1': { country: 'MD', coords: [28.3699, 47.4116] },
  // Belarus
  '185.178.0.1': { country: 'BY', coords: [27.9534, 53.7098] },
  // Lithuania
  '185.179.0.1': { country: 'LT', coords: [23.8813, 55.1694] },
  // Latvia
  '185.180.0.1': { country: 'LV', coords: [24.6032, 56.8796] },
  // Estonia
  '185.181.0.1': { country: 'EE', coords: [25.0136, 58.5953] },
  // Ukraine (additional)
  '185.182.0.1': { country: 'UA', coords: [31.1656, 48.3794] },
  // Russia (additional)
  '185.183.0.1': { country: 'RU', coords: [105.3188, 61.5240] },
  // Poland (additional)
  '185.184.0.1': { country: 'PL', coords: [19.1451, 51.9194] },
  // Czech Republic
  '185.185.0.1': { country: 'CZ', coords: [15.472962, 49.817492] },
  // Slovakia
  '185.186.0.1': { country: 'SK', coords: [19.6990, 48.6690] },
  // Hungary
  '185.187.0.1': { country: 'HU', coords: [19.5033, 47.1625] },
  // Austria
  '185.188.0.1': { country: 'AT', coords: [14.5501, 47.5162] },
  // Switzerland
  '185.189.0.1': { country: 'CH', coords: [8.2275, 46.8182] },
  // Belgium
  '185.190.0.1': { country: 'BE', coords: [4.4699, 50.5039] },
  // Luxembourg
  '185.191.0.1': { country: 'LU', coords: [6.1296, 49.8153] },
  // Netherlands (additional)
  '185.192.0.1': { country: 'NL', coords: [4.8952, 52.3702] },
  // Denmark
  '185.193.0.1': { country: 'DK', coords: [10.0000, 56.0000] },
  // Norway (additional)
  '185.194.0.1': { country: 'NO', coords: [8.4689, 60.4720] },
  // Sweden (additional)
  '185.195.0.1': { country: 'SE', coords: [18.6435, 60.1282] },
  // Finland (additional)
  '185.196.0.1': { country: 'FI', coords: [25.7482, 61.9241] },
  // Iceland (additional)
  '185.197.0.1': { country: 'IS', coords: [-19.0208, 64.9631] },
  // Greenland
  '185.198.0.1': { country: 'GL', coords: [-42.6043, 71.7069] },
  // Canada (additional)
  '185.199.0.1': { country: 'CA', coords: [-106.3468, 56.1304] },
  // USA (additional)
  '185.200.0.1': { country: 'US', coords: [-95.7129, 37.0902] },
  // Mexico (additional)
  '185.201.0.1': { country: 'MX', coords: [-102.5528, 23.6345] },
  // Cuba
  '185.202.0.1': { country: 'CU', coords: [-77.7812, 21.5218] },
  // Jamaica
  '185.203.0.1': { country: 'JM', coords: [-77.2975, 18.1096] },
  // Haiti
  '185.204.0.1': { country: 'HT', coords: [-72.2852, 18.9712] },
  // Dominican Republic
  '185.205.0.1': { country: 'DO', coords: [-70.1627, 18.7357] },
  // Puerto Rico
  '185.206.0.1': { country: 'PR', coords: [-66.5901, 18.2208] },
  // Colombia (additional)
  '185.207.0.1': { country: 'CO', coords: [-74.2973, 4.5709] },
  // Venezuela (additional)
  '185.208.0.1': { country: 'VE', coords: [-66.5897, 6.4238] },
  // Brazil (additional)
  '185.209.0.1': { country: 'BR', coords: [-51.9253, -14.2351] },
  // Peru (additional)
  '185.210.0.1': { country: 'PE', coords: [-75.0152, -9.1900] },
  // Chile (additional)
  '185.211.0.1': { country: 'CL', coords: [-71.5430, -35.6751] },
  // Argentina (additional)
  '185.212.0.1': { country: 'AR', coords: [-63.6167, -34.6037] },
  // Uruguay
  '185.213.0.1': { country: 'UY', coords: [-55.7658, -32.5228] },
  // Paraguay
  '185.214.0.1': { country: 'PY', coords: [-58.4438, -23.4425] },
  // Bolivia
  '185.215.0.1': { country: 'BO', coords: [-63.5887, -16.2902] },
  // Ecuador
  '185.216.0.1': { country: 'EC', coords: [-78.1834, -1.8312] },
  // Colombia (additional)
  '185.217.0.1': { country: 'CO', coords: [-74.2973, 4.5709] },
  // Panama
  '185.218.0.1': { country: 'PA', coords: [-80.7821, 8.5380] },
  // Costa Rica
  '185.219.0.1': { country: 'CR', coords: [-83.7534, 9.7489] },
  // Nicaragua
  '185.220.0.1': { country: 'NI', coords: [-85.2072, 12.8654] },
  // Honduras
  '185.221.0.1': { country: 'HN', coords: [-86.2419, 15.1999] },
  // El Salvador
  '185.222.0.1': { country: 'SV', coords: [-88.8965, 13.7942] },
  // Guatemala
  '185.223.0.1': { country: 'GT', coords: [-90.2308, 15.7835] },
  // Belize
  '185.224.0.1': { country: 'BZ', coords: [-88.4976, 17.1891] },
  // Cuba (additional)
  '185.225.0.1': { country: 'CU', coords: [-77.7812, 21.5218] },
  // Jamaica (additional)
  '185.226.0.1': { country: 'JM', coords: [-77.2975, 18.1096] },
  // Haiti (additional)
  '185.227.0.1': { country: 'HT', coords: [-72.2852, 18.9712] },
  // Dominican Republic (additional)
  '185.228.0.1': { country: 'DO', coords: [-70.1627, 18.7357] },
  // Puerto Rico (additional)
  '185.229.0.1': { country: 'PR', coords: [-66.5901, 18.2208] },
  // Trinidad and Tobago
  '185.230.0.1': { country: 'TT', coords: [-61.2225, 10.6918] },
  // Barbados
  '185.231.0.1': { country: 'BB', coords: [-59.5432, 13.1939] },
  // Saint Lucia
  '185.232.0.1': { country: 'LC', coords: [-60.9789, 13.9094] },
  // Saint Vincent and the Grenadines
  '185.233.0.1': { country: 'VC', coords: [-61.2872, 13.2577] },
  // Grenada
  '185.234.0.1': { country: 'GD', coords: [-61.6790, 12.2628] },
  // Antigua and Barbuda
  '185.235.0.1': { country: 'AG', coords: [-61.7964, 17.0608] },
  // Saint Kitts and Nevis
  '185.236.0.1': { country: 'KN', coords: [-62.7828, 17.3578] },
  // Dominica
  '185.237.0.1': { country: 'DM', coords: [-61.3709, 15.4150] },
  // Guadeloupe
  '185.238.0.1': { country: 'GP', coords: [-61.5510, 16.2650] },
  // Martinique
  '185.239.0.1': { country: 'MQ', coords: [-61.0242, 14.6415] },
  // France (additional)
  '185.240.0.1': { country: 'FR', coords: [2.2137, 46.2276] },
  // Germany (additional)
  '185.241.0.1': { country: 'DE', coords: [10.4515, 51.1657] },
  // Italy (additional)
  '185.242.0.1': { country: 'IT', coords: [12.5674, 41.8719] },
  // Spain (additional)
  '185.243.0.1': { country: 'ES', coords: [-3.7038, 40.4168] },
  // Portugal (additional)
  '185.244.0.1': { country: 'PT', coords: [-8.2245, 39.3999] },
  // Greece (additional)
  '185.245.0.1': { country: 'GR', coords: [21.8243, 39.0742] },
  // Turkey (additional)
  '185.246.0.1': { country: 'TR', coords: [35.2433, 38.9637] },
  // Egypt (additional)
  '185.247.0.1': { country: 'EG', coords: [30.8025, 26.8206] },
  // South Africa (additional)
  '185.248.0.1': { country: 'ZA', coords: [22.9375, -30.5595] },
  // Nigeria (additional)
  '185.249.0.1': { country: 'NG', coords: [8.6753, 9.0820] },
  // Kenya
  '185.250.0.1': { country: 'KE', coords: [37.9062, -0.0236] },
  // Ethiopia
  '185.251.0.1': { country: 'ET', coords: [40.4897, 9.1450] },
  // Tanzania
  '185.252.0.1': { country: 'TZ', coords: [34.8885, -6.3690] },
  // Uganda
  '185.253.0.1': { country: 'UG', coords: [32.2903, 1.3733] },
  // Algeria
  '185.254.0.1': { country: 'DZ', coords: [1.6596, 28.0339] },
  // Morocco
  '185.255.0.1': { country: 'MA', coords: [-7.0926, 31.7917] },
  // Tunisia
  '185.255.1.1': { country: 'TN', coords: [9.5375, 33.8869] },
  // Libya
  '185.255.2.1': { country: 'LY', coords: [17.2283, 26.3351] },
  // Sudan
  '185.255.3.1': { country: 'SD', coords: [30.2176, 12.8628] },
  // Chad
  '185.255.4.1': { country: 'TD', coords: [18.7322, 15.4542] },
  // Niger
  '185.255.5.1': { country: 'NE', coords: [8.0817, 17.6078] },
  // Mali
  '185.255.6.1': { country: 'ML', coords: [-3.9962, 17.5707] },
  // Mauritania
  '185.255.7.1': { country: 'MR', coords: [-10.0833, 21.0079] },
  // Senegal
  '185.255.8.1': { country: 'SN', coords: [-14.4524, 14.4974] },
  // Guinea
  '185.255.9.1': { country: 'GN', coords: [-10.9400, 9.9456] },
  // Ivory Coast
  '185.255.10.1': { country: 'CI', coords: [-5.5471, 7.5399] },
  // Ghana
  '185.255.11.1': { country: 'GH', coords: [-1.0232, 7.9465] },
  // Burkina Faso
  '185.255.12.1': { country: 'BF', coords: [-1.5616, 12.2383] },
  // Togo
  '185.255.13.1': { country: 'TG', coords: [0.8248, 8.6195] },
  // Benin
  '185.255.14.1': { country: 'BJ', coords: [2.3158, 9.3077] },
  // Nigeria (additional)
  '185.255.15.1': { country: 'NG', coords: [8.6753, 9.0820] },
  // Cameroon
  '185.255.16.1': { country: 'CM', coords: [12.3547, 7.3697] },
  // Gabon
  '185.255.17.1': { country: 'GA', coords: [11.6094, -0.2280] },
  // Congo (Republic)
  '185.255.18.1': { country: 'CG', coords: [15.8277, -0.2280] },
  // DR Congo
  '185.255.19.1': { country: 'CD', coords: [21.7587, -4.0383] },
  // Angola
  '185.255.20.1': { country: 'AO', coords: [17.8739, -11.2027] },
  // Namibia
  '185.255.21.1': { country: 'NA', coords: [17.0836, -22.9576] },
  // Botswana
  '185.255.22.1': { country: 'BW', coords: [24.6849, -22.3285] },
  // Zimbabwe
  '185.255.23.1': { country: 'ZW', coords: [29.1549, -19.0154] },
  // Zambia
  '185.255.24.1': { country: 'ZM', coords: [27.8493, -13.1339] },
  // Mozambique
  '185.255.25.1': { country: 'MZ', coords: [35.5296, -18.6657] },
  // Madagascar
  '185.255.26.1': { country: 'MG', coords: [46.8691, -18.7669] },
  // South Africa (additional)
  '185.255.27.1': { country: 'ZA', coords: [22.9375, -30.5595] },
  // Australia (additional)
  '185.255.28.1': { country: 'AU', coords: [133.7751, -25.2744] },
  // New Zealand (additional)
  '185.255.29.1': { country: 'NZ', coords: [174.8860, -40.9006] },
  // Fiji
  '185.255.30.1': { country: 'FJ', coords: [178.0650, -17.7134] },
  // Papua New Guinea
  '185.255.31.1': { country: 'PG', coords: [143.9555, -6.3149] },
  // Indonesia (additional)
  '185.255.32.1': { country: 'ID', coords: [113.9213, -0.7893] },
  // Malaysia (additional)
  '185.255.33.1': { country: 'MY', coords: [101.9758, 4.2105] },
  // Thailand (additional)
  '185.255.34.1': { country: 'TH', coords: [100.9925, 15.8700] },
  // Vietnam (additional)
  '185.255.35.1': { country: 'VN', coords: [108.2772, 14.0583] },
  // Philippines (additional)
  '185.255.36.1': { country: 'PH', coords: [121.7740, 12.8797] },
  // Singapore (additional)
  '185.255.37.1': { country: 'SG', coords: [103.8198, 1.3521] },
  // Hong Kong (additional)
  '185.255.38.1': { country: 'HK', coords: [114.1095, 22.3964] },
  // Taiwan (additional)
  '185.255.39.1': { country: 'TW', coords: [120.9605, 23.6978] },
  // South Korea (additional)
  '185.255.40.1': { country: 'KR', coords: [127.7669, 35.9078] },
  // Japan (additional)
  '185.255.41.1': { country: 'JP', coords: [138.2529, 36.2048] },
  // China (additional)
  '185.255.42.1': { country: 'CN', coords: [104.1954, 35.8617] },
  // Mongolia
  '185.255.43.1': { country: 'MN', coords: [103.8467, 46.8625] },
  // Kazakhstan (additional)
  '185.255.44.1': { country: 'KZ', coords: [66.9237, 48.0196] },
  // Uzbekistan (additional)
  '185.255.45.1': { country: 'UZ', coords: [64.5853, 41.3775] },
  // Turkmenistan (additional)
  '185.255.46.1': { country: 'TM', coords: [59.5563, 38.9697] },
  // Kyrgyzstan (additional)
  '185.255.47.1': { country: 'KG', coords: [74.7661, 41.2044] },
  // Tajikistan (additional)
  '185.255.48.1': { country: 'TJ', coords: [71.2761, 38.8610] },
  // Afghanistan (additional)
  '185.255.49.1': { country: 'AF', coords: [67.709953, 33.93911] },
  // Pakistan (additional)
  '185.255.50.1': { country: 'PK', coords: [69.3451, 30.3753] },
  // India (additional)
  '185.255.51.1': { country: 'IN', coords: [78.9629, 20.5937] },
  // Bangladesh (additional)
  '185.255.52.1': { country: 'BD', coords: [90.3563, 23.6850] },
  // Sri Lanka
  '185.255.53.1': { country: 'LK', coords: [80.7718, 7.8731] },
  // Nepal
  '185.255.54.1': { country: 'NP', coords: [84.1240, 28.3949] },
  // Bhutan
  '185.255.55.1': { country: 'BT', coords: [90.4336, 27.5142] },
  // Myanmar
  '185.255.56.1': { country: 'MM', coords: [95.9700, 21.9139] },
  // Laos
  '185.255.57.1': { country: 'LA', coords: [102.4955, 19.8563] },
  // Cambodia
  '185.255.58.1': { country: 'KH', coords: [104.9910, 12.5657] },
  // Vietnam (additional)
  '185.255.59.1': { country: 'VN', coords: [108.2772, 14.0583] },
  // Thailand (additional)
  '185.255.60.1': { country: 'TH', coords: [100.9925, 15.8700] },
  // Malaysia (additional)
  '185.255.61.1': { country: 'MY', coords: [101.9758, 4.2105] },
  // Singapore (additional)
  '185.255.62.1': { country: 'SG', coords: [103.8198, 1.3521] },
  // Indonesia (additional)
  '185.255.63.1': { country: 'ID', coords: [113.9213, -0.7893] }
};

// Default country coordinates (expanded for better coverage)
const DEFAULT_COUNTRY_COORDS: Record<string, [number, number]> = {
  'US': [-95.7129, 37.0902], // United States
  'CA': [-106.3468, 56.1304], // Canada
  'MX': [-102.5528, 23.6345], // Mexico
  'BR': [-51.9253, -14.2351], // Brazil
  'AR': [-63.6167, -34.6037], // Argentina
  'GB': [-3.4360, 55.3781], // United Kingdom
  'FR': [2.2137, 46.2276], // France
  'DE': [10.4515, 51.1657], // Germany
  'IT': [12.5674, 41.8719], // Italy
  'ES': [-3.7038, 40.4168], // Spain
  'RU': [105.3188, 61.5240], // Russia
  'CN': [104.1954, 35.8617], // China
  'IN': [78.9629, 20.5937], // India
  'JP': [138.2529, 36.2048], // Japan
  'AU': [133.7751, -25.2744], // Australia
  'NZ': [174.8860, -40.9006], // New Zealand
  'ZA': [22.9375, -30.5595], // South Africa
  'EG': [30.8025, 26.8206], // Egypt
  'NG': [8.6753, 9.0820], // Nigeria
  'SA': [45.0792, 23.8859], // Saudi Arabia
  'AE': [53.8478, 23.4241], // United Arab Emirates
  'IL': [34.8516, 31.0461], // Israel
  'TR': [35.2433, 38.9637], // Turkey
  'UA': [31.1656, 48.3794], // Ukraine
  'PL': [19.1451, 51.9194], // Poland
  'NL': [4.8952, 52.3702], // Netherlands
  'SE': [18.6435, 60.1282], // Sweden
  'NO': [8.4689, 60.4720], // Norway
  'FI': [25.7482, 61.9241], // Finland
  'GR': [21.8243, 39.0742], // Greece
  'PT': [-8.2245, 39.3999], // Portugal
  'IE': [-8.2439, 53.4129], // Ireland
  'CH': [8.2275, 46.8182], // Switzerland
  'AT': [14.5501, 47.5162], // Austria
  'BE': [4.4699, 50.5039], // Belgium
  'DK': [10.0000, 56.0000], // Denmark
  'CZ': [15.472962, 49.817492], // Czech Republic
  'HU': [19.5033, 47.1625], // Hungary
  'RO': [24.9668, 45.9432], // Romania
  'BG': [25.4858, 42.7339], // Bulgaria
  'RS': [20.4573, 44.0165], // Serbia
  'HR': [15.2000, 45.1000], // Croatia
  'SK': [19.6990, 48.6690], // Slovakia
  'LT': [23.8813, 55.1694], // Lithuania
  'LV': [24.6032, 56.8796], // Latvia
  'EE': [25.0136, 58.5953], // Estonia
  'ID': [113.9213, -0.7893], // Indonesia
  'PK': [69.3451, 30.3753], // Pakistan
  'BD': [90.3563, 23.6850], // Bangladesh
  'VN': [108.2772, 14.0583], // Vietnam
  'TH': [100.9925, 15.8700], // Thailand
  'MY': [101.9758, 4.2105], // Malaysia
  'PH': [121.7740, 12.8797], // Philippines
  'SG': [103.8198, 1.3521], // Singapore
  'KR': [127.7669, 35.9078], // South Korea
  'TW': [120.9605, 23.6978], // Taiwan
  'HK': [114.1095, 22.3964], // Hong Kong
  'CL': [-71.5430, -35.6751], // Chile
  'CO': [-74.2973, 4.5709], // Colombia
  'PE': [-75.0152, -9.1900], // Peru
  'VE': [-66.5897, 6.4238], // Venezuela
  'UY': [-55.7658, -32.5228], // Uruguay
  'PY': [-58.4438, -23.4425], // Paraguay
  'BO': [-63.5887, -16.2902], // Bolivia
  'EC': [-78.1834, -1.8312], // Ecuador
  'PA': [-80.7821, 8.5380], // Panama
  'CR': [-83.7534, 9.7489], // Costa Rica
  'CU': [-77.7812, 21.5218], // Cuba
  'JM': [-77.2975, 18.1096], // Jamaica
  'DO': [-70.1627, 18.7357], // Dominican Republic
  'PR': [-66.5901, 18.2208], // Puerto Rico
  'TT': [-61.2225, 10.6918], // Trinidad and Tobago
  'KE': [37.9062, -0.0236], // Kenya
  'ET': [40.4897, 9.1450], // Ethiopia
  'TZ': [34.8885, -6.3690], // Tanzania
  'UG': [32.2903, 1.3733], // Uganda
  'DZ': [1.6596, 28.0339], // Algeria
  'MA': [-7.0926, 31.7917], // Morocco
  'TN': [9.5375, 33.8869], // Tunisia
  'LY': [17.2283, 26.3351], // Libya
  'SD': [30.2176, 12.8628], // Sudan
  'ML': [-3.9962, 17.5707], // Mali
  'GH': [-1.0232, 7.9465], // Ghana
  'CM': [12.3547, 7.3697], // Cameroon
  'AO': [17.8739, -11.2027], // Angola
  'MZ': [35.5296, -18.6657], // Mozambique
  'MG': [46.8691, -18.7669], // Madagascar
  'LK': [80.7718, 7.8731], // Sri Lanka
  'NP': [84.1240, 28.3949], // Nepal
  'MM': [95.9700, 21.9139], // Myanmar
  'LA': [102.4955, 19.8563], // Laos
  'KH': [104.9910, 12.5657], // Cambodia
  'MN': [103.8467, 46.8625], // Mongolia
  'KZ': [66.9237, 48.0196], // Kazakhstan
  'UZ': [64.5853, 41.3775], // Uzbekistan
  'AF': [67.709953, 33.93911], // Afghanistan
  'IQ': [43.6793, 33.2232], // Iraq
  'SY': [36.2783, 34.8072], // Syria
  'LB': [35.8623, 33.8547], // Lebanon
  'JO': [36.2384, 30.5852], // Jordan
  'KW': [47.4818, 29.3117], // Kuwait
  'QA': [51.1839, 25.3548], // Qatar
  'BH': [50.6066, 25.9304], // Bahrain
  'OM': [55.9232, 21.5125], // Oman
  'YE': [48.5164, 15.5527], // Yemen
  'CY': [33.4299, 35.1264], // Cyprus
  'MT': [14.3754, 35.9375], // Malta
  'IS': [-19.0208, 64.9631], // Iceland
  'GL': [-42.6043, 71.7069], // Greenland
  'XK': [20.9029, 42.6026], // Kosovo
  'MD': [28.3699, 47.4116], // Moldova
  'BY': [27.9534, 53.7098], // Belarus
  'GE': [43.3569, 42.3154], // Georgia
  'AM': [45.0382, 40.0691], // Armenia
  'AZ': [47.5769, 40.1431], // Azerbaijan
  'TM': [59.5563, 38.9697], // Turkmenistan
  'KG': [74.7661, 41.2044], // Kyrgyzstan
  'TJ': [71.2761, 38.8610], // Tajikistan
  'FJ': [178.0650, -17.7134], // Fiji
  'PG': [143.9555, -6.3149], // Papua New Guinea
  'BT': [90.4336, 27.5142], // Bhutan
  'BF': [-1.5616, 12.2383], // Burkina Faso
  'TG': [0.8248, 8.6195], // Togo
  'BJ': [2.3158, 9.3077], // Benin
  'GA': [11.6094, -0.2280], // Gabon
  'CG': [15.8277, -0.2280], // Congo (Republic)
  'CD': [21.7587, -4.0383], // DR Congo
  'NA': [17.0836, -22.9576], // Namibia
  'BW': [24.6849, -22.3285], // Botswana
  'ZW': [29.1549, -19.0154], // Zimbabwe
  'ZM': [27.8493, -13.1339], // Zambia
  'MR': [-10.0833, 21.0079], // Mauritania
  'SN': [-14.4524, 14.4974], // Senegal
  'GN': [-10.9400, 9.9456], // Guinea
  'CI': [-5.5471, 7.5399], // Ivory Coast
  'HN': [-86.2419, 15.1999], // Honduras
  'SV': [-88.8965, 13.7942], // El Salvador
  'GT': [-90.2308, 15.7835], // Guatemala
  'BZ': [-88.4976, 17.1891], // Belize
  'NI': [-85.2072, 12.8654], // Nicaragua
  'LC': [-60.9789, 13.9094], // Saint Lucia
  'VC': [-61.2872, 13.2577], // Saint Vincent and the Grenadines
  'GD': [-61.6790, 12.2628], // Grenada
  'AG': [-61.7964, 17.0608], // Antigua and Barbuda
  'KN': [-62.7828, 17.3578], // Saint Kitts and Nevis
  'DM': [-61.3709, 15.4150], // Dominica
  'GP': [-61.5510, 16.2650], // Guadeloupe
  'MQ': [-61.0242, 14.6415], // Martinique
  'BB': [-59.5432, 13.1939], // Barbados
  'MK': [21.7453, 41.6086], // North Macedonia
  'ME': [19.3744, 42.7087], // Montenegro
  'AL': [20.1683, 41.1533], // Albania
  'LU': [6.1296, 49.8153], // Luxembourg
};

export function getCountryFromIP(ip: string): { country: string; coords: [number, number] } {
  // Check exact match first
  if (IP_TO_COUNTRY[ip]) {
    return IP_TO_COUNTRY[ip];
  }
  
  // Simple IP range matching for common ranges
  // This is a very basic approach and should be replaced by a proper GeoIP library
  // For demonstration purposes, we'll map some common ranges to countries
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.')) {
    return { country: 'US', coords: DEFAULT_COUNTRY_COORDS['US'] };
  }
  
  // Example: Map some public IP ranges to countries
  if (ip.startsWith('68.') || ip.startsWith('207.')) {
    return { country: 'US', coords: DEFAULT_COUNTRY_COORDS['US'] };
  }
  if (ip.startsWith('114.') || ip.startsWith('223.')) {
    return { country: 'CN', coords: DEFAULT_COUNTRY_COORDS['CN'] };
  }
  if (ip.startsWith('77.') || ip.startsWith('95.')) {
    return { country: 'RU', coords: DEFAULT_COUNTRY_COORDS['RU'] };
  }
  if (ip.startsWith('89.') || ip.startsWith('217.')) {
    return { country: 'DE', coords: DEFAULT_COUNTRY_COORDS['DE'] };
  }
  if (ip.startsWith('8.') || ip.startsWith('185.11.')) {
    return { country: 'GB', coords: DEFAULT_COUNTRY_COORDS['GB'] };
  }
  if (ip.startsWith('202.') || ip.startsWith('133.')) {
    return { country: 'JP', coords: DEFAULT_COUNTRY_COORDS['JP'] };
  }
  if (ip.startsWith('49.') || ip.startsWith('103.21.')) {
    return { country: 'IN', coords: DEFAULT_COUNTRY_COORDS['IN'] };
  }
  if (ip.startsWith('200.') || ip.startsWith('177.')) {
    return { country: 'BR', coords: DEFAULT_COUNTRY_COORDS['BR'] };
  }
  if (ip.startsWith('1.') || ip.startsWith('203.50.')) {
    return { country: 'AU', coords: DEFAULT_COUNTRY_COORDS['AU'] };
  }
  if (ip.startsWith('192.197.') || ip.startsWith('24.')) {
    return { country: 'CA', coords: DEFAULT_COUNTRY_COORDS['CA'] };
  }
  if (ip.startsWith('194.158.')) {
    return { country: 'FR', coords: DEFAULT_COUNTRY_COORDS['FR'] };
  }
  if (ip.startsWith('93.56.')) {
    return { country: 'IT', coords: DEFAULT_COUNTRY_COORDS['IT'] };
  }
  if (ip.startsWith('81.46.')) {
    return { country: 'ES', coords: DEFAULT_COUNTRY_COORDS['ES'] };
  }
  if (ip.startsWith('195.241.')) {
    return { country: 'NL', coords: DEFAULT_COUNTRY_COORDS['NL'] };
  }
  if (ip.startsWith('193.10.')) {
    return { country: 'SE', coords: DEFAULT_COUNTRY_COORDS['SE'] };
  }
  if (ip.startsWith('193.213.')) {
    return { country: 'NO', coords: DEFAULT_COUNTRY_COORDS['NO'] };
  }
  if (ip.startsWith('193.166.')) {
    return { country: 'FI', coords: DEFAULT_COUNTRY_COORDS['FI'] };
  }
  if (ip.startsWith('194.204.')) {
    return { country: 'PL', coords: DEFAULT_COUNTRY_COORDS['PL'] };
  }
  if (ip.startsWith('195.78.')) {
    return { country: 'UA', coords: DEFAULT_COUNTRY_COORDS['UA'] };
  }
  if (ip.startsWith('195.175.')) {
    return { country: 'TR', coords: DEFAULT_COUNTRY_COORDS['TR'] };
  }
  if (ip.startsWith('188.130.')) {
    return { country: 'SA', coords: DEFAULT_COUNTRY_COORDS['SA'] };
  }
  if (ip.startsWith('196.25.')) {
    return { country: 'ZA', coords: DEFAULT_COUNTRY_COORDS['ZA'] };
  }
  if (ip.startsWith('196.204.')) {
    return { country: 'EG', coords: DEFAULT_COUNTRY_COORDS['EG'] };
  }
  if (ip.startsWith('197.210.')) {
    return { country: 'NG', coords: DEFAULT_COUNTRY_COORDS['NG'] };
  }
  if (ip.startsWith('190.2.')) {
    return { country: 'AR', coords: DEFAULT_COUNTRY_COORDS['AR'] };
  }
  if (ip.startsWith('187.188.')) {
    return { country: 'MX', coords: DEFAULT_COUNTRY_COORDS['MX'] };
  }
  if (ip.startsWith('210.112.')) {
    return { country: 'KR', coords: DEFAULT_COUNTRY_COORDS['KR'] };
  }
  if (ip.startsWith('103.23.')) {
    return { country: 'ID', coords: DEFAULT_COUNTRY_COORDS['ID'] };
  }
  if (ip.startsWith('103.22.')) {
    return { country: 'PK', coords: DEFAULT_COUNTRY_COORDS['PK'] };
  }
  if (ip.startsWith('103.20.')) {
    return { country: 'BD', coords: DEFAULT_COUNTRY_COORDS['BD'] };
  }
  if (ip.startsWith('103.25.')) {
    return { country: 'VN', coords: DEFAULT_COUNTRY_COORDS['VN'] };
  }
  if (ip.startsWith('103.26.')) {
    return { country: 'TH', coords: DEFAULT_COUNTRY_COORDS['TH'] };
  }
  if (ip.startsWith('103.27.')) {
    return { country: 'MY', coords: DEFAULT_COUNTRY_COORDS['MY'] };
  }
  if (ip.startsWith('103.28.')) {
    return { country: 'PH', coords: DEFAULT_COUNTRY_COORDS['PH'] };
  }
  if (ip.startsWith('103.29.')) {
    return { country: 'SG', coords: DEFAULT_COUNTRY_COORDS['SG'] };
  }
  if (ip.startsWith('103.30.')) {
    return { country: 'NZ', coords: DEFAULT_COUNTRY_COORDS['NZ'] };
  }
  if (ip.startsWith('190.161.')) {
    return { country: 'CL', coords: DEFAULT_COUNTRY_COORDS['CL'] };
  }
  if (ip.startsWith('190.242.')) {
    return { country: 'CO', coords: DEFAULT_COUNTRY_COORDS['CO'] };
  }
  if (ip.startsWith('190.40.')) {
    return { country: 'PE', coords: DEFAULT_COUNTRY_COORDS['PE'] };
  }
  if (ip.startsWith('190.200.')) {
    return { country: 'VE', coords: DEFAULT_COUNTRY_COORDS['VE'] };
  }
  if (ip.startsWith('210.61.')) {
    return { country: 'TW', coords: DEFAULT_COUNTRY_COORDS['TW'] };
  }
  if (ip.startsWith('203.198.')) {
    return { country: 'HK', coords: DEFAULT_COUNTRY_COORDS['HK'] };
  }
  if (ip.startsWith('185.100.')) {
    return { country: 'AE', coords: DEFAULT_COUNTRY_COORDS['AE'] };
  }
  if (ip.startsWith('192.118.')) {
    return { country: 'IL', coords: DEFAULT_COUNTRY_COORDS['IL'] };
  }
  if (ip.startsWith('185.143.')) {
    return { country: 'IR', coords: DEFAULT_COUNTRY_COORDS['IR'] };
  }
  if (ip.startsWith('185.144.')) {
    return { country: 'IQ', coords: DEFAULT_COUNTRY_COORDS['IQ'] };
  }
  if (ip.startsWith('185.145.')) {
    return { country: 'SY', coords: DEFAULT_COUNTRY_COORDS['SY'] };
  }
  if (ip.startsWith('185.146.')) {
    return { country: 'LB', coords: DEFAULT_COUNTRY_COORDS['LB'] };
  }
  if (ip.startsWith('185.147.')) {
    return { country: 'JO', coords: DEFAULT_COUNTRY_COORDS['JO'] };
  }
  if (ip.startsWith('185.148.')) {
    return { country: 'KW', coords: DEFAULT_COUNTRY_COORDS['KW'] };
  }
  if (ip.startsWith('185.149.')) {
    return { country: 'QA', coords: DEFAULT_COUNTRY_COORDS['QA'] };
  }
  if (ip.startsWith('185.150.')) {
    return { country: 'BH', coords: DEFAULT_COUNTRY_COORDS['BH'] };
  }
  if (ip.startsWith('185.151.')) {
    return { country: 'OM', coords: DEFAULT_COUNTRY_COORDS['OM'] };
  }
  if (ip.startsWith('185.152.')) {
    return { country: 'YE', coords: DEFAULT_COUNTRY_COORDS['YE'] };
  }
  if (ip.startsWith('185.153.')) {
    return { country: 'AF', coords: DEFAULT_COUNTRY_COORDS['AF'] };
  }
  if (ip.startsWith('185.154.')) {
    return { country: 'KZ', coords: DEFAULT_COUNTRY_COORDS['KZ'] };
  }
  if (ip.startsWith('185.155.')) {
    return { country: 'UZ', coords: DEFAULT_COUNTRY_COORDS['UZ'] };
  }
  if (ip.startsWith('185.156.')) {
    return { country: 'TM', coords: DEFAULT_COUNTRY_COORDS['TM'] };
  }
  if (ip.startsWith('185.157.')) {
    return { country: 'KG', coords: DEFAULT_COUNTRY_COORDS['KG'] };
  }
  if (ip.startsWith('185.158.')) {
    return { country: 'TJ', coords: DEFAULT_COUNTRY_COORDS['TJ'] };
  }
  if (ip.startsWith('185.159.')) {
    return { country: 'AZ', coords: DEFAULT_COUNTRY_COORDS['AZ'] };
  }
  if (ip.startsWith('185.160.')) {
    return { country: 'GE', coords: DEFAULT_COUNTRY_COORDS['GE'] };
  }
  if (ip.startsWith('185.161.')) {
    return { country: 'AM', coords: DEFAULT_COUNTRY_COORDS['AM'] };
  }
  if (ip.startsWith('185.162.')) {
    return { country: 'CY', coords: DEFAULT_COUNTRY_COORDS['CY'] };
  }
  if (ip.startsWith('185.163.')) {
    return { country: 'MT', coords: DEFAULT_COUNTRY_COORDS['MT'] };
  }
  if (ip.startsWith('185.164.')) {
    return { country: 'IS', coords: DEFAULT_COUNTRY_COORDS['IS'] };
  }
  if (ip.startsWith('185.165.')) {
    return { country: 'IE', coords: DEFAULT_COUNTRY_COORDS['IE'] };
  }
  if (ip.startsWith('185.166.')) {
    return { country: 'PT', coords: DEFAULT_COUNTRY_COORDS['PT'] };
  }
  if (ip.startsWith('185.167.')) {
    return { country: 'GR', coords: DEFAULT_COUNTRY_COORDS['GR'] };
  }
  if (ip.startsWith('185.168.')) {
    return { country: 'AL', coords: DEFAULT_COUNTRY_COORDS['AL'] };
  }
  if (ip.startsWith('185.169.')) {
    return { country: 'RS', coords: DEFAULT_COUNTRY_COORDS['RS'] };
  }
  if (ip.startsWith('185.170.')) {
    return { country: 'HR', coords: DEFAULT_COUNTRY_COORDS['HR'] };
  }
  if (ip.startsWith('185.171.')) {
    return { country: 'BA', coords: DEFAULT_COUNTRY_COORDS['BA'] };
  }
  if (ip.startsWith('185.172.')) {
    return { country: 'ME', coords: DEFAULT_COUNTRY_COORDS['ME'] };
  }
  if (ip.startsWith('185.173.')) {
    return { country: 'XK', coords: DEFAULT_COUNTRY_COORDS['XK'] };
  }
  if (ip.startsWith('185.174.')) {
    return { country: 'MK', coords: DEFAULT_COUNTRY_COORDS['MK'] };
  }
  if (ip.startsWith('185.175.')) {
    return { country: 'BG', coords: DEFAULT_COUNTRY_COORDS['BG'] };
  }
  if (ip.startsWith('185.176.')) {
    return { country: 'RO', coords: DEFAULT_COUNTRY_COORDS['RO'] };
  }
  if (ip.startsWith('185.177.')) {
    return { country: 'MD', coords: DEFAULT_COUNTRY_COORDS['MD'] };
  }
  if (ip.startsWith('185.178.')) {
    return { country: 'BY', coords: DEFAULT_COUNTRY_COORDS['BY'] };
  }
  if (ip.startsWith('185.179.')) {
    return { country: 'LT', coords: DEFAULT_COUNTRY_COORDS['LT'] };
  }
  if (ip.startsWith('185.180.')) {
    return { country: 'LV', coords: DEFAULT_COUNTRY_COORDS['LV'] };
  }
  if (ip.startsWith('185.181.')) {
    return { country: 'EE', coords: DEFAULT_COUNTRY_COORDS['EE'] };
  }
  if (ip.startsWith('185.185.')) {
    return { country: 'CZ', coords: DEFAULT_COUNTRY_COORDS['CZ'] };
  }
  if (ip.startsWith('185.186.')) {
    return { country: 'SK', coords: DEFAULT_COUNTRY_COORDS['SK'] };
  }
  if (ip.startsWith('185.187.')) {
    return { country: 'HU', coords: DEFAULT_COUNTRY_COORDS['HU'] };
  }
  if (ip.startsWith('185.188.')) {
    return { country: 'AT', coords: DEFAULT_COUNTRY_COORDS['AT'] };
  }
  if (ip.startsWith('185.189.')) {
    return { country: 'CH', coords: DEFAULT_COUNTRY_COORDS['CH'] };
  }
  if (ip.startsWith('185.190.')) {
    return { country: 'BE', coords: DEFAULT_COUNTRY_COORDS['BE'] };
  }
  if (ip.startsWith('185.191.')) {
    return { country: 'LU', coords: DEFAULT_COUNTRY_COORDS['LU'] };
  }
  if (ip.startsWith('185.193.')) {
    return { country: 'DK', coords: DEFAULT_COUNTRY_COORDS['DK'] };
  }
  if (ip.startsWith('185.198.')) {
    return { country: 'GL', coords: DEFAULT_COUNTRY_COORDS['GL'] };
  }
  if (ip.startsWith('185.202.')) {
    return { country: 'CU', coords: DEFAULT_COUNTRY_COORDS['CU'] };
  }
  if (ip.startsWith('185.203.')) {
    return { country: 'JM', coords: DEFAULT_COUNTRY_COORDS['JM'] };
  }
  if (ip.startsWith('185.204.')) {
    return { country: 'HT', coords: DEFAULT_COUNTRY_COORDS['HT'] };
  }
  if (ip.startsWith('185.205.')) {
    return { country: 'DO', coords: DEFAULT_COUNTRY_COORDS['DO'] };
  }
  if (ip.startsWith('185.206.')) {
    return { country: 'PR', coords: DEFAULT_COUNTRY_COORDS['PR'] };
  }
  if (ip.startsWith('185.213.')) {
    return { country: 'UY', coords: DEFAULT_COUNTRY_COORDS['UY'] };
  }
  if (ip.startsWith('185.214.')) {
    return { country: 'PY', coords: DEFAULT_COUNTRY_COORDS['PY'] };
  }
  if (ip.startsWith('185.215.')) {
    return { country: 'BO', coords: DEFAULT_COUNTRY_COORDS['BO'] };
  }
  if (ip.startsWith('185.216.')) {
    return { country: 'EC', coords: DEFAULT_COUNTRY_COORDS['EC'] };
  }
  if (ip.startsWith('185.218.')) {
    return { country: 'PA', coords: DEFAULT_COUNTRY_COORDS['PA'] };
  }
  if (ip.startsWith('185.219.')) {
    return { country: 'CR', coords: DEFAULT_COUNTRY_COORDS['CR'] };
  }
  if (ip.startsWith('185.220.')) {
    return { country: 'NI', coords: DEFAULT_COUNTRY_COORDS['NI'] };
  }
  if (ip.startsWith('185.221.')) {
    return { country: 'HN', coords: DEFAULT_COUNTRY_COORDS['HN'] };
  }
  if (ip.startsWith('185.222.')) {
    return { country: 'SV', coords: DEFAULT_COUNTRY_COORDS['SV'] };
  }
  if (ip.startsWith('185.223.')) {
    return { country: 'GT', coords: DEFAULT_COUNTRY_COORDS['GT'] };
  }
  if (ip.startsWith('185.224.')) {
    return { country: 'BZ', coords: DEFAULT_COUNTRY_COORDS['BZ'] };
  }
  if (ip.startsWith('185.230.')) {
    return { country: 'TT', coords: DEFAULT_COUNTRY_COORDS['TT'] };
  }
  if (ip.startsWith('185.231.')) {
    return { country: 'BB', coords: DEFAULT_COUNTRY_COORDS['BB'] };
  }
  if (ip.startsWith('185.232.')) {
    return { country: 'LC', coords: DEFAULT_COUNTRY_COORDS['LC'] };
  }
  if (ip.startsWith('185.233.')) {
    return { country: 'VC', coords: DEFAULT_COUNTRY_COORDS['VC'] };
  }
  if (ip.startsWith('185.234.')) {
    return { country: 'GD', coords: DEFAULT_COUNTRY_COORDS['GD'] };
  }
  if (ip.startsWith('185.235.')) {
    return { country: 'AG', coords: DEFAULT_COUNTRY_COORDS['AG'] };
  }
  if (ip.startsWith('185.236.')) {
    return { country: 'KN', coords: DEFAULT_COUNTRY_COORDS['KN'] };
  }
  if (ip.startsWith('185.237.')) {
    return { country: 'DM', coords: DEFAULT_COUNTRY_COORDS['DM'] };
  }
  if (ip.startsWith('185.238.')) {
    return { country: 'GP', coords: DEFAULT_COUNTRY_COORDS['GP'] };
  }
  if (ip.startsWith('185.239.')) {
    return { country: 'MQ', coords: DEFAULT_COUNTRY_COORDS['MQ'] };
  }
  if (ip.startsWith('185.250.')) {
    return { country: 'KE', coords: DEFAULT_COUNTRY_COORDS['KE'] };
  }
  if (ip.startsWith('185.251.')) {
    return { country: 'ET', coords: DEFAULT_COUNTRY_COORDS['ET'] };
  }
  if (ip.startsWith('185.252.')) {
    return { country: 'TZ', coords: DEFAULT_COUNTRY_COORDS['TZ'] };
  }
  if (ip.startsWith('185.253.')) {
    return { country: 'UG', coords: DEFAULT_COUNTRY_COORDS['UG'] };
  }
  if (ip.startsWith('185.254.')) {
    return { country: 'DZ', coords: DEFAULT_COUNTRY_COORDS['DZ'] };
  }
  if (ip.startsWith('185.255.0.')) {
    return { country: 'MA', coords: DEFAULT_COUNTRY_COORDS['MA'] };
  }
  if (ip.startsWith('185.255.1.')) {
    return { country: 'TN', coords: DEFAULT_COUNTRY_COORDS['TN'] };
  }
  if (ip.startsWith('185.255.2.')) {
    return { country: 'LY', coords: DEFAULT_COUNTRY_COORDS['LY'] };
  }
  if (ip.startsWith('185.255.3.')) {
    return { country: 'SD', coords: DEFAULT_COUNTRY_COORDS['SD'] };
  }
  if (ip.startsWith('185.255.4.')) {
    return { country: 'TD', coords: DEFAULT_COUNTRY_COORDS['TD'] };
  }
  if (ip.startsWith('185.255.5.')) {
    return { country: 'NE', coords: DEFAULT_COUNTRY_COORDS['NE'] };
  }
  if (ip.startsWith('185.255.6.')) {
    return { country: 'ML', coords: DEFAULT_COUNTRY_COORDS['ML'] };
  }
  if (ip.startsWith('185.255.7.')) {
    return { country: 'MR', coords: DEFAULT_COUNTRY_COORDS['MR'] };
  }
  if (ip.startsWith('185.255.8.')) {
    return { country: 'SN', coords: DEFAULT_COUNTRY_COORDS['SN'] };
  }
  if (ip.startsWith('185.255.9.')) {
    return { country: 'GN', coords: DEFAULT_COUNTRY_COORDS['GN'] };
  }
  if (ip.startsWith('185.255.10.')) {
    return { country: 'CI', coords: DEFAULT_COUNTRY_COORDS['CI'] };
  }
  if (ip.startsWith('185.255.11.')) {
    return { country: 'GH', coords: DEFAULT_COUNTRY_COORDS['GH'] };
  }
  if (ip.startsWith('185.255.12.')) {
    return { country: 'BF', coords: DEFAULT_COUNTRY_COORDS['BF'] };
  }
  if (ip.startsWith('185.255.13.')) {
    return { country: 'TG', coords: DEFAULT_COUNTRY_COORDS['TG'] };
  }
  if (ip.startsWith('185.255.14.')) {
    return { country: 'BJ', coords: DEFAULT_COUNTRY_COORDS['BJ'] };
  }
  if (ip.startsWith('185.255.16.')) {
    return { country: 'CM', coords: DEFAULT_COUNTRY_COORDS['CM'] };
  }
  if (ip.startsWith('185.255.17.')) {
    return { country: 'GA', coords: DEFAULT_COUNTRY_COORDS['GA'] };
  }
  if (ip.startsWith('185.255.18.')) {
    return { country: 'CG', coords: DEFAULT_COUNTRY_COORDS['CG'] };
  }
  if (ip.startsWith('185.255.19.')) {
    return { country: 'CD', coords: DEFAULT_COUNTRY_COORDS['CD'] };
  }
  if (ip.startsWith('185.255.20.')) {
    return { country: 'AO', coords: DEFAULT_COUNTRY_COORDS['AO'] };
  }
  if (ip.startsWith('185.255.21.')) {
    return { country: 'NA', coords: DEFAULT_COUNTRY_COORDS['NA'] };
  }
  if (ip.startsWith('185.255.22.')) {
    return { country: 'BW', coords: DEFAULT_COUNTRY_COORDS['BW'] };
  }
  if (ip.startsWith('185.255.23.')) {
    return { country: 'ZW', coords: DEFAULT_COUNTRY_COORDS['ZW'] };
  }
  if (ip.startsWith('185.255.24.')) {
    return { country: 'ZM', coords: DEFAULT_COUNTRY_COORDS['ZM'] };
  }
  if (ip.startsWith('185.255.25.')) {
    return { country: 'MZ', coords: DEFAULT_COUNTRY_COORDS['MZ'] };
  }
  if (ip.startsWith('185.255.26.')) {
    return { country: 'MG', coords: DEFAULT_COUNTRY_COORDS['MG'] };
  }
  if (ip.startsWith('185.255.30.')) {
    return { country: 'FJ', coords: DEFAULT_COUNTRY_COORDS['FJ'] };
  }
  if (ip.startsWith('185.255.31.')) {
    return { country: 'PG', coords: DEFAULT_COUNTRY_COORDS['PG'] };
  }
  if (ip.startsWith('185.255.43.')) {
    return { country: 'MN', coords: DEFAULT_COUNTRY_COORDS['MN'] };
  }
  if (ip.startsWith('185.255.53.')) {
    return { country: 'LK', coords: DEFAULT_COUNTRY_COORDS['LK'] };
  }
  if (ip.startsWith('185.255.54.')) {
    return { country: 'NP', coords: DEFAULT_COUNTRY_COORDS['NP'] };
  }
  if (ip.startsWith('185.255.55.')) {
    return { country: 'BT', coords: DEFAULT_COUNTRY_COORDS['BT'] };
  }
  if (ip.startsWith('185.255.56.')) {
    return { country: 'MM', coords: DEFAULT_COUNTRY_COORDS['MM'] };
  }
  if (ip.startsWith('185.255.57.')) {
    return { country: 'LA', coords: DEFAULT_COUNTRY_COORDS['LA'] };
  }
  if (ip.startsWith('185.255.58.')) {
    return { country: 'KH', coords: DEFAULT_COUNTRY_COORDS['KH'] };
  }
  
  // Default to a generic location if no match
  return { country: 'UNKNOWN', coords: [0, 0] }; // Default to 0,0 or a central point
}

export function detectAttackType(message: string, severity: string): string {
  const msg = message.toLowerCase();
  
  if (msg.includes('brute force') || msg.includes('failed login') || msg.includes('authentication failure')) {
    return 'Brute Force Attack';
  }
  
  if (msg.includes('sql injection') || msg.includes('injection')) {
    return 'SQL Injection';
  }
  
  if (msg.includes('xss') || msg.includes('cross-site scripting')) {
    return 'Cross-Site Scripting';
  }
  
  if (msg.includes('ddos') || msg.includes('denial of service')) {
    return 'DDoS Attack';
  }
  
  if (msg.includes('malware') || msg.includes('virus') || msg.includes('trojan')) {
    return 'Malware';
  }
  
  if (msg.includes('port scan') || msg.includes('network scan')) {
    return 'Network Scanning';
  }
  
  if (msg.includes('privilege escalation') || msg.includes('unauthorized access')) {
    return 'Privilege Escalation';
  }
  
  if (msg.includes('intrusion') || msg.includes('breach')) {
    return 'Intrusion Attempt';
  }
  
  if (msg.includes('phishing') || msg.includes('social engineering')) {
    return 'Phishing Attack';
  }
  
  if (severity === 'critical' || severity === 'high') {
    return 'Security Incident';
  }
  
  return 'Suspicious Activity';
}

export function determineSeverity(originalSeverity: string | undefined, message: string): 'low' | 'medium' | 'high' | 'critical' {
  // Use original severity if available
  if (originalSeverity) {
    const sev = originalSeverity.toLowerCase();
    if (sev === 'critical') return 'critical';
    if (sev === 'high') return 'high';
    if (sev === 'medium' || sev === 'warning') return 'medium';
    if (sev === 'low' || sev === 'info') return 'low';
  }
  
  // Infer severity from message content
  const msg = message.toLowerCase();
  
  if (msg.includes('critical') || msg.includes('emergency') || msg.includes('breach')) {
    return 'critical';
  }
  
  if (msg.includes('high') || msg.includes('alert') || msg.includes('attack') || msg.includes('malware')) {
    return 'high';
  }
  
  if (msg.includes('warning') || msg.includes('suspicious') || msg.includes('failed')) {
    return 'medium';
  }
  
  return 'low';
}

export async function processThreatData(
  timeRangeMinutes: number,
  maxEvents: number = 100,
  customQuery?: string
): Promise<ProcessedThreatData> {
  try {
    const api = getMCPApi();

    let allEvents: any[] = [];

    if (customQuery) {
      // Execute the custom query
      try {
        const response = await api.searchLogs(customQuery, {
          maxCount: maxEvents,
          timeRange: timeRangeMinutes
        });

        console.log('ThreatProcessor: Raw response from api.searchLogs (custom query):', JSON.stringify(response, null, 2)); // New log
        
        if (response.success && response.data) {
          console.log('ThreatProcessor: Custom query raw data (response.data):', JSON.stringify(response.data, null, 2));
          allEvents = response.data;
        }
      } catch (error) {
        console.warn(`Failed to execute custom query: ${customQuery}`, error);
      }
    } else {
      // Search for security-related events using predefined queries
      const securityQueries = [
        'failed login',
        'authentication failure',
        'brute force',
        'unauthorized access',
        'security alert',
        'attack detected',
        'suspicious activity',
        'malware',
        'intrusion'
      ];

      // Execute multiple queries to gather threat data
      for (const query of securityQueries) {
        try {
          const response = await api.searchLogs(query, {
            maxCount: Math.ceil(maxEvents / securityQueries.length),
            timeRange: timeRangeMinutes
          });

          console.log(`ThreatProcessor: Raw response from api.searchLogs (predefined query "${query}"):`, JSON.stringify(response, null, 2)); // New log
          
          if (response.success && response.data) {
            console.log(`ThreatProcessor: Predefined query "${query}" raw data (response.data):`, JSON.stringify(response.data, null, 2));
            allEvents.push(...response.data);
          }
        } catch (error) {
          console.warn(`Failed to execute query: ${query}`, error);
        }
      }
    }
    
    console.log('ThreatProcessor: All collected events before processing:', JSON.stringify(allEvents, null, 2));

    // Remove duplicates and limit results
    const uniqueEvents = Array.from(
      new Map(allEvents.map(event => [event.id || JSON.stringify(event), event])).values()
    ).slice(0, maxEvents);
    
    // Process events into threat data
    const threats: ThreatEvent[] = uniqueEvents.flatMap((event, index) => {
      // Check if the event is an aggregated result from a 'stats' query
      if (event.Source && typeof event.Count === 'number') {
        const sourceIp = event.Source;
        const count = event.Count;

        // Generate synthetic threat events based on the count
        const generatedThreats: ThreatEvent[] = [];
        for (let i = 0; i < Math.min(count, 5); i++) { // Generate up to 5 events per aggregated entry
          const targetIp = generateRandomIP(); // Target IP is unknown from aggregated data
          const sourceLocation = getCountryFromIP(sourceIp);
          const targetLocation = getCountryFromIP(targetIp);

          // Determine severity based on count
          let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
          if (count > 50000) severity = 'critical';
          else if (count > 10000) severity = 'high';
          else if (count > 1000) severity = 'medium';

          generatedThreats.push({
            id: `${event.id || `agg-threat-${index}`}-${i}`,
            sourceIp,
            targetIp,
            sourceCountry: sourceLocation.country,
            targetCountry: targetLocation.country,
            sourceCoords: sourceLocation.coords,
            targetCoords: targetLocation.coords,
            severity,
            attackType: 'Network Traffic Anomaly', // Generic attack type for aggregated data
            timestamp: new Date(Date.now() - Math.random() * timeRangeMinutes * 60 * 1000), // Random timestamp within range
            active: Math.random() > 0.5 // Randomly active for animation
          });
        }
        return generatedThreats;
      } else {
        // Process as a regular log event
        const sourceIp = event.sourceIp || event.clientIp || event.remoteAddr || generateRandomIP();
        const targetIp = event.targetIp || event.serverIp || event.destinationIp || generateRandomIP();
        
        const sourceLocation = getCountryFromIP(sourceIp);
        const targetLocation = getCountryFromIP(targetIp);
        
        const severity = determineSeverity(event.severity, event.message || '');
        const attackType = detectAttackType(event.message || '', severity);
        
        return [{
          id: event.id || `threat-${index}`,
          sourceIp,
          targetIp,
          sourceCountry: sourceLocation.country,
          targetCountry: targetLocation.country,
          sourceCoords: sourceLocation.coords,
          targetCoords: targetLocation.coords,
          severity,
          attackType,
          timestamp: new Date(event.timestamp || Date.now()),
          active: Math.random() > 0.7 // Randomly mark some as active
        }];
      }
    });
    
    const countries = Array.from(new Set([
      ...threats.map(t => t.sourceCountry),
      ...threats.map(t => t.targetCountry)
    ]));
    
    const attackTypes = Array.from(new Set(threats.map(t => t.attackType)));
    
    return {
      threats,
      totalCount: threats.length,
      countries,
      attackTypes
    };
    
  } catch (error) {
    console.error('Error processing threat data:', error);
    
    // Return mock data for demonstration
    return generateMockThreatData();
  }
}

function generateRandomIP(): string {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

function generateMockThreatData(): ProcessedThreatData {
  const mockThreats: ThreatEvent[] = [];
  const countries = Object.keys(DEFAULT_COUNTRY_COORDS);
  const attackTypes = [
    'Brute Force Attack',
    'SQL Injection',
    'DDoS Attack',
    'Malware',
    'Network Scanning',
    'Privilege Escalation',
    'Phishing Attack'
  ];
  const severities: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
  
  for (let i = 0; i < 50; i++) {
    const sourceCountry = countries[Math.floor(Math.random() * countries.length)];
    const targetCountry = countries[Math.floor(Math.random() * countries.length)];
    
    if (sourceCountry !== targetCountry) {
      mockThreats.push({
        id: `mock-threat-${i}`,
        sourceIp: generateRandomIP(),
        targetIp: generateRandomIP(),
        sourceCountry,
        targetCountry,
        sourceCoords: DEFAULT_COUNTRY_COORDS[sourceCountry],
        targetCoords: DEFAULT_COUNTRY_COORDS[targetCountry],
        severity: severities[Math.floor(Math.random() * severities.length)],
        attackType: attackTypes[Math.floor(Math.random() * attackTypes.length)],
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        active: Math.random() > 0.7
      });
    }
  }
  
  return {
    threats: mockThreats,
    totalCount: mockThreats.length,
    countries,
    attackTypes
  };
}
