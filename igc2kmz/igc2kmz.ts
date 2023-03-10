
import IGCParser = require("igc-parser")
import { FlightConvert } from "./init";
import { Flight } from "./flight";
import { Track } from "./track";
import { Task } from "./task";
import { SimpleCanvas } from "./simplecanvas";

export function igc2kmz(cv: SimpleCanvas, igccontents: string[] | string, infilenames?: string[] | string, tz_offset?: number, taskcontent?: string): Promise<ArrayBuffer> {
  igccontents = Array.isArray(igccontents) ? igccontents : [igccontents ?? ''];
  infilenames = Array.isArray(infilenames) ? infilenames : [infilenames ?? ''];
  if (infilenames.length < igccontents.length) {
    for (let i = infilenames.length; i < igccontents.length; i++) {
      infilenames.push(`track${i + 1}.igc`);
    }
  }
  let flights: Flight[] = [];
  for (let i = 0; i < igccontents.length; i++) {
    let igc = IGCParser.parse(igccontents[i], { lenient: true });
    flights.push(new Flight(new Track(igc, infilenames[i])));
  }
  //console.log(flight);
  let task: Task | null = null;
  if (taskcontent) {
    task = Task.loadTask(taskcontent);
  }
  let fcv = new FlightConvert(cv);
  // TODO root KML
return fcv.flights2kmz(flights, tz_offset, task);
}
