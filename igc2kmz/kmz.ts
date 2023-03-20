
import * as JSZip from 'jszip';
import { KML } from './kml';

export type KMZFile = JSZip;

export class KMZResource {
  path: string;
  content: string | Buffer;
  constructor(path: string, content: string | Buffer) {
    this.path = path;
    this.content = content;
  }
}

export class KMZ {
  elements: KML.Element[] = [];
  roots: KML.Element[];
  files: KMZResource[] = [];
  constructor(elements?: KML.Element[]) {
    if (elements) {
      this.elements = elements;
    }
    this.roots = [];
  }

  add_roots(roots: KML.Element[]): KMZ {
    roots.forEach(root => this.roots.push(root));
    return this;
  }

  add_root(root: KML.Element): KMZ {
    this.roots.push(root);
    return this;
  }

  add_file(filename: string, content: string | Buffer): KMZ {
    this.files.push(new KMZResource(filename, content));
    return this;
  }

  add_files(files: KMZResource[]): KMZ {
    files.forEach(f => this.files.push(f));
    return this;
  }

  add(args: (KML.Element | KMZ)[]): KMZ {
    args.forEach(arg => {
      if (this.elements[0] instanceof KML.CompoundElement) {
        if (arg instanceof KMZ) {
          arg.elements.forEach(elm => (this.elements[0] as KML.CompoundElement).add(elm));
          this.add_roots(arg.roots);
          this.add_files(arg.files);
        } else {
          this.elements[0].add(arg);
        }
      }
    });
    return this;
  }

  add_siblings(args: (KML.CompoundElement | KMZ)[]): KMZ {
    args.forEach(arg => {
      if (arg instanceof KMZ) {
        arg.elements.forEach(elm => this.elements.push(elm));
        this.add_roots(arg.roots);
        this.add_files(arg.files);
      } else {
        this.elements.push(arg);
      }
    });
    return this;
  }

  get_data(version: number, serialize: boolean = false): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>(res => {
      const j: JSZip = new (<any>JSZip).default();
      let document = new KML.Document();
      this.roots.forEach(root => document.add(root));
      this.elements.forEach(elm => document.add(elm));
      let kml = new KML.KML(version, document);
      if (serialize) console.log(kml.serialize(true));
      //console.log(kml);
      j.file('doc.kml', kml.serialize());
      for (let i = 0; i < this.files.length; i++) {
        j.file(this.files[i].path, this.files[i].content, { base64: typeof this.files[i].content == 'string' });
      }
      j.generateAsync({ type: "arraybuffer", compression: "DEFLATE" }).then(buff => res(buff));
    });
  }
}
