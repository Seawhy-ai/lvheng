import { fcitxReady } from "./Fcitx5.js";
const readyPromise = fcitxReady;
let rimeLoaded = false;
function respond(data, transfer) {
  globalThis.postMessage(data, transfer || []);
}
const copyDir = globalThis.fcitx.traverseAsync(
  (path) => respond({ type: "MKDIR", data: path }),
  (path) => {
    const { buffer } = globalThis.fcitx.Module.FS.readFile(path);
    respond({ type: "WRITE_FILE", data: {
      path,
      buffer
    } }, [buffer]);
  },
  void 0
);
globalThis.onmessage = async ({ data }) => {
  await readyPromise;
  switch (data.type) {
    case "MKDIR":
      globalThis.fcitx.Module.FS.mkdirTree(data.data);
      break;
    case "WRITE_FILE":
      globalThis.fcitx.Module.FS.mkdirTree(data.data.path.slice(0, data.data.path.lastIndexOf("/")));
      globalThis.fcitx.Module.FS.writeFile(data.data.path, new Uint8Array(data.data.buffer));
      break;
    case "DEPLOY":
      if (!rimeLoaded) {
        globalThis.fcitx.setNotificationCallback((name, icon, body, timeout, tipId) => {
          respond({ type: "NOTIFY", data: { name, icon, body, timeout, tipId } });
        });
        globalThis.fcitx.enable();
        rimeLoaded = true;
      }
      globalThis.fcitx.setConfig("fcitx://config/addon/rime/deploy", {});
      await copyDir("/home/web_user/.local/share/fcitx5/rime/build");
      globalThis.fcitx.rmR("/usr/share/rime-data");
      globalThis.fcitx.rmR("/home/web_user/.local");
      break;
    case "ZIP": {
      const buffer = await globalThis.fcitx.zip(data.data);
      respond({ type: "ZIP_BUFFER", data: buffer }, [buffer]);
      break;
    }
  }
  respond({ type: "DONE" });
};
