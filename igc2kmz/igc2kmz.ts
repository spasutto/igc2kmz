
//ZIP : https://stackoverflow.com/a/49836948
//typescript? https://code.visualstudio.com/docs/languages/typescript
//vs code task : https://code.visualstudio.com/docs/editor/tasks


import IGCParser = require("igc-parser")
import { IGCFile } from 'igc-parser'
import { KMZ } from "./kmz";
import { Flight } from "./init";
import { Track } from "./track";

export function igc2kmz(igccontent: string): KMZ {
  let igc = IGCParser.parse(igccontent);
  let flight = new Flight(new Track(igc));
  console.log(flight);
  let kmz: KMZ = new KMZ();
  let zip = kmz.getKMZ();
  console.log(zip);
  kmz.download(zip);
  return kmz;
}
