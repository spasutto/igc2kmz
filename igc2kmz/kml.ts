
//regex   : class ([^(\s]+)\(_?([^)]+)\): pass\n
//replace : export class $1 extends $2 { }\n
import { RGBA } from "./color";
import { RandomIdGenerator } from "./util";

export namespace KML {

  class Attribute {
    name: string = "";
    value: string = "";
    constructor(name: string, value: string) {
      this.name = name;
      this.value = value;
    }
  }

  class Namespace extends Attribute {
    defaultns: boolean = false;

    get uri(): string {
      return this.value;
    }

    constructor(name: string | null, uri: string, defaultns: boolean = false) {
      super(name ?? "", uri)
      this.defaultns = name == null || this.defaultns;
    }
  }

  const DEFAULT_KML_NAMESPACE = "http://earth.google.com/kml/";

  export class Element {
    protected namespaces: Record<string, Namespace> = {};
    protected name: string = "";
    protected attributes: Attribute[] = [];
    protected id: string = "";

    protected constructor(name?: string,
      namespace?: Namespace) {
      this.name = name ?? this.constructor.name;
      if (namespace) {
        this.namespaces[namespace.name] = namespace;
      }
    }

    get Id(): string {
      if ((this.id ?? "").trim().length > 0) {
        return this.id;
      }
      this.id = RandomIdGenerator.makeid(5);
      return this.id;
    }

    get url(): string {
      return '#' + this.Id;
    }

    add_attr(attr: Attribute) {
      this.attributes.push(attr);
    }

    protected element(): HTMLElement {
      let doc = document.implementation.createDocument(null, this.name, null);
      for (let key in this.namespaces) {
        let nskey = ':' + key;
        if (this.namespaces[key].defaultns) {
          nskey = "";
        }
        doc.documentElement.setAttribute('xmlns' + nskey, this.namespaces[key].uri);
      }
      for (let i = 0; i < this.attributes.length; i++) {
        doc.documentElement.setAttribute(this.attributes[i].name, this.attributes[i].value);
      }
      return doc.documentElement;
    }

    serialize(): string {
      //console.log(this.element());
      return '<?xml version="1.0" encoding="UTF-8"?>' +
        new XMLSerializer().serializeToString(this.element());
    }
  }

  export class CompoundElement extends Element {
    protected childs: Element[] = [];
    constructor(childs:Element[] = []) {
      super();
      this.childs = childs;
    }

    add(child: Element) {
      this.childs.push(child);
    }

    protected override element(): HTMLElement {
      let root = super.element();
      for (let i = 0; i < this.childs.length; i++) {
        root.appendChild(this.childs[i].element());
      }
      return root;
    }
  }

  export class SimpleElement extends Element {
    content: string;
    constructor(name?:string, content?: string) {
      super(name);
      this.content = content ?? '';
    }

    protected override element(): HTMLElement {
      let doc = document.implementation.createDocument(null, this.name, null);
      let nodename = doc.createTextNode(this.content);
      doc.documentElement.appendChild(nodename);
      return doc.documentElement;
    }
  }
  export class CDATA extends SimpleElement {
    constructor(name?:string, content?: string) {
      super(name, content);
    }

    protected override element(): HTMLElement {
      let doc = document.implementation.createDocument(null, this.name, null);
      let nodename = doc.createCDATASection(this.content);
      doc.documentElement.appendChild(nodename);
      return doc.documentElement;
    }
  }
  export class altitude extends SimpleElement { }
  export class altitudeMode extends SimpleElement { }
  export class BalloonStyle extends CompoundElement { }
  export class begin extends SimpleElement { }
  export class bgColor extends SimpleElement { }
  export class Camera extends CompoundElement { }
  export class color extends SimpleElement {
    constructor(rgba: RGBA) {
      super(undefined, rgba.toHexString());
    }
  }
  export class coordinates extends SimpleElement {
    //TODO
  }
  export class Data extends CompoundElement {
    constructor(value: number) {
      super([new SimpleElement('value', value.toString())]);
    }
  }

  export class description extends SimpleElement { }
  export class Document extends CompoundElement { }
  export class end extends SimpleElement { }
  export class ExtendedData extends CompoundElement {
    constructor(dict: Record<string, number>) {
      super([]);
      for (let prop in dict) this.add(new Data(dict[prop]));
    }
  }
  export class extrude extends SimpleElement { }
  export class Folder extends CompoundElement { }
  export class heading extends SimpleElement { }
  export class href extends SimpleElement { }

  export class Icon extends CompoundElement {
    /*
    def character(cls, c, extra=''):
        if ord('1') <= ord(c) <= ord('9'):
            icon = (ord(c) - ord('1')) % 8 + 16 * ((ord(c) - ord('1')) / 8)
            return cls.palette(3, icon, extra)
        elif ord('A') <= ord(c) <= ord('Z'):
            icon = (ord(c) - ord('A')) % 8 + 16 * ((31 - ord(c) + ord('A')) / 8)
            return cls.palette(5, icon, extra)
        else:
            return cls.default()
    */
    /*
    def palette(cls, pal, icon, extra=''):
        href = 'http://maps.google.com/mapfiles/kml/pal%d/icon%d%s.png' \
               % (pal, icon, extra)
        return cls(href=href)
    */
    static palette(pal: number, icon: number, extra: string = ''):Icon {
      return new Icon([new SimpleElement('href', `http://maps.google.com/mapfiles/kml/pal${pal}/icon${icon}${extra}.png`)]);
    }
  }

  export class IconStyle extends CompoundElement { }

  export class KML extends CompoundElement {
    constructor(version: number, child:Element) {
      super([child]);//"kml", DEFAULT_KML_NAMESPACE
      this.name = "kml";
      this.namespaces["default"] = new Namespace(null, DEFAULT_KML_NAMESPACE + version.toString());
    }
  }

  export class LabelStyle extends CompoundElement { }
  export class latitude extends SimpleElement { }
  export class LineString extends CompoundElement { }
  export class LineStyle extends CompoundElement { }
  export class ListStyle extends CompoundElement { }
  export class listItemType extends SimpleElement { }
  export class longitude extends SimpleElement { }
  export class MultiGeometry extends CompoundElement { }
  export class name extends SimpleElement { }
  export class open extends SimpleElement {
    constructor(isopen: boolean) {
      super(undefined, isopen ? '1' : '0');
    }
  }
  export class overlayXY extends SimpleElement {
    constructor(x: number, xunits: string, y: number, yunits: string) {
      super();
      this.add_attr(new Attribute('x', x.toString()));
      this.add_attr(new Attribute('y', x.toString()));
      this.add_attr(new Attribute('xunits', xunits));
      this.add_attr(new Attribute('yunits', yunits));
    }
  }
  export class Placemark extends CompoundElement { }
  export class Point extends CompoundElement { }
  export class PolyStyle extends CompoundElement { }
  export class roll extends SimpleElement { }
  export class scale extends SimpleElement { }
  export class ScreenOverlay extends CompoundElement { }
  export class screenXY extends overlayXY { }
  export class size extends overlayXY { }
  export class Snippet extends SimpleElement { }
  export class Style extends CompoundElement {
    constructor(childs:Element[]) {
      super(childs);
      this.add_attr(new Attribute("id", this.Id));
    }
  }

   export class styleUrl extends SimpleElement { }
   export class tessellate extends SimpleElement { }
   export class text extends SimpleElement { }
   export class tilt extends SimpleElement { }
   export class TimeSpan extends CompoundElement {
    constructor(begin: Date, end: Date) {
      super([new SimpleElement("begin", begin.toISOString()), new SimpleElement("end", end.toISOString())]);
    }
  }
   export class value extends SimpleElement { }
   export class visibility extends SimpleElement { }
   export class when extends SimpleElement { }
   export class width extends SimpleElement { }

}