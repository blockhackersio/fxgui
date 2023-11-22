// import { esbuildPluginFilePathExtensions } from "esbuild-plugin-file-path-extensions";

export function modernConfig(opts) {
  return {
    entry: opts.entry,
    format: ["cjs", "esm"],
    target: ["chrome91", "firefox90", "edge91", "safari15", "ios15", "opera77"],
    outDir: "build/modern",
    dts: true,
    sourcemap: true,
    // clean: true,
    // esbuildPlugins: [esbuildPluginFilePathExtensions({ esmExtension: "js" })],
  };
}
