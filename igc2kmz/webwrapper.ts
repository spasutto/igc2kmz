
import IGCParser = require("igc-parser")
import { FlightConvert } from "./init";
import { Flight } from "./flight";
import { Track } from "./track";
import { SimpleCanvas } from './simplecanvas';
import { saveAs } from 'file-saver';
import { Task } from "./task";

declare global {
    interface Window { igc2kmz: any; }
}

class WebCanvas implements SimpleCanvas {
  readonly fontname: string = 'Source Sans Pro';
  create_canvas(width: number, height: number): Promise<HTMLCanvasElement> {
    return new Promise(res => {
      let cv = document.createElement('canvas');
      cv.setAttribute('width', width.toString());
      cv.setAttribute('height', height.toString());
      res(cv);
    });
  }
  get_base64(cv: HTMLCanvasElement): Promise<string> {
    return new Promise(res => {
      let imgdata = cv.toDataURL();
      res(imgdata.substring(imgdata.indexOf('base64,') + 'base64,'.length));
    });
  }
}

function igc2kmz(igccontents: string[] | string, filenames?: string[] | string, tz_offset?: number, taskcontent?: string): Promise<string> {
  //console.log(Task.loadTask('{  "T": "W",  "V": 2,  "t": [    {      "z": "ejra@mgbpG_pA",      "n": "th7410"    },    {      "z": "mxna@e{`pG_kB",      "n": "th7430"    },    {      "z": "q`xa@mjdpGabA",      "n": "th6740"    },    {      "z": "_{pa@kdapGk}A",      "n": "th6770"    }  ]}'));
  //console.log(Task.loadTask('{"version":1,"taskType":"CLASSIC","turnpoints":[{"radius":0,"waypoint":{"lon":-76.21138000488281,"lat":4.403883457183838,"altSmoothed":1860,"name":"D01","description":"AGUAPANELA"},"type":"TAKEOFF"},{"radius":3000,"waypoint":{"lon":-76.10133361816406,"lat":4.4051666259765625,"altSmoothed":1000,"name":"B15","description":"PUENTE ROLDANILLO"},"type":"SSS"},{"radius":3000,"waypoint":{"lon":-75.96849822998047,"lat":4.5879998207092285,"altSmoothed":970,"name":"G02","description":""}},{"radius":17000,"waypoint":{"lon":-76.16603088378906,"lat":4.177330017089844,"altSmoothed":972,"name":"G05","description":""}},{"radius":2000,"waypoint":{"lon":-76.06043243408203,"lat":4.426783084869385,"altSmoothed":940,"name":"G03","description":"GOL ZARZAL NORTE"},"type":"ESS"},{"radius":500,"waypoint":{"lon":-76.06043243408203,"lat":4.426783084869385,"altSmoothed":940,"name":"G03","description":"GOL ZARZAL NORTE"}}],"sss":{"type":"RACE","direction":"EXIT","timeGates":["16:30:00Z"]},"goal":{"type":"CYLINDER","deadline":"21:00:00Z"},"earthModel":"WGS84"}'));
  //console.log(Task.loadTask('{"t":[{"z":"b`dpMgc{YgsB?","n":"D01","d":"AGUAPANELA"},{"z":"hpnoMik{Yo}@ozD","n":"B15","t":2,"d":"PUENTE ROLDANILLO"},{"z":"brtnM_b_[s{@ozD","n":"G02"},{"z":"td{oMi{nXw{@oe`@","n":"G05"},{"z":"tpfoMkr_Zwy@_|B","n":"G03","t":3,"d":"GOL ZARZAL NORTE"},{"z":"tpfoMkr_Zwy@g^","n":"G03","d":"GOL ZARZAL NORTE"}],"version":2,"s":{"t":1,"g":["16:30:00Z"],"d":1},"g":{"t":2,"d":"21:00:00Z"},"taskType":"CLASSIC"}'));
  return new Promise<string>(res => {
    igccontents = Array.isArray(igccontents) ? igccontents : [igccontents ?? ''];
    filenames = Array.isArray(filenames) ? filenames : [filenames ?? ''];
    if (filenames.length < igccontents.length) {
      for (let i = filenames.length; i < igccontents.length; i++) {
        filenames.push(`track${i + 1}.igc`);
      }
    }
    let flights = [];
    for (let i = 0; i < igccontents.length; i++) {
      let igc = IGCParser.parse(igccontents[i], { lenient: true });
      flights.push(new Flight(new Track(igc, filenames[i])));
    }
    let task: Task | null = null;
    if (taskcontent) {
      task = Task.loadTask(taskcontent);
    }
    let cv = new WebCanvas();
    let fcv = new FlightConvert(cv);
    // TODO root KML
    fcv.flights2kmz(flights, tz_offset, task).then(kmz => {
      let outfilename = 'track.kmz';
      if (Array.isArray(filenames) && filenames.length > 0) {
        let i = filenames[0].lastIndexOf('.');
        if (i >= 0) {
          outfilename = filenames[0].substring(0, i) + '.kmz';
        } else {
          outfilename = filenames[0] + '.kmz';
        }
      }
      if (kmz) {
        saveAs(new Blob([kmz]), outfilename);
      }
      res(outfilename);
    });
  });
}

if (typeof window === 'object') {
  window.igc2kmz = igc2kmz;
}
