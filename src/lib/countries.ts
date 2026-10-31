// Dial codes for the phone step, most used first after the person's own country.
export const countries = [
  ["US", "United States", "1"], ["CA", "Canada", "1"], ["GB", "United Kingdom", "44"], ["FR", "France", "33"], ["DE", "Germany", "49"],
  ["ES", "Spain", "34"], ["IT", "Italy", "39"], ["PT", "Portugal", "351"], ["NL", "Netherlands", "31"], ["BE", "Belgium", "32"],
  ["CH", "Switzerland", "41"], ["AT", "Austria", "43"], ["IE", "Ireland", "353"], ["LU", "Luxembourg", "352"], ["MC", "Monaco", "377"],
  ["DK", "Denmark", "45"], ["SE", "Sweden", "46"], ["NO", "Norway", "47"], ["FI", "Finland", "358"], ["PL", "Poland", "48"],
  ["CZ", "Czechia", "420"], ["GR", "Greece", "30"], ["HR", "Croatia", "385"], ["RS", "Serbia", "381"], ["BA", "Bosnia and Herzegovina", "387"],
  ["ME", "Montenegro", "382"], ["SI", "Slovenia", "386"], ["HU", "Hungary", "36"], ["RO", "Romania", "40"], ["BG", "Bulgaria", "359"],
  ["TR", "Turkey", "90"], ["UA", "Ukraine", "380"], ["IL", "Israel", "972"], ["AE", "United Arab Emirates", "971"], ["SA", "Saudi Arabia", "966"],
  ["QA", "Qatar", "974"], ["MA", "Morocco", "212"], ["DZ", "Algeria", "213"], ["TN", "Tunisia", "216"], ["EG", "Egypt", "20"],
  ["SN", "Senegal", "221"], ["CI", "Côte d'Ivoire", "225"], ["CM", "Cameroon", "237"], ["NG", "Nigeria", "234"], ["GH", "Ghana", "233"],
  ["KE", "Kenya", "254"], ["ZA", "South Africa", "27"], ["MX", "Mexico", "52"], ["BR", "Brazil", "55"], ["AR", "Argentina", "54"],
  ["CO", "Colombia", "57"], ["CL", "Chile", "56"], ["PE", "Peru", "51"], ["HT", "Haiti", "509"], ["IN", "India", "91"],
  ["CN", "China", "86"], ["JP", "Japan", "81"], ["KR", "South Korea", "82"], ["SG", "Singapore", "65"], ["TH", "Thailand", "66"],
  ["PH", "Philippines", "63"], ["ID", "Indonesia", "62"], ["VN", "Vietnam", "84"], ["AU", "Australia", "61"], ["NZ", "New Zealand", "64"],
] as const;

export const flag = (iso: string) => String.fromCodePoint(...[...iso].map((c) => 0x1f1a5 + c.charCodeAt(0)));

// The phone number as we store it: + then digits only.
export const fullPhone = (dial: string, number: string) => `+${dial}${number.replace(/\D/g, "").replace(/^0+/, "")}`;
