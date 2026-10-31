// A new version is downloaded: a toast with "Restart" that installs it (main re-sends it on
// every update check, so an ignored one comes back; it also installs when the app quits).
(() => {
  bridge.onUpdate((u) => {
    showToast('update', `Update ready · ${u.version}`, 'Restart', 0, 20000);
    state.toastAction = () => bridge.installUpdate();
  });
})();
