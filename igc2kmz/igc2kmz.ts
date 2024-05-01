
import IGCParser = require("igc-parser")
import { FlightConvert, I2KConfiguration, defaultconfig } from "./init";
import { Flight } from "./flight";
import { Track } from "./track";
import { Task } from "./task";
import { SimpleCanvas } from "./simplecanvas";
import { Photo } from "./photo";

const IGC2KMZ_VERSION: string = "__IGC2KMZ_VERSION__";
const IGC2KMZ_BUILDDATE: string = "__IGC2KMZ_BUILDDATE__";
const IGC2KMZ_DEFAULT_CONFIGURATION: I2KConfiguration = defaultconfig;
export { IGC2KMZ_VERSION, IGC2KMZ_BUILDDATE, IGC2KMZ_DEFAULT_CONFIGURATION };

export class IGC2KMZ {
  cv: SimpleCanvas;
  options: I2KConfiguration;
  igccontents: [string, string][] = [];
  filenames: string[] = [];
  taskcontent: string | null = null;
  photos: [string, Buffer][] = [];
  constructor(cv: SimpleCanvas, options: I2KConfiguration = defaultconfig) {
    this.cv = cv;
    this.options = { ...defaultconfig, ...options };
  }
  setOptions(options: I2KConfiguration) {
    this.options = { ...defaultconfig, ...options };
  }
  addIGC(content: string, filename?: string) {
    this.igccontents.push([filename ?? `track${this.igccontents.length}.igc`, content]);
  }
  addTask(taskcontent: string) {
    this.taskcontent = taskcontent;
  }
  addPhoto(content: Buffer, filename?: string) {
    this.photos.push([filename ?? `track${this.photos.length + 1}.igc`, content]);
  }
  clear() {
    this.photos = this.filenames = this.igccontents = [];
    this.taskcontent = null;
  }

  #convert(kml:boolean = false):Promise<ArrayBuffer|string> {
    let flights: Flight[] = [];
    let firstlaunch = -1;
    for (let i = 0; i < this.igccontents.length; i++) {
      let igc = IGCParser.parse(this.igccontents[i][1], { lenient: true });
      if (this.options.same_start && igc.fixes.length > 0) {
        if (firstlaunch < 0) {
          firstlaunch = igc.fixes[0].timestamp;
        } else {
          let offset = firstlaunch - igc.fixes[0].timestamp;
          igc.fixes.forEach(f => f.timestamp += offset);
        }
      }
      flights.push(new Flight(new Track(igc, this.igccontents[i][0], this.options), this.igccontents.length > 1));
    }
    let task: Task | null = null;
    if (this.taskcontent) {
      task = Task.loadTask(this.taskcontent);
    }
    let promises: Promise<Photo>[] = [];
    if (flights.length > 0 && this.photos) {
      this.photos.forEach(photo => {
        promises.push(Photo.parse(photo[0], photo[1]));
      });
    }
    return new Promise<ArrayBuffer|string>(res => {
      Promise.all(promises).then(photos => {
        if (flights.length > 0 && photos.length > 0) {
          flights[flights.length - 1].photos.push(...photos);
        }
        let fcv = new FlightConvert(this.cv);
        // TODO root KML
        fcv.convert(flights, this.options, task, kml).then(res);
      });
    });
  }

  toKMZ(): Promise<ArrayBuffer> {
    return this.#convert() as Promise<ArrayBuffer>;
  }

  toKML() {
    return this.#convert(true) as Promise<string>;
  }
}
