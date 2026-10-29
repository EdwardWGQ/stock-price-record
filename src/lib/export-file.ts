declare global {
  interface Window {
    equityDesktop?: { saveExport: (data: string) => Promise<{ saved: boolean }> };
  }
}
export async function saveExportFile(data: unknown): Promise<boolean> {
  const json = JSON.stringify(data, null, 2);
  if (window.equityDesktop) {
    return (await window.equityDesktop.saveExport(json)).saved;
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'us-equity-monitor.json';
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
