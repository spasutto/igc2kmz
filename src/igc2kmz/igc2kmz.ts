
//ZIP : https://stackoverflow.com/a/49836948
//typescript? https://code.visualstudio.com/docs/languages/typescript
//vs code task : https://code.visualstudio.com/docs/editor/tasks

//const IGCParser = require('igc-parser');
import IGCParser = require("igc-parser")
import {IGCFile} from 'igc-parser'

function sayHello(name: string, content: string): IGCFile {
    console.log(`Hello ${name}!`);
    let pouet = IGCParser.parse(content);
    return pouet;
}

/*
class IGC2KMZ {
    constructor(omh) {
        this.init();
        if (omh) {
            this.addData(omh);
        }
    }

    get valid() {
        return this.data && typeof this.data == 'object';
    }

    init() {
        this.data = null;
    }

    addData(data) {
        let ret = false;
        return ret;
    }

    toGPX() {
        let gpx = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        gpx += "<gpx version=\"1.1\" creator=\"OMX2GPX\" xmlns=\"http://www.topografix.com/GPX/1/1\">\n";
        gpx += "\t<metadata>\n\t\t<author>\n\t\t\t<name>OMX2GPX</name>\n\t\t</author>\n\t</metadata>\n";
        gpx += "\t<trk>\n\t\t<trkseg>\n";
        for (let i=0; i<this.points.length; i++) {
            gpx += "\t\t<trkpt lat=\""+this.points[i].lat+"\" lon=\""+this.points[i].lon+"\">\n";
            gpx += "\t\t\t<time>"+this.points[i].time.toISOString()+"</time>\n";
            gpx += "\t\t</trkpt>\n";
        }
        gpx += "\t\t</trkseg>\n\t</trk>\n</gpx>\n";
        return gpx;
    }
}
*/