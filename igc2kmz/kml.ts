
//regex   : class ([^(\s]+)\(_?([^)]+)\): pass\n
//replace : export class $1 extends $2 { }\n
import { RGBA } from "./color";
import { Coord } from "./coord";
import { RandomIdGenerator } from "./util";

export namespace KML {

  class Attribute {
    name: string = '';
    value: string = '';
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
      if (defaultns === true) name = null;
      super(name ?? '', uri);
      this.defaultns = name == null || defaultns;
    }
  }

  const SPACES_INDENT = 2;

  export class Element {
    protected namespaces: Record<string, Namespace> = {};
    protected name: string = '';
    nsprefix: string | null = null;
    protected attributes: Attribute[] = [];
    protected id: string = '';

    protected constructor(name?: string, nsprefix: string | null = null) {
      this.name = name ?? this.constructor.name;
      this.nsprefix = nsprefix;
    }

    get Id(): string {
      if ((this.id ?? "").trim().length > 0) {
        return this.id;
      }
      this.id = RandomIdGenerator.makeid(5);
      this.add_attr("id", this.id);
      return this.id;
    }

    get url(): string {
      return '#' + this.Id;
    }

    add_ns(name: string | null, uri: string) {
      this.namespaces[name ?? 'default'] = new Namespace(name, uri);;
    }

    add_attr(name: string, value: string) {
      //TODO : éventuellement contrôle de duplicité
      this.attributes.push(new Attribute(name, value));
    }

    serialize(indent: boolean = false, level: number = 0): string {
      let name = ((this.nsprefix ?? '').trim().length > 0 ? this.nsprefix + ':' : '') + this.name;
      let result: string = (indent ? ' '.repeat(level * SPACES_INDENT) : '') + '<' + name;
      for (let key in this.namespaces) {
        let nskey = '';
        if (!this.namespaces[key].defaultns) {
          nskey = ':' + this.namespaces[key].name;
        }
        result += ` xmlns${nskey}="${this.namespaces[key].uri}"`;
      }
      for (let i = 0; i < this.attributes.length; i++) {
        result += ` ${this.attributes[i].name}="${this.attributes[i].value}"`;
      }
      result += '></' + name + '>';
      return result;
    }
  }

  export class Comment extends Element {
    text: string;
    constructor(text: string) {
      super();
      this.text = text ?? "";
    }
    override serialize(indent?: boolean, level?: number): string {
      return `<!--${this.text}-->`;
    }
  }
  export class CompoundElement extends Element {
    protected childs: Element[] = [];
    constructor(childs: Element[] = []) {
      super();
      this.childs = childs;
    }

    add(child: Element) {
      this.childs.push(child);
    }

    prefixes():string[] {
      let prefixes: string[] = [];
      if (this.childs && this.childs.length > 0) {
        for (let i = 0; i < this.childs.length; i++) {
          if ((this.childs[i].nsprefix ?? '').trim().length > 0 && !prefixes.some(p => p == this.childs[i].nsprefix)) prefixes.push(this.childs[i].nsprefix ?? '');
          if (this.childs[i] instanceof CompoundElement) (this.childs[i] as CompoundElement).prefixes().forEach(p => {
            if (!prefixes.some(p0 => p0 == p)) prefixes.push(p);
          });
        }
      }
      return prefixes;
    }

    override serialize(indent: boolean = false, level: number = 0): string {
      let name = ((this.nsprefix ?? '').trim().length > 0 ? this.nsprefix + ':' : '') + this.name;
      let result: string = (indent ? ' '.repeat(level * SPACES_INDENT) : '') + '<' + name;
      for (let key in this.namespaces) {
        let nskey = ':' + key;
        if (this.namespaces[key].defaultns) {
          nskey = "";
        }
        result += ` xmlns${nskey}="${this.namespaces[key].uri}"`;
      }
      for (let i = 0; i < this.attributes.length; i++) {
        result += ` ${this.attributes[i].name}="${this.attributes[i].value}"`;
      }
      if (this.childs.length == 0) {
        result += '/>' + (indent ? '\n' : '');
      } else {
        result += '>' + (indent ? '\n' : '');
        for (let i = 0; i < this.childs.length; i++) {
          result += this.childs[i].serialize(indent, level + 1) + (indent ? '\n' : '');
        }
        result += (indent ? ' '.repeat(level * SPACES_INDENT) : '') + '</' + name + '>';
      }
      return result;
    }
  }

  export class SimpleElement extends Element {
    content: string;
    constructor(name?: string, content?: string) {
      super(name);
      this.content = content ?? '';
    }

    override serialize(indent: boolean = false, level: number = 0): string {
      let name = ((this.nsprefix ?? '').trim().length > 0 ? this.nsprefix + ':' : '') + this.name;
      let result: string = (indent ? ' '.repeat(level * SPACES_INDENT) : '') + '<' + name;
      for (let key in this.namespaces) {
        let nskey = ':' + key;
        if (this.namespaces[key].defaultns) {
          nskey = "";
        }
        result += ` xmlns${nskey}="${this.namespaces[key].uri}"`;
      }
      for (let i = 0; i < this.attributes.length; i++) {
        result += ` ${this.attributes[i].name}="${this.attributes[i].value}"`;
      }
      if ((this.content ?? '').trim().length == 0) {
        result += '/>';
      } else {
        result += '>' + this.content + '</' + name + '>';
      }
      return result;
    }
  }
  export class CDATA extends SimpleElement {
    constructor(name?: string, content?: string) {
      super(name, `<![CDATA[${content}]]>`);
    }
  }
  export class altitude extends SimpleElement { }
  export class altitudeMode extends SimpleElement {
    constructor(altitude_mode: string) {
      super(undefined, altitude_mode);
    }
  }
  export class BalloonStyle extends CompoundElement { }
  export class begin extends SimpleElement { }
  export class bgColor extends SimpleElement { }
  export class Camera extends CompoundElement { }
  export class color extends SimpleElement {
    constructor(rgba: RGBA | string) {
      if (rgba instanceof RGBA) {
        super(undefined, rgba.toHexString());
      } else {
        super(undefined, rgba);
      }
    }
  }
  export class coordinates extends SimpleElement {
    //TODO
  }
  export class Data extends CompoundElement {
    constructor(name: string, value: string | number) {
      super([new SimpleElement('value', value.toString())]);
      this.add_attr('name', name);
    }
  }

  export class description extends SimpleElement { }
  export class Document extends CompoundElement { }
  export class end extends SimpleElement { }
  export class ExtendedData extends CompoundElement {
    constructor(dict: Record<string, string | number>) {
      super([]);
      for (let prop in dict) this.add(new Data(prop, dict[prop]));
    }
  }
  export class extrude extends SimpleElement { }
  export class Folder extends CompoundElement {
    constructor(name?: string, style_url: string | null = null, childs: Element[] | null = null, isopen: boolean | null = null, isvisible: boolean | null = null) {
      childs = childs ?? [];
      if (isopen != null) {
        childs.unshift(new open(isopen));
      }
      if (isvisible != null) {
        childs.unshift(new visibility(isvisible));
      }
      if (name != null) {
        childs.unshift(new SimpleElement('name', name));
      }
      if (style_url != null) {
        childs.push(new styleUrl(style_url));
      }
      super(childs);
    }
  }
  export class heading extends SimpleElement { }
  export class href extends SimpleElement { }

  export class Icon extends CompoundElement {
    static palette(pal: number, icon: number, extra: string = ''): Icon {
      return new Icon([new SimpleElement('href', `http://maps.google.com/mapfiles/kml/pal${pal}/icon${icon}${extra}.png`)]);
    }
  }

  export class IconStyle extends CompoundElement { }

  export class KML extends CompoundElement {
    constructor(version: number, child: Element) {
      super([child]);
      this.name = "kml";
      this.add_ns(null, "http://earth.google.com/kml/" + version.toString());
      this.add_ns('gx', "http://www.google.com/kml/ext/" + version.toString());
    }
    override serialize(indent: boolean = false, level: number = 0): string {
      // suppression des namespaces inutilisés
      let usedprefixes = this.prefixes();
      for (let key in this.namespaces) {
        if (!this.namespaces[key].name) continue;
        if (!usedprefixes.includes(this.namespaces[key].name)) delete this.namespaces[key];
      }
      return '<?xml version="1.0" encoding="UTF-8"?>\n' + super.serialize(indent, level);
    }
  }

  export class LabelStyle extends CompoundElement { }
  export class latitude extends SimpleElement { }
  export class LineString extends CompoundElement {
    constructor(coordinates: Coord[], altitude_mode: string) {
      super();
      this.add(new altitudeMode(altitude_mode));
      let coords = coordinates.map(c => `${c.lon_deg},${c.lat_deg},${c.ele}`).join(' ');
      this.add(new SimpleElement('coordinates', coords));
    }
  }
  export class LineStyle extends CompoundElement {
    constructor(color: string, width: string) {
      super([new SimpleElement('color', color), new SimpleElement('width', width.toString())]);
    }
  }
  export class ListStyle extends CompoundElement {
    constructor(listItemType: string) {
      super([new SimpleElement('listItemType', listItemType)]);
    }
  }
  export class listItemType extends SimpleElement { }
  export class longitude extends SimpleElement { }
  export class MultiGeometry extends CompoundElement { }
  export class open extends SimpleElement {
    constructor(isopen: boolean) {
      super('open', isopen ? '1' : '0');
    }
  }
  export class overlayXY extends SimpleElement {
    constructor(x: number, xunits: string, y: number, yunits: string) {
      super();
      this.add_attr('x', x.toString());
      this.add_attr('y', y.toString());
      this.add_attr('xunits', xunits);
      this.add_attr('yunits', yunits);
    }
  }
  export class Placemark extends CompoundElement {
    constructor(name: string | null = null, point: Point | LineString | null = null, childs: Element[] | null = null, style_url: string | null = null, isopen: boolean | null = null, isvisible: boolean | null = null) {
      childs = childs ?? [];
      if (isopen != null) {
        childs.unshift(new open(isopen));
      }
      if (isvisible != null) {
        childs.unshift(new visibility(isvisible));
      }
      if (point) {
        childs.unshift(point);
      }
      if (style_url) {
        childs.unshift(new styleUrl(style_url));
      }
      if (name) {
        childs.unshift(new SimpleElement('name', name));
      }
      super(childs);
    }
  }
  export class Point extends CompoundElement {
    constructor(coordinates: Coord, altitude_mode: string) {
      super();
      this.add(new altitudeMode(altitude_mode));
      let coords = `${coordinates.lon_deg},${coordinates.lat_deg},${coordinates.ele}`;
      this.add(new SimpleElement('coordinates', coords));
    }
  }
  export class PolyStyle extends CompoundElement { }
  export class roll extends SimpleElement { }
  export class scale extends SimpleElement {
    constructor(content?: string) {
      super(undefined, content);
    }
  }
  export class ScreenOverlay extends CompoundElement { }
  export class screenXY extends overlayXY { }
  export class size extends overlayXY { }
  export class Snippet extends SimpleElement {
    constructor(text?: string) {
      super(undefined, text);
    }
  }
  export class Style extends CompoundElement { }

  export class styleUrl extends SimpleElement {
    constructor(text: string) {
      super(undefined, text);
    }
  }
  export class tessellate extends SimpleElement { }
  export class text extends SimpleElement { }
  export class tilt extends SimpleElement { }
  export class TimeSpan extends CompoundElement {
    constructor(begin: Date|null, end?: Date|null) {
      super();
      if (begin != null) {
        this.add(new SimpleElement("begin", begin.toISOString()));
      }
      if (end != null) {
        this.add(new SimpleElement("end", end.toISOString()));
      }
    }
  }
  export class value extends SimpleElement { }
  export class visibility extends SimpleElement {
    constructor(visibility: boolean) {
      super(undefined, visibility ? '1' : '0');
    }
  }
  export class when extends SimpleElement { }
  export class width extends SimpleElement { }

  export class Tour extends CompoundElement {
    playlist: Playlist;
    constructor(name: string | null = null, initialwait:number = 0) {
      super();
      this.nsprefix = 'gx';
      if (name != null) {
        this.add(new SimpleElement('name', name));
      }
      this.playlist = new Playlist(initialwait);
      this.add(this.playlist);
    }

    add_update(targetId: string, wait: number = 0.02) {
      this.playlist.add_update(targetId, wait);
    }
  }
  export class Playlist extends CompoundElement {
    constructor(wait:number = 0) {
      super();
      this.nsprefix = 'gx';
      if (wait > 0) {
        this.add(new Wait(wait));
      }
    }

    add_update(targetId: string, wait: number = 0.02) {
      this.add(new AnimatedUpdate(targetId));
      this.add(new Wait(wait));
    }
  }
  export class Wait extends CompoundElement {
    constructor(wait: number) {
      super([new duration(wait)]);
      this.nsprefix = 'gx';
    }
  }
  export class duration extends SimpleElement {
    constructor(duration: number) {
      super(undefined, duration.toString());
      this.nsprefix = 'gx';
    }
  }
  export class AnimatedUpdate extends CompoundElement {
    constructor(targetId: string) {
      super([new Update(targetId)]);
      this.nsprefix = 'gx';
    }
  }
  export class Update extends CompoundElement {
    constructor(targetId: string) {
      super([new Change(targetId)]);
    }
  }
  export class Change extends CompoundElement {
    constructor(targetId: string) {
      let placemark = new Placemark(null, null, null, null, null, true);
      placemark.add_attr('targetId', targetId);
      super([placemark]);
    }
  }
}
