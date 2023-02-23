
import { igc2kmz } from "./igc2kmz";

export {igc2kmz}

declare global {
    interface Window { igc2kmz: any; }
}

if (typeof window === 'object') {
  window.igc2kmz = igc2kmz;
}
