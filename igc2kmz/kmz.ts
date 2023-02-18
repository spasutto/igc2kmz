
import * as JSZip from 'jszip';
import { saveAs } from 'file-saver';

export class KMZ {
  getKMZ(): JSZip {
    const j: JSZip = new (<any>JSZip).default();

    j.file('Hello.txt', 'Hello World\n');

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