
import * as JSZip from 'jszip';
import { KML } from './kml';

export type KMZFile = JSZip;

export class KMZ {
  elements: KML.Element[] = [];
  roots: KML.Element[];
  constructor(elements?: KML.Element[]) {
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

  add(args: (KML.Element | KMZ)[]): KMZ {
    args.forEach(arg => {
      if (this.elements[0] instanceof KML.CompoundElement) {
        if (arg instanceof KMZ) {
          arg.elements.forEach(elm => (this.elements[0] as KML.CompoundElement).add(elm));
          this.add_roots(arg.roots);
          // TODO ajout files
        } else {
          this.elements[0].add(arg);
        }
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

  getKMZ(version: number): KMZFile {
    const j: JSZip = new (<any>JSZip).default();
    let document = new KML.Document();
    this.roots.forEach(root => document.add(root));
    this.elements.forEach(elm => document.add(elm));
    let kml = new KML.KML(version, document);
    //console.log(kml.serialize(true));
    //console.log(kml);
    j.file('doc.kml', kml.serialize());
    return j;
  }
}
