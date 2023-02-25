
import * as JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { KML } from './kml';

export class KMZ {
  elements: KML.CompoundElement[] = [];
  roots: KML.Element[];
  constructor(elements?: KML.CompoundElement[]) {
    if (elements) {
      this.elements = elements;
    }
    this.roots = [];
  }

  add_roots(roots: KML.Element[]):KMZ {
    roots.forEach(root => this.roots.push(root));
    return this;
  }

  add_root(root: KML.Element):KMZ {
    this.roots.push(root);
    return this;
  }

  add(args: (KML.Element|KMZ)[]):KMZ {
    args.forEach(arg => {
      if (arg instanceof KMZ) {
        arg.elements.forEach(elm => this.elements[0].add(elm));
        this.add_roots(arg.roots);
        // TODO ajout files
      } else {
        this.elements[0].add(arg);
      }
    });
    return this;
  }

  add_siblings(args: (KML.CompoundElement|KMZ)[]):KMZ {
    args.forEach(arg => {
      if (arg instanceof KMZ) {
        arg.elements.forEach(elm => this.elements.push(elm));
        this.add_roots(arg.roots);
        // TODO ajout files
      } else {
        this.elements.push(arg);
      }
    });
    return this;
  }

  getKMZ(version: number): JSZip {
    const j: JSZip = new (<any>JSZip).default();
    let document = new KML.Document();
    this.roots.forEach(root => document.add(root));
    this.elements.forEach(elm => document.add(elm));
    let kml = new KML.KML(version, document);
    console.log(kml.serialize());
    console.log(kml);
    j.file('doc.kml', kml.serialize());
    return j;
  }

  download(zip: JSZip): void {
    zip.generateAsync({ type: "blob" }).then(function (content) {
      saveAs(content, "track.zip");
    });
    //var blob = new Blob(["Hello, world!"], { type: "text/plain;charset=utf-8" });
    //saveAs(blob, "hello world.txt");
  }
}