
import IGCParser = require("igc-parser")
import { FlightConvert, I2KConfiguration, defaultconfig } from "./init";
import { Flight } from "./flight";
import { Track } from "./track";
import { Task } from "./task";
import { SimpleCanvas } from "./simplecanvas";
import { Photo } from "./photo";

export function igc2kmz(cv: SimpleCanvas, igccontents: string[] | string, infilenames?: string[] | string, taskcontent?: string, photoscontents?: Buffer[], photosfilenames?: string[], options: I2KConfiguration = defaultconfig): Promise<ArrayBuffer> {
  let config: I2KConfiguration = { ...defaultconfig, ...options };
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
  let promises: Promise<Photo>[] = [];
  if (flights.length > 0 && photosfilenames) {
    for (let i = 0; i < photosfilenames.length; i++) {
      if (!photoscontents || photoscontents.length <= i) continue;
      let image = photoscontents[i];
      promises.push(Photo.parse(photosfilenames[i], image));
    }
  }
  return new Promise<ArrayBuffer>(res => {
    Promise.all(promises).then(photos => {
      if (flights.length > 0 && photos.length > 0) {
        flights[flights.length - 1].photos.push(...photos);
      }
      let fcv = new FlightConvert(cv);
      // TODO root KML
      fcv.flights2kmz(flights, config, task).then(res);
    });
  });
}
