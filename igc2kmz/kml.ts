
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

  const DEFAULT_KML_NAMESPACE = new Namespace(null, "http://earth.google.com/kml/2.2"); // TODO version

  export class Element {
    protected namespaces: Record<string, Namespace> = {};
    protected name: string = "";

    protected constructor(name?: string,
      namespace?: Namespace) {
      this.name = name ?? this.constructor.name;
      if (namespace) {
        this.namespaces[namespace.name] = namespace;
      }
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
    protected attributes: Attribute[] = [];
    constructor(childs:Element[] = []) {
      super();
      this.childs = childs;
    }

    add(child: Element) {
      this.childs.push(child);
    }

    add_attr(attr: Attribute) {
      this.attributes.push(attr);
    }

    protected override element(): HTMLElement {
      let root = super.element();
      for (let i = 0; i < this.childs.length; i++) {
        root.appendChild(this.childs[i].element());
      }
      for (let i = 0; i < this.attributes.length; i++) {
        root.setAttribute(this.attributes[i].name, this.attributes[i].value);
      }
      return root;
    }
  }

  export class SimpleElement extends Element {
    content: string;
    constructor(name:string, content: string) {
      super(name);
      this.content = content;
    }

    protected override element(): HTMLElement {
      let doc = document.implementation.createDocument(null, this.name, null);
      let nodename = doc.createTextNode(this.content);
      doc.documentElement.appendChild(nodename);
      return doc.documentElement;
    }
  }

  export class KML extends CompoundElement {
    root: Element;
    constructor(childs:Element[]) {
      super(childs);//"kml", DEFAULT_KML_NAMESPACE
      this.name = "kml";
      this.namespaces["default"] = DEFAULT_KML_NAMESPACE;
      this.root = new Element("Document");
      this.childs.push(this.root);
    }
  }

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

  export class BalloonStyle extends CompoundElement { }
  export class IconStyle extends CompoundElement { }
  export class LabelStyle extends CompoundElement { }
  export class latitude extends SimpleElement { }
  export class LineString extends CompoundElement { }
  export class LineStyle extends CompoundElement { }
  export class ListStyle extends CompoundElement { }
  export class listItemType extends SimpleElement { }
  export class longitude extends SimpleElement { }
  export class MultiGeometry extends CompoundElement { }
  export class name extends SimpleElement { }
  export class open extends SimpleElement { }
  export class overlayXY extends SimpleElement { }
  export class Placemark extends CompoundElement { }
  export class Point extends CompoundElement { }
  export class PolyStyle extends CompoundElement { }
  export class roll extends SimpleElement { }
  export class scale extends SimpleElement { }
  export class ScreenOverlay extends CompoundElement { }
  export class screenXY extends SimpleElement { }
  export class size extends SimpleElement { }
  export class Snippet extends SimpleElement { }
  export class Style extends CompoundElement {
    id: string;
    constructor(childs:Element[]) {
      super(childs);
      this.id = RandomIdGenerator.makeid();
      this.add_attr(new Attribute("id", this.id));
    }
  }

   export class styleUrl extends SimpleElement { }
   export class tessellate extends SimpleElement { }
   export class text extends SimpleElement { }
   export class tilt extends SimpleElement { }
   export class TimeSpan extends CompoundElement { }
   export class value extends SimpleElement { }
   export class visibility extends SimpleElement { }
   export class when extends SimpleElement { }
   export class width extends SimpleElement { }

}