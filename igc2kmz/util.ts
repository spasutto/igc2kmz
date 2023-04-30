
const SEALEVEL_QNH: number = 101325;

export class Bounds {
  min: any;
  max: any;

  constructor(value: Bounds | any[] | any) {
    if (value instanceof Bounds) {
      this.min = value.min;
      this.max = value.max;
    } else if (value instanceof Array) {
      if (value.length == 2) {
        this.min = value[0];
        this.max = value[1];
      } else {
        this.min = value[0];
        this.max = value[0];
        for (let i = 0; i < value.length; i++) {
          if (value[i] < this.min)
            this.min = value[i];
          if (value[i] > this.max)
            this.max = value[i];
        }
      }
    } else {
      this.min = value;
      this.max = value;
    }
  }

  static createbounds(value: any[] | any): Bounds | null {
    if (value instanceof Array && value.length == 0) {
      return null;
    } else if (value == null) {
      return null;
    }
    return new Bounds(value);
  }

  update(value: Bounds | any) {
    if (value instanceof Bounds) {
      if (value.min < this.min)
        this.min = value.min;
      if (value.max > this.max)
        this.max = value.max;
    } else {
      if (value < this.min)
        this.min = value;
      if (value > this.max)
        this.max = value;
    }
  }

  tuple(): [any, any] {
    return [this.min, this.max];
  }
}

export type BoundSet = Record<string, Bounds | null>;

export function bsupdate(bs: BoundSet, other: BoundSet) {
  for (let key in other) {
    if (bs.hasOwnProperty(key)) {
      bs[key]?.update(other[key]);
    } else {
      bs[key] = new Bounds(other[key]);
    }
  }
}

export function round(n: number, digits: number = 0) {
  digits = digits ? digits * 10 : 1;
  return Math.round(n * digits) / digits;
}

export function add_seconds(dt: Date, seconds: number) {
  return new Date(dt.getTime() + seconds * 1000);
}

//export type OpenStruct = Record<string, any | null>;
export type OpenStruct<T> = Record<string, T | null>;

export interface Slice {
  start: number;
  stop: number;
}

export class Utils {
  static incr_douglas_peucker(x: number[], y: number[], epsilon: number, max_indexes: number = Number.MAX_SAFE_INTEGER) {
    let indexes = [0];
    let queue = [[0, x.length - 1]];
    let i = 0, left = 0, right = 0, kx = 0, ky = 0, c = 0, pivot = 0, max_dist = 0, dist = 0;
    while (i < queue.length) {
      left = queue[i][0];
      right = queue[i][1];
      i++;
      indexes.push(right);
      if (indexes.length == max_indexes) break;
      kx = y[left] - y[right];
      ky = x[right] - x[left];
      c = x[left] * y[right] - x[right] * y[left];
      pivot = left + 1;
      max_dist = Math.abs(kx * x[pivot] + ky * y[pivot] + c);
      for (let j = left + 2; j < right; j++) {
        dist = Math.abs(kx * x[j] + ky * y[j] + c);
        if (dist > max_dist) {
          max_dist = dist;
          pivot = j;
        }
      }
      max_dist /= Math.sqrt(Math.pow(x[right] - x[left], 2) + Math.pow(y[right] - y[left], 2));
      if (max_dist > epsilon) {
        indexes.push(pivot);
        if (indexes.length == max_indexes) break;
        queue.push([left, pivot]);
        queue.push([pivot, right]);
      }
    }
    return indexes.sort(function (a, b) { return a - b; });
  }

  static find_first_ge(seq: number[], value: number): number | null {
    let left = 0;
    let right = seq.length;
    while (left < right) {
      let middle = Math.trunc((left + right) / 2);
      let direction = value - seq[middle];
      if (direction <= 0) {
        right = middle;
      } else {
        left = middle + 1;
      }
    }
    if (left == seq.length) {
      return null;
    } else {
      return right; //Math.min(seq.length - 1, right); // TOFIX
    }
  }

  static runs<T>(seq: T[]): Slice[] {
    let indexes: Slice[] = [];
    let start = 0, index = 0;
    let current: T = seq[0];
    let element: T;
    for (index = 0; index < seq.length; index++) {
      element = seq[index];
      if (element != current) {
        indexes.push({ start: start, stop: index });
        start = index;
        current = element;
      }
    }
    indexes.push({ start: start, stop: index });
    return indexes;
  }

  static runs_where<T>(seq: T[]): Slice[] {
    let indexes: Slice[] = [];
    let start = 0, index = 0;
    let current: T = seq[0];
    let element: T;
    for (index = 0; index < seq.length; index++) {
      element = seq[index];
      if (element != current) {
        if (current) {
          indexes.push({ start: start, stop: index });
        }
        start = index;
        current = element;
      }
    }
    if (current) {
      indexes.push({ start: start, stop: index });
    }
    return indexes;
  }

  static condense<T>(ranges: Slice[], t: number[], delta: number): Slice[] {
    let indexes: Slice[] = [];
    if (ranges.length > 0) {
      let sl = ranges[0];
      let start = sl.start;
      let stop = sl.stop;
      for (let i = 0; i < ranges.length; i++) {
        sl = ranges[i];
        if (t[sl.start] - t[stop] < delta) {
          stop = sl.stop;
        }
        else {
          indexes.push({ start, stop });
          start = sl.start;
          stop = sl.stop;
        }
      }
      indexes.push({ start, stop });
    }
    return indexes;
  }

  // calculate altitude from given pressure and pressure at sea level
  static getAltitude(pressure: number, seaLevelPressure: number=SEALEVEL_QNH) { return 44330.0 * (1.0 - Math.pow(pressure / seaLevelPressure, 0.1902949)); }
  // Calculate sea level from Pressure given on specific altitude
  static getSeaLevel(pressure: number, altitude: number) { return pressure / Math.pow(1.0 - (altitude / 44330.0), 5.255); }

  static hashcode(value: string): number {
    for (var i = 0, h = 0; i < value.length; i++)
      h = Math.imul(31, h) + value.charCodeAt(i) | 0;
    return h;
  }

  static datediffsecs(dt1:Date, dt2:Date):number {
    if (dt1 > dt2) {
      return (dt1.getTime() - dt2.getTime()) / 1000;
    } else {
      return (dt1.getTime() + 86400000 - dt2.getTime()) / 1000;
    }
  }

  static salient2(seq: number[], epsilons: number[]): number[] {
    let result: number[] = [];
    let helper = (start: number, stop: number) => {
      if (stop - start < 2) return;
      let delta = 0;
      let left = start, right = stop;
      if (seq[start] <= seq[stop]) {
        let max_index = start;
        for (let i = start + 1; i < stop; i++) {
          if (seq[i] > seq[max_index]) {
            max_index = i;
          } else if (seq[max_index] - seq[i] > delta) {
            left = max_index;
            right = i;
            delta = seq[max_index] - seq[i];
          }
        }
      }
      if (seq[start] >= seq[stop]) {
        let min_index = start;
        for (let i = start + 1; i < stop; i++) {
          if (seq[i] < seq[min_index]) {
            min_index = i;
          } else if (seq[i] - seq[min_index] > delta) {
            left = min_index;
            right = i;
            delta = seq[i] - seq[min_index];
          }
        }
      }
      if (delta >= epsilons[epsilons.length - 1] && (left != start || right != stop)) {
        for (let i = 0, epsilon = epsilons[0]; i < epsilons.length; i++, epsilon = epsilons[i]) {
          if (delta < epsilon) continue;
          if (!result.hasOwnProperty(left) || result[left] > i) {
            result[left] = i;
          }
          if (!result.hasOwnProperty(right) || result[right] > i) {
            result[right] = i;
          }
        }
        helper(start, left);
        helper(left, right);
        helper(right, stop);
      }
    }

    if (seq.length > 0) {
      result[0] = 0;
      result[seq.length - 1] = 0
      helper(0, seq.length - 1);
    }
    return result;
  }

  static seconds_to_date(sec: number) {
    return new Date(sec * 1000);
  }

  static datetime_floor(dt: Date, delta: number): Date {
    dt = new Date(dt.getTime());
    if (delta >= 3600) {
      dt.setMinutes(0);
      dt.setSeconds(0);
      return new Date(dt.getTime() - (3600000 * (dt.getHours() % Math.trunc(delta / 3600))));
    } else if (delta >= 60) {
      dt.setSeconds(0);
      return new Date(dt.getTime() - (60000 * (dt.getMinutes() % Math.trunc(delta / 60))));
    } else if (delta >= 1) {
      return new Date(dt.getTime() - (1000 * (dt.getSeconds() % Math.trunc(delta))));
    }
    return dt;
  }

  static make_table(rows: string[][], bgcolors: string[] = ['#dddddd', '#ffffff']): string {
    let result = '<table cellpadding="1" cellspacing="1">';
    rows.forEach((row, i) => {
      result += `<tr bgcolor="${bgcolors[i % 2]}"><th align="right">${row[0]}</th><td>${row[1]}</td></tr>`;
    });
    result += '</table>';
    return result;
  }

  static capitalizeFirstLetter(str: string | null | undefined): string {
    str = str ?? '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static roundToFloor(numToRound: number, numToRoundTo: number) {
    return Math.floor(numToRound / numToRoundTo) * numToRoundTo;
  }

  static roundToCeil(numToRound: number, numToRoundTo: number) {
    return Math.ceil(numToRound / numToRoundTo) * numToRoundTo;
  }
}

export class RandomIdGenerator {
  protected static ids: string[] = [];
  protected static len: number = 1;
  protected static readonly characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  protected static factorials: number[] = [1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600, 6227020800, 87178291200, 1307674368000, 20922789888000, 355687428096000, 6402373705728000, 121645100408832000, 2432902008176640000, 51090942171709440000, 1124000727777607680000, 25852016738884976640000, 620448401733239439360000, 15511210043330985984000000, 403291461126605635584000000, 10888869450418352160768000000, 304888344611713860501504000000, 8841761993739701954543616000000, 265252859812191058636308480000000, 8222838654177922817725562880000000, 263130836933693530167218012160000000, 8683317618811886495518194401280000000, 295232799039604140847618609643520000000, 10333147966386144929666651337523200000000, 371993326789901217467999448150835200000000, 13763753091226345046315979581580902400000000, 523022617466601111760007224100074291200000000, 20397882081197443358640281739902897356800000000, 815915283247897734345611269596115894272000000000, 33452526613163807108170062053440751665152000000000, 1405006117752879898543142606244511569936384000000000, 60415263063373835637355132068513997507264512000000000, 2658271574788448768043625811014615890319638528000000000, 119622220865480194561963161495657715064383733760000000000, 5502622159812088949850305428800254892961651752960000000000, 258623241511168180642964355153611979969197632389120000000000, 12413915592536072670862289047373375038521486354677760000000000, 608281864034267560872252163321295376887552831379210240000000000, 30414093201713378043612608166064768844377641568960512000000000000, 1551118753287382280224243016469303211063259720016986112000000000000, 80658175170943878571660636856403766975289505440883277824000000000000, 4274883284060025564298013753389399649690343788366813724672000000000000, 230843697339241380472092742683027581083278564571807941132288000000000000, 12696403353658275925965100847566516959580321051449436762275840000000000000, 710998587804863451854045647463724949736497978881168458687447040000000000000, 40526919504877216755680601905432322134980384796226602145184481280000000000000, 2350561331282878571829474910515074683828862318181142924420699914240000000000000, 138683118545689835737939019720389406345902876772687432540821294940160000000000000, 8320987112741390144276341183223364380754172606361245952449277696409600000000000000, 507580213877224798800856812176625227226004528988036003099405939480985600000000000000, 31469973260387937525653122354950764088012280797258232192163168247821107200000000000000, 1982608315404440064116146708361898137544773690227268628106279599612729753600000000000000, 126886932185884164103433389335161480802865516174545192198801894375214704230400000000000000, 8247650592082470666723170306785496252186258551345437492922123134388955774976000000000000000, 544344939077443064003729240247842752644293064388798874532860126869671081148416000000000000000, 36471110918188685288249859096605464427167635314049524593701628500267962436943872000000000000000, 2480035542436830599600990418569171581047399201355367672371710738018221445712183296000000000000000, 171122452428141311372468338881272839092270544893520369393648040923257279754140647424000000000000000, 11978571669969891796072783721689098736458938142546425857555362864628009582789845319680000000000000000, 850478588567862317521167644239926010288584608120796235886430763388588680378079017697280000000000000000, 61234458376886086861524070385274672740778091784697328983823014963978384987221689274204160000000000000000, 4470115461512684340891257138125051110076800700282905015819080092370422104067183317016903680000000000000000, 330788544151938641225953028221253782145683251820934971170611926835411235700971565459250872320000000000000000, 24809140811395398091946477116594033660926243886570122837795894512655842677572867409443815424000000000000000000, 1885494701666050254987932260861146558230394535379329335672487982961844043495537923117729972224000000000000000000, 145183092028285869634070784086308284983740379224208358846781574688061991349156420080065207861248000000000000000000, 11324281178206297831457521158732046228731749579488251990048962825668835325234200766245086213177344000000000000000000, 894618213078297528685144171539831652069808216779571907213868063227837990693501860533361810841010176000000000000000000, 71569457046263802294811533723186532165584657342365752577109445058227039255480148842668944867280814080000000000000000000, 5797126020747367985879734231578109105412357244731625958745865049716390179693892056256184534249745940480000000000000000000, 475364333701284174842138206989404946643813294067993328617160934076743994734899148613007131808479167119360000000000000000000, 39455239697206586511897471180120610571436503407643446275224357528369751562996629334879591940103770870906880000000000000000000, 3314240134565353266999387579130131288000666286242049487118846032383059131291716864129885722968716753156177920000000000000000000, 281710411438055027694947944226061159480056634330574206405101912752560026159795933451040286452340924018275123200000000000000000000, 24227095383672732381765523203441259715284870552429381750838764496720162249742450276789464634901319465571660595200000000000000000000, 2107757298379527717213600518699389595229783738061356212322972511214654115727593174080683423236414793504734471782400000000000000000000, 185482642257398439114796845645546284380220968949399346684421580986889562184028199319100141244804501828416633516851200000000000000000000, 16507955160908461081216919262453619309839666236496541854913520707833171034378509739399912570787600662729080382999756800000000000000000000, 1485715964481761497309522733620825737885569961284688766942216863704985393094065876545992131370884059645617234469978112000000000000000000000, 135200152767840296255166568759495142147586866476906677791741734597153670771559994765685283954750449427751168336768008192000000000000000000000, 12438414054641307255475324325873553077577991715875414356840239582938137710983519518443046123837041347353107486982656753664000000000000000000000, 1156772507081641574759205162306240436214753229576413535186142281213246807121467315215203289516844845303838996289387078090752000000000000000000000, 108736615665674308027365285256786601004186803580182872307497374434045199869417927630229109214583415458560865651202385340530688000000000000000000000, 10329978488239059262599702099394727095397746340117372869212250571234293987594703124871765375385424468563282236864226607350415360000000000000000000000, 991677934870949689209571401541893801158183648651267795444376054838492222809091499987689476037000748982075094738965754305639874560000000000000000000000, 96192759682482119853328425949563698712343813919172976158104477319333745612481875498805879175589072651261284189679678167647067832320000000000000000000000, 9426890448883247745626185743057242473809693764078951663494238777294707070023223798882976159207729119823605850588608460429412647567360000000000000000000000, 933262154439441526816992388562667004907159682643816214685929638952175999932299156089414639761565182862536979208272237582511852109168640000000000000000000000, 93326215443944152681699238856266700490715968264381621468592963895217599993229915608941463976156518286253697920827223758251185210916864000000000000000000000000];
  protected static readonly maxretry: number = 20;
  protected static id(length: number) {
    let result = '';
    const charactersLength = this.characters.length;
    let counter = 0;
    while (counter < length) {
      result += this.characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }

  protected static factorial(n: number): number {
    if (n == 0 || n == 1)
      return 1;
    if (this.factorials[n] > 0)
      return this.factorials[n];
    return this.factorials[n] = this.factorial(n - 1) * n;
  }

  protected static combinaisons(): number {
    const n = this.characters.length;
    return this.factorial(n + this.len - 1) / (this.factorial(this.len) * this.factorial(n - 1));
  }

  static reset(len?: number) {
    this.len = (typeof len === 'number' && len > 0) ? len : 1;
    this.ids = [];
  }

  static makeid(len?: number): string {
    if (typeof len === 'number' && len > 0) {
      this.len = len;
    }
    let id: string;
    while (this.combinaisons() <= this.ids.length) this.len++;
    let counter: number = 0;
    do {
      id = this.id(this.len);
      counter++;
    } while (counter < this.maxretry && this.ids.some(_ => _ == id));
    // au bout de maxretry tentatives on abandonne et on incrémente la longueur
    if (counter == this.maxretry) {
      this.len++;
      return this.makeid();
    }
    this.ids.push(id);

    return '_' + id; // les attributs ID XML ne doivent pas commencer par un digit
  }
}
